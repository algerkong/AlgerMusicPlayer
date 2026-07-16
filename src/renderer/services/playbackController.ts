/**
 * 播放控制器
 *
 * 核心播放流程管理，使用 generation-based 取消模式替代原 playerCore.ts 中的控制流。
 * 每次 playTrack() 调用递增 generation，所有异步操作在 await 后检查 generation 是否过期。
 *
 * 导出：playTrack, seamlessSwitchQuality, initializePlayState, setupUrlExpiredHandler, getCurrentGeneration
 */

import { createDiscreteApi } from 'naive-ui';

import i18n from '@/../i18n/renderer';
import { canReuseSongUrl, getSongDetail, loadLrc } from '@/hooks/usePlayerHooks';
import { audioService } from '@/services/audioService';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';
import { restorePreviewStreamFlags } from '@/utils/previewStream';
import { ttfaBegin, ttfaMark } from '@/utils/ttfaMetrics';

const { message } = createDiscreteApi(['message']);

// 代次计数，用于取消过期请求
let generation = 0;

/**
 * 获取当前 generation（用于外部检查）
 */
export const getCurrentGeneration = (): number => generation;

// ==================== 懒加载 Store（避免循环依赖） ====================
// Promise 缓存：首播不要每次 playTrack 都重新 import

let playerCoreStoreP: Promise<typeof import('@/store/modules/playerCore')> | null = null;
let playlistStoreP: Promise<typeof import('@/store/modules/playlist')> | null = null;
let playHistoryStoreP: Promise<typeof import('@/store/modules/playHistory')> | null = null;
let settingsStoreP: Promise<typeof import('@/store/modules/settings')> | null = null;

const getPlayerCoreStore = async () => {
  if (!playerCoreStoreP) playerCoreStoreP = import('@/store/modules/playerCore');
  return (await playerCoreStoreP).usePlayerCoreStore();
};

const getPlaylistStore = async () => {
  if (!playlistStoreP) playlistStoreP = import('@/store/modules/playlist');
  return (await playlistStoreP).usePlaylistStore();
};

const getPlayHistoryStore = async () => {
  if (!playHistoryStoreP) playHistoryStoreP = import('@/store/modules/playHistory');
  return (await playHistoryStoreP).usePlayHistoryStore();
};

const getSettingsStore = async () => {
  if (!settingsStoreP) settingsStoreP = import('@/store/modules/settings');
  return (await settingsStoreP).useSettingsStore();
};

// ==================== 内部辅助函数 ====================

/**
 * 加载元数据（歌词 + 背景色），并行执行。
 * 已有缓存直接命中，避免切歌时重复取色/拉歌词拖慢首帧。
 */
const loadMetadata = async (
  music: SongResult
): Promise<{
  lyrics: SongResult['lyric'];
  backgroundColor: string;
  primaryColor: string;
}> => {
  const hasLyric = !!(
    music.lyric &&
    music.lyric.lrcTimeArray &&
    music.lyric.lrcTimeArray.length > 0
  );
  // 颜色：仅当已有色且带 pic 时仍重取一遍更稳；无 pic 才用现成色。
  // （曾用 hasColor 短路：发现页 hold 上一首色会被当成真色，resolve 后冲掉正确取色）
  const pic = music?.picUrl;

  const [lyrics, colors] = await Promise.all([
    hasLyric ? Promise.resolve(music.lyric) : loadLrc(music.id).catch(() => music.lyric),
    pic
      ? getImageLinearBackground(getImgUrl(pic, '200y200')).catch(() => ({
          backgroundColor: music.backgroundColor || '',
          primaryColor: music.primaryColor || ''
        }))
      : Promise.resolve({
          backgroundColor: music.backgroundColor || '',
          primaryColor: music.primaryColor || ''
        })
  ]);

  return {
    lyrics,
    backgroundColor: colors.backgroundColor,
    primaryColor: colors.primaryColor
  };
};

const loadAndPlayAudio = async (song: SongResult, shouldPlay: boolean): Promise<boolean> => {
  if (!song.playMusicUrl) {
    throw new Error('歌曲没有播放URL');
  }

  // 同步读进度，避免动态 import 挡出声（与 persistenceService playProgress schema 对齐）
  let initialPosition = 0;
  try {
    const raw = localStorage.getItem('playProgress');
    if (raw) {
      const parsed = JSON.parse(raw) as {
        v?: number;
        data?: { songId?: unknown; progress?: number };
      } & {
        songId?: unknown;
        progress?: number;
      };
      const data = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
      if (data && String(data.songId) === String(song.id) && typeof data.progress === 'number') {
        initialPosition = data.progress;
      }
    }
  } catch {
    initialPosition = 0;
  }

  // 直接通过 audioService 播放（单一 audio 元素，换 src 即可）
  console.log(`[playbackController] 开始播放: ${song.name}`);
  await audioService.play(song.playMusicUrl, song, shouldPlay, initialPosition || 0);

  // 发布音频就绪事件
  window.dispatchEvent(
    new CustomEvent('audio-ready', {
      detail: { sound: audioService.getCurrentSound(), shouldPlay }
    })
  );

  return true;
};

/**
 * 触发预加载下一首/下下首歌曲（立即触发）
 */
const triggerPreload = async (song: SongResult): Promise<void> => {
  try {
    const playlistStore = await getPlaylistStore();
    const list = playlistStore.playList;
    if (Array.isArray(list) && list.length > 0) {
      // 雪花 id 可能是 string/number 混用，必须 String 比较
      const idx = list.findIndex((item: SongResult) => String(item.id) === String(song.id));
      if (idx !== -1) {
        // 列表 resolve 预热（含 getSongDetail + standby）
        playlistStore.preloadNextSongs(idx);

        // P1：下一首已有 URL 时立刻灌 standby（不必等 debounce 200ms）
        const nextIdx = (idx + 1) % list.length;
        const next = list[nextIdx];
        if (
          next &&
          String(next.id) !== String(song.id) &&
          next.playMusicUrl &&
          !(next.expiredAt != null && next.expiredAt < Date.now())
        ) {
          audioService.preload(next.playMusicUrl, next);
        }
      } else {
        console.warn('[triggerPreload] 当前曲不在 playList，跳过预热 id=', song.id);
      }
    }
  } catch (e) {
    console.warn('预加载触发失败（可能是依赖未加载或循环依赖），已忽略:', e);
  }
};

const updateDocumentTitle = (music: SongResult): void => {
  let title = music.name;
  const artists = music.ar || music.song?.artists;
  if (artists?.length) {
    title += ` - ${artists.map((a: any) => a.name).join('/')}`;
  }
  document.title = 'LYMusic - ' + title;
};

/** 用户手选音质 / 后台升质：可取消的代数（切歌或再次改档时作废） */
let qualitySwitchGen = 0;

/** 仅当「正在出声的曲」就是 songId 时才取进度；否则 0（防切歌后把上一首 45s 写到下一首） */
const getSeekSecondsForSong = (songId: string | number): number => {
  try {
    const track = audioService.getCurrentTrack();
    if (!track || String(track.id) !== String(songId)) return 0;
    const sound = audioService.getCurrentSound();
    if (!sound || !Number.isFinite(sound.currentTime)) return 0;
    return Math.max(0, sound.currentTime);
  } catch {
    return 0;
  }
};

const isQualitySwitchStale = (
  switchGen: number,
  playGenAtStart: number,
  songId: string,
  playerCore: { playMusic?: { id?: string | number } }
) => {
  if (switchGen !== qualitySwitchGen) return true;
  if (playGenAtStart !== generation) return true;
  if (String(playerCore.playMusic?.id ?? '') !== songId) return true;
  return false;
};

/**
 * 无感换档：当前流继续播，后台 resolve 目标档，就绪后 seek 接上。
 * 不置 playLoading、不走 playTrack，避免「切无损要等很久」。
 */
export const seamlessSwitchQuality = async (
  targetQuality: string,
  opts?: { songId?: string | number; playGen?: number }
): Promise<boolean> => {
  const switchGen = ++qualitySwitchGen;
  const playGenAtStart = opts?.playGen ?? generation;

  const playerCore = await getPlayerCoreStore();
  const song = playerCore.playMusic as SongResult | undefined;
  if (!song?.id) return false;
  if (opts?.songId != null && String(opts.songId) !== String(song.id)) return false;

  const { normalizeQualityKey, clampQualityToAvailable, getSongDetail } =
    await import('@/hooks/usePlayerHooks');
  const stream = normalizeQualityKey(song.streamQuality);
  const target = clampQualityToAvailable(targetQuality, song.availableQualities);
  if (!target || target === stream) {
    delete (playerCore.playMusic as any)._streamUpgradeTo;
    return true;
  }

  const songId = String(song.id);
  console.info(
    `[playbackController] seamless quality ${song.name}: ${stream || '-'} → ${target} (bg)`
  );

  try {
    // 1) 当前曲不停；后台取新 URL（占 standby，勿打断 active）
    const upgraded = await getSongDetail({
      ...song,
      playMusicUrl: undefined,
      streamQuality: undefined,
      expiredAt: undefined,
      preferredQuality: target,
      forceQualityResolve: true,
      _streamUpgradeTo: undefined,
      playLoading: false
    } as SongResult);

    if (isQualitySwitchStale(switchGen, playGenAtStart, songId, playerCore)) return false;
    if (!upgraded.playMusicUrl) return false;

    const got = normalizeQualityKey(upgraded.streamQuality) || target;
    if (got === stream) {
      delete (playerCore.playMusic as any)._streamUpgradeTo;
      return false;
    }

    // 2) 仅当仍是本曲在播时才灌 standby；已切歌则放弃（避免占槽/误 promote）
    if (isQualitySwitchStale(switchGen, playGenAtStart, songId, playerCore)) return false;
    try {
      audioService.preload(upgraded.playMusicUrl, {
        ...playerCore.playMusic,
        ...upgraded,
        id: song.id,
        playLoading: false
      } as SongResult);
    } catch {
      /* ignore */
    }

    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      if (isQualitySwitchStale(switchGen, playGenAtStart, songId, playerCore)) return false;
      if (audioService.hasPreloaded(upgraded.playMusicUrl)) break;
      await new Promise((r) => setTimeout(r, 80));
    }

    if (isQualitySwitchStale(switchGen, playGenAtStart, songId, playerCore)) return false;

    // 3) 进度必须来自「本曲」audio；切歌后 currentTime 是上一首的，绝不能用
    const seek = getSeekSecondsForSong(songId);
    const keepPlaying = playerCore.userPlayIntent !== false && !!playerCore.isPlay;

    // play 前最后一次校验，缩小竞态窗
    if (isQualitySwitchStale(switchGen, playGenAtStart, songId, playerCore)) return false;

    playerCore.playMusic = {
      ...playerCore.playMusic,
      ...upgraded,
      id: song.id,
      playLoading: false
    };
    playerCore.playMusicUrl = upgraded.playMusicUrl;
    delete (playerCore.playMusic as any)._streamUpgradeTo;

    await audioService.play(upgraded.playMusicUrl, playerCore.playMusic, keepPlaying, seek);

    // play 后若已切歌：不要把旧曲 meta 写回新列表项（patch 按 id）
    if (isQualitySwitchStale(switchGen, playGenAtStart, songId, playerCore)) {
      console.info('[playbackController] seamless quality aborted after play (song changed)');
      return false;
    }

    try {
      const pl = await getPlaylistStore();
      pl.patchSongMeta?.(song.id, {
        playMusicUrl: upgraded.playMusicUrl,
        streamQuality: upgraded.streamQuality,
        streamBitrate: upgraded.streamBitrate,
        availableQualities: upgraded.availableQualities,
        expiredAt: upgraded.expiredAt
      });
    } catch {
      /* ignore */
    }

    console.info(
      `[playbackController] seamless quality ok ${song.name}: ${stream} → ${got} @${seek.toFixed(1)}s`
    );
    return true;
  } catch (e) {
    console.warn('[playbackController] seamless quality failed', e);
    return false;
  }
};

/**
 * 先播后升质：首包 boot 后后台 resolve 无损等并 seek 接上。
 */
const maybeUpgradeStreamQuality = async (song: SongResult, gen: number) => {
  const upgradeTo = (song as SongResult & { _streamUpgradeTo?: string })._streamUpgradeTo;
  if (!upgradeTo || !song.id) return;
  delete (song as any)._streamUpgradeTo;
  // 仅升不降；且必须仍是本曲 playGen
  await seamlessSwitchQuality(upgradeTo, { songId: song.id, playGen: gen });
};

// ==================== 导出函数 ====================

/**
 * 核心播放函数（优化版）
 *
 * @param music 要播放的歌曲
 * @param shouldPlay 是否立即播放（默认 true）
 * @returns 是否成功
 */
export const playTrack = async (
  music: SongResult,
  shouldPlay: boolean = true
): Promise<boolean> => {
  // 1. 递增 generation，创建 requestId；作废进行中的无感换档（防上一首 45s 接到下一首）
  const gen = ++generation;
  qualitySwitchGen += 1;
  const requestId = playbackRequestManager.createRequest(music);
  const ttfaId = ttfaBegin(music.id, shouldPlay ? 'play' : 'load');
  console.log(
    `[playbackController] playTrack gen=${gen}, 歌曲: ${music.name}, requestId: ${requestId}`
  );

  const playerCore = await getPlayerCoreStore();
  // 本次切歌的入参意图；softPause 不得清掉（见 audioService.suppressMediaEvents）
  const intendedPlay = shouldPlay;

  // 验证 & 激活请求
  if (!playbackRequestManager.isRequestValid(requestId)) {
    console.log(`[playbackController] 请求创建后即失效: ${requestId}`);
    return false;
  }
  if (!playbackRequestManager.activateRequest(requestId)) {
    console.log(`[playbackController] 无法激活请求: ${requestId}`);
    return false;
  }

  // 3. 先写意图，再 softPause（suppress 挡住 pause→store，避免 race 把 intent 打 false）
  playerCore.play = intendedPlay;
  playerCore.isPlay = intendedPlay;
  playerCore.userPlayIntent = intendedPlay;

  // 换曲：立刻停掉上一首（含「standby 可 promote」——先静音旧 active，再 promote）
  const nextUrl = music.playMusicUrl;
  const prevTrack = audioService.getCurrentTrack();
  const isSameTrack = !!(prevTrack && String(prevTrack.id) === String(music.id));
  const canPromote = !!(nextUrl && audioService.hasPreloaded(nextUrl));
  if (!isSameTrack) {
    audioService.softPause();
    // 清掉上一首遗留的升质标记
    if (playerCore.playMusic && String(playerCore.playMusic.id) !== String(music.id)) {
      delete (playerCore.playMusic as any)._streamUpgradeTo;
    }
    playerCore.userPlayIntent = intendedPlay;
    playerCore.play = intendedPlay;
    playerCore.isPlay = intendedPlay;
  } else if (!canPromote) {
    audioService.softPause();
    playerCore.userPlayIntent = intendedPlay;
    playerCore.play = intendedPlay;
    playerCore.isPlay = intendedPlay;
  }

  // 4. 先设置基本歌曲信息（立即显示UI）；换曲 loading，同曲升质不在此路径
  music.playLoading = !isSameTrack || !canPromote;
  // 换曲时禁止带着上一首的进度感：新曲从 0 起（loadAndPlayAudio 也会按 songId 读进度）
  playerCore.playMusic = { ...music, playLoading: music.playLoading };
  updateDocumentTitle(music);

  const originalMusic = { ...music };

  // 4.5 立即并行加载元数据（歌词 + 背景色），与取 URL/加载音频同时进行：
  // 不阻塞出声，但让全屏页的封面/歌词/背景色尽量在音频起播前就绪，
  // 避免"先响歌、后换脸"的割裂感。预加载过的歌曲两者都是缓存命中，立即应用
  let loadedMetadata: {
    lyrics: SongResult['lyric'];
    backgroundColor: string;
    primaryColor: string;
  } | null = null;
  const applyLoadedMetadata = () => {
    if (!loadedMetadata || gen !== generation) return;
    if (String(playerCore.playMusic?.id) !== String(originalMusic.id)) return;
    // 歌词可覆盖；颜色：若 UI 已为「本曲」取到色则不回退旧结果
    if (loadedMetadata.lyrics) {
      playerCore.playMusic.lyric = loadedMetadata.lyrics;
    }
    const curBg = playerCore.playMusic.backgroundColor;
    const curPrimary = playerCore.playMusic.primaryColor;
    // 仅在本曲尚无色，或 loadMetadata 结果非空时写入（避免空串冲掉）
    if (loadedMetadata.backgroundColor) {
      // 若当前色来自本曲后续 extract（同 id 已有色），仍允许用封面采样覆盖 hold 残留
      playerCore.playMusic.backgroundColor = loadedMetadata.backgroundColor;
    } else if (!curBg) {
      /* keep */
    }
    if (loadedMetadata.primaryColor) {
      playerCore.playMusic.primaryColor = loadedMetadata.primaryColor;
    } else if (!curPrimary) {
      /* keep */
    }
    playerCore.playMusic = { ...playerCore.playMusic };
  };
  loadMetadata(originalMusic)
    .then((result) => {
      loadedMetadata = result;
      applyLoadedMetadata();
    })
    .catch((error) => {
      // 元数据加载失败不阻塞播放
      console.warn('[playbackController] 元数据加载失败:', error);
    });

  // 5. 播放历史不阻塞出声路径
  void getPlayHistoryStore()
    .then((playHistoryStore) => {
      if (music.isPodcast) {
        if (music.program) playHistoryStore.addPodcast(music.program);
      } else {
        playHistoryStore.addMusic(music);
      }
    })
    .catch((e) => {
      console.warn('[playbackController] 添加播放历史失败:', e);
    });

  // 6. 取 URL：有新鲜缓存则 0 resolve 直出；否则 getSongDetail（与 prefetch 共享 inflight）
  try {
    let updatedPlayMusic: SongResult;
    // 仅当 URL 新鲜且 stream 已达「偏好∩本曲可用」才跳过 resolve
    // （预取可能用极高 boot，有无损时必须再取，不能卡在较高/极高）
    if (canReuseSongUrl(originalMusic)) {
      console.info(
        `[playbackController] URL 快路径 id=${originalMusic.id} stream=${originalMusic.streamQuality}`
      );
      restorePreviewStreamFlags(originalMusic);
      updatedPlayMusic = {
        ...originalMusic,
        playLoading: true
      };
      ttfaMark(ttfaId, 'resolve_cache');
    } else {
      updatedPlayMusic = await getSongDetail(originalMusic, requestId);
      restorePreviewStreamFlags(updatedPlayMusic);
      ttfaMark(ttfaId, 'resolve');
    }

    // 检查 generation
    if (gen !== generation) {
      console.log(`[playbackController] gen=${gen} 已过期（获取详情后），当前 gen=${generation}`);
      return false;
    }

    if (!updatedPlayMusic.playMusicUrl) {
      throw new Error('歌曲没有播放URL');
    }

    // 保持 loading 直到音频 canplay
    playerCore.playMusic = { ...updatedPlayMusic, playLoading: true };
    playerCore.playMusicUrl = updatedPlayMusic.playMusicUrl as string;
    music.playMusicUrl = updatedPlayMusic.playMusicUrl as string;
    music.isPreviewStream = updatedPlayMusic.isPreviewStream;
    if (updatedPlayMusic.preview) music.preview = updatedPlayMusic.preview;
    applyLoadedMetadata();

    // resolve 可能后于 loadLrc 带回译文：再刷一次歌词贴 trText
    void loadLrc(updatedPlayMusic.id)
      .then((lyrics) => {
        if (gen !== generation) return;
        if (!lyrics?.lrcArray?.some((l) => l.trText)) return;
        playerCore.playMusic.lyric = lyrics;
        playerCore.playMusic = { ...playerCore.playMusic };
      })
      .catch(() => undefined);
  } catch (error) {
    if (gen !== generation) return false;
    console.error('[playbackController] 获取歌曲详情失败:', error);
    message.error(i18n.global.t('player.playFailed'));
    if (playerCore.playMusic) {
      playerCore.playMusic.playLoading = false;
    }
    playbackRequestManager.failRequest(requestId);
    return false;
  }

  // 7. 加载并播放音频
  // wantPlay：用户加载中点了暂停 → userPlayIntent=false；否则用入参 intendedPlay
  try {
    const wantPlay = intendedPlay && playerCore.userPlayIntent !== false;
    // 若 softPause 曾误清 intent，intendedPlay 仍 true 时强制起播
    const forceWant = intendedPlay && wantPlay;
    const success = await loadAndPlayAudio(playerCore.playMusic, forceWant || wantPlay);

    // 检查 generation
    if (gen !== generation) {
      console.log(`[playbackController] gen=${gen} 已过期（播放音频后），当前 gen=${generation}`);
      audioService.stop();
      return false;
    }

    if (success) {
      // 8. 元数据已在 4.5 步与播放并行加载，此处无需再处理

      // 9. 播放成功，重置 URL 过期恢复计数
      resetUrlExpiredRetry();
      playerCore.playMusic.playLoading = false;
      playerCore.playMusic.isFirstPlay = false;
      // 最终意图：入参要播且用户未在加载中点暂停
      const finalIntent = intendedPlay && playerCore.userPlayIntent !== false;
      playerCore.userPlayIntent = finalIntent;
      playerCore.play = finalIntent;
      playerCore.isPlay = finalIntent;
      const sound = audioService.getCurrentSound();
      if (sound) {
        if (finalIntent) {
          if (sound.paused) {
            void sound.play().catch((e) => {
              console.warn('[playbackController] final intent play failed', e);
            });
          }
        } else if (!audioService.isSuppressingMediaEvents()) {
          sound.pause();
        }
      }

      // 后台升质：先 higher 出声后再换 lossless 等
      void maybeUpgradeStreamQuality(playerCore.playMusic, gen);
      // 把试听标记 / URL 写回列表，循环切回时不丢 base
      try {
        const { usePlaylistStore } = await import('@/store/modules/playlist');
        const pl = usePlaylistStore();
        const cur = playerCore.playMusic;
        pl.patchSongMeta?.(cur.id, {
          playMusicUrl: cur.playMusicUrl,
          isPreviewStream: cur.isPreviewStream,
          preview: cur.preview,
          expiredAt: cur.expiredAt,
          availableQualities: cur.availableQualities,
          streamQuality: cur.streamQuality,
          streamBitrate: cur.streamBitrate
        });
      } catch {
        /* 忽略 */
      }
      playbackRequestManager.completeRequest(requestId);
      console.log(`[playbackController] gen=${gen} 就绪: ${music.name} play=${finalIntent}`);

      // 10. 触发预加载下一首（立即触发，不等待）
      triggerPreload(playerCore.playMusic);

      return true;
    } else {
      playbackRequestManager.failRequest(requestId);
      return false;
    }
  } catch (error) {
    // 11. 播放失败
    if (gen !== generation) {
      console.log(`[playbackController] gen=${gen} 已过期（播放异常），静默返回`);
      return false;
    }
    // 快速切歌/stop 会以 AbortError 结算上一轮 play() Promise，属预期取消
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }

    console.error('[playbackController] 播放音频失败:', error);

    const errorMsg = error instanceof Error ? error.message : String(error);

    // 操作锁错误：强制重置后重试一次
    if (errorMsg.includes('操作锁激活')) {
      try {
        audioService.forceResetOperationLock();
        console.log('[playbackController] 已强制重置操作锁');
      } catch (e) {
        console.error('[playbackController] 重置操作锁失败:', e);
      }
    }

    message.error(i18n.global.t('player.playFailed'));
    if (playerCore.playMusic) {
      playerCore.playMusic.playLoading = false;
    }
    playerCore.setIsPlay(false);
    playbackRequestManager.failRequest(requestId);
    return false;
  }
};

/**
 * URL 过期恢复：同一首歌仅静默重试一次。
 * 重试仍失败说明重新解析也救不回来（音源无资源/文件损坏），继续原地重试
 * 只会死循环，应当直接切到下一首
 */
const MAX_URL_EXPIRED_RETRIES = 1;
let urlExpiredRetrySongId: string | number | null = null;
let urlExpiredRetryCount = 0;

/** playTrack 成功后重置恢复计数（导出给 playTrack 内部使用） */
const resetUrlExpiredRetry = (): void => {
  urlExpiredRetrySongId = null;
  urlExpiredRetryCount = 0;
};

/**
 * 清除歌曲的解析 URL 缓存。
 * 播放失败大概率是缓存的解析 URL 已失效或内容损坏（如返回 HTML 触发
 * Format error），不清缓存的话重新解析会再次命中同一个坏 URL 形成死循环
 */
const clearParsedUrlCache = async (songId: string | number): Promise<void> => {
  // 本地歌曲 id 为 hex 字符串；官方链路无独立解析缓存表可清
  if (!/^\d+$/.test(String(songId))) return;
  try {
    const { musicDB } = await import('@/hooks/MusicHook');
    await musicDB.deleteData('music_url_cache', Number(songId));
  } catch (error) {
    console.warn('[playbackController] 清除URL缓存失败:', error);
  }
};

/**
 * 设置 URL 过期事件处理器
 * 监听 audioService 的 url_expired 事件，自动重新获取 URL 并恢复播放。
 * 恢复策略：清坏缓存 → 有限次重试 → 仍失败则自动切下一首
 */
export const setupUrlExpiredHandler = (): void => {
  audioService.on('url_expired', async (expiredTrack: SongResult) => {
    if (!expiredTrack) return;

    console.log('[playbackController] 检测到URL过期事件，准备重新获取URL', expiredTrack.name);

    const playerCore = await getPlayerCoreStore();

    // 只在用户有播放意图或正在播放时处理
    if (!playerCore.userPlayIntent && !playerCore.play) {
      console.log('[playbackController] 用户无播放意图，跳过URL过期处理');
      return;
    }

    // 当前曲已切换（如失败跳歌），放弃恢复旧歌，
    // 避免两个恢复驱动并发争抢 generation
    if (playerCore.playMusic?.id !== expiredTrack.id) {
      console.log('[playbackController] 当前歌曲已变更，跳过URL过期处理');
      return;
    }

    // 统计同一首歌的连续恢复次数
    if (urlExpiredRetrySongId === expiredTrack.id) {
      urlExpiredRetryCount++;
    } else {
      urlExpiredRetrySongId = expiredTrack.id;
      urlExpiredRetryCount = 1;
    }

    // 先清掉可能已损坏的解析 URL 缓存，让重试真正拿到新 URL
    await clearParsedUrlCache(expiredTrack.id);

    // 超过重试上限：静默切下一首
    if (urlExpiredRetryCount > MAX_URL_EXPIRED_RETRIES) {
      console.warn(`[playbackController] ${expiredTrack.name} 恢复重试失败，切换下一首`);
      resetUrlExpiredRetry();
      try {
        const playlistStore = await getPlaylistStore();
        if (playlistStore.playList.length > 1 || playerCore.isFmPlaying) {
          playlistStore.nextPlay();
        } else {
          playerCore.setIsPlay(false);
        }
      } catch (error) {
        console.error('[playbackController] 切换下一首失败:', error);
        playerCore.setIsPlay(false);
      }
      return;
    }

    const currentSound = audioService.getCurrentSound();
    let seekPosition = 0;
    if (currentSound) {
      try {
        seekPosition = currentSound.currentTime;
        const duration = currentSound.duration;
        if (duration > 0 && seekPosition > 0 && duration - seekPosition < 5) {
          console.log('[playbackController] 歌曲接近末尾，跳过URL过期处理');
          return;
        }
      } catch {
        // 静默忽略
      }
    }

    try {
      const trackToPlay: SongResult = {
        ...expiredTrack,
        isFirstPlay: true,
        playMusicUrl: undefined
      };

      // 静默重试：成功恢复位置，失败交由下一次 url_expired 事件按上限切歌
      const success = await playTrack(trackToPlay, true);

      if (success && seekPosition > 0) {
        // 延迟一小段时间确保音频已就绪
        setTimeout(() => {
          try {
            audioService.seek(seekPosition);
          } catch {
            console.warn('[playbackController] 恢复播放位置失败');
          }
        }, 300);
      }
    } catch (error) {
      console.error('[playbackController] 处理URL过期事件失败:', error);
    }
  });
};

/**
 * 初始化播放状态
 * 应用启动时恢复上次的播放状态
 */
export const initializePlayState = async (): Promise<void> => {
  const playerCore = await getPlayerCoreStore();
  const settingsStore = await getSettingsStore();

  if (!playerCore.playMusic || Object.keys(playerCore.playMusic).length === 0) {
    console.log('[playbackController] 没有保存的播放状态，跳过初始化');
    setTimeout(() => {
      audioService.setPlaybackRate(playerCore.playbackRate);
    }, 2000);
    return;
  }

  try {
    console.log('[playbackController] 恢复上次播放的音乐:', playerCore.playMusic.name);
    const isPlaying = settingsStore.setData.autoPlay;

    if (!isPlaying) {
      // 自动播放关闭：绝不 await 拉歌词/取色，否则首启与发现页首曲抢带宽/IPC，体感极慢
      console.log('[playbackController] 自动播放已禁用，元数据后台加载');

      playerCore.play = false;
      playerCore.isPlay = false;
      playerCore.userPlayIntent = false;
      updateDocumentTitle(playerCore.playMusic);

      // 进度 UI 同步本地读
      try {
        const raw = localStorage.getItem('playProgress');
        if (raw) {
          const parsed = JSON.parse(raw) as any;
          const data = parsed?.data ?? parsed;
          if (
            data &&
            String(data.songId) === String(playerCore.playMusic.id) &&
            (data.progress || 0) > 0
          ) {
            void import('@/hooks/MusicHook').then(({ nowTime, allTime }) => {
              nowTime.value = Number(data.progress) || 0;
              if (playerCore.playMusic.dt) {
                allTime.value = playerCore.playMusic.dt / 1000;
              }
            });
          }
        }
      } catch (e) {
        console.warn('[playbackController] 恢复播放进度失败:', e);
      }

      // 歌词/封面色后台补齐，不挡 App onMounted
      void loadMetadata(playerCore.playMusic)
        .then(({ lyrics, backgroundColor, primaryColor }) => {
          if (!playerCore.playMusic?.id) return;
          playerCore.playMusic.lyric = lyrics;
          playerCore.playMusic.backgroundColor = backgroundColor;
          playerCore.playMusic.primaryColor = primaryColor;
        })
        .catch((e) => console.warn('[playbackController] 加载元数据失败:', e));
    } else {
      // 自动播放启用：调用 playTrack 恢复播放
      // 本地音乐（local:// 协议）不需要重新获取 URL，保留原始路径
      const isLocalMusic = playerCore.playMusic.playMusicUrl?.startsWith('local://');

      await playTrack(
        {
          ...playerCore.playMusic,
          isFirstPlay: true,
          playMusicUrl: isLocalMusic ? playerCore.playMusic.playMusicUrl : undefined
        },
        true
      );
    }
  } catch (error) {
    console.error('[playbackController] 恢复播放状态失败:', error);
    playerCore.play = false;
    playerCore.isPlay = false;
    playerCore.playMusic = {} as SongResult;
    playerCore.playMusicUrl = '';
  }

  // 延迟设置播放速率
  setTimeout(() => {
    audioService.setPlaybackRate(playerCore.playbackRate);
  }, 2000);
};
