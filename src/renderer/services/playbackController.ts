/**
 * 播放控制器
 *
 * 核心播放流程管理，使用 generation-based 取消模式替代原 playerCore.ts 中的控制流。
 * 每次 playTrack() 调用递增 generation，所有异步操作在 await 后检查 generation 是否过期。
 *
 * 导出：playTrack, reparseCurrentSong, initializePlayState, setupUrlExpiredHandler, getCurrentGeneration
 */

import { cloneDeep } from 'lodash';
import { createDiscreteApi } from 'naive-ui';

import i18n from '@/../i18n/renderer';
import { getParsingMusicUrl } from '@/api/music';
import { loadLrc, useSongDetail } from '@/hooks/usePlayerHooks';
import { audioService } from '@/services/audioService';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import { SongSourceConfigManager } from '@/services/SongSourceConfigManager';
import type { Platform, SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';
import { readPlaybackProgress } from '@/utils/playerUtils';

const { message } = createDiscreteApi(['message']);

let reparseGeneration = 0;

/**
 * 获取当前 generation（用于外部检查）
 */
export const getCurrentGeneration = (): number => playbackRequestManager.getGeneration();

// ==================== 懒加载 Store（避免循环依赖） ====================

const getPlayerCoreStore = async () => {
  const { usePlayerCoreStore } = await import('@/store/modules/playerCore');
  return usePlayerCoreStore();
};

const getPlaylistStore = async () => {
  const { usePlaylistStore } = await import('@/store/modules/playlist');
  return usePlaylistStore();
};

const getPlayHistoryStore = async () => {
  const { usePlayHistoryStore } = await import('@/store/modules/playHistory');
  return usePlayHistoryStore();
};

const getSettingsStore = async () => {
  const { useSettingsStore } = await import('@/store/modules/settings');
  return useSettingsStore();
};

// ==================== 内部辅助函数 ====================

/**
 * 加载元数据（歌词 + 背景色），并行执行
 */
const loadMetadata = async (
  music: SongResult
): Promise<{
  lyrics: SongResult['lyric'];
  backgroundColor: string;
  primaryColor: string;
}> => {
  const [lyrics, { backgroundColor, primaryColor }] = await Promise.all([
    (async () => {
      if (music.lyric?.lrcTimeArray?.length) {
        return music.lyric;
      }
      return await loadLrc(music.id);
    })(),
    (async () => {
      if (music.backgroundColor && music.primaryColor) {
        return { backgroundColor: music.backgroundColor, primaryColor: music.primaryColor };
      }
      return await getImageLinearBackground(getImgUrl(music?.picUrl, '30y30'));
    })()
  ]);

  return { lyrics, backgroundColor, primaryColor };
};

/**
 * 加载并播放音频
 */
const loadAndPlayAudio = async (
  song: SongResult,
  shouldPlay: boolean,
  startTime: number
): Promise<void> => {
  if (!song.playMusicUrl) {
    throw new Error('歌曲没有播放URL');
  }

  // 直接通过 audioService 播放（单一 audio 元素，换 src 即可）
  console.log(`[playbackController] 开始播放: ${song.name}`);
  await audioService.play(song.playMusicUrl, song, shouldPlay, startTime);
};

/**
 * 触发预加载下一首/下下首歌曲（立即触发）
 */
const triggerPreload = async (song: SongResult, gen: number): Promise<void> => {
  try {
    const playlistStore = await getPlaylistStore();
    if (gen !== getCurrentGeneration()) return;
    const list = playlistStore.playList;
    if (Array.isArray(list) && list.length > 0) {
      const idx = list.findIndex(
        (item: SongResult) => item.id === song.id && item.source === song.source
      );
      if (idx !== -1) {
        // 立即触发预加载，不等待
        playlistStore.preloadNextSongs(idx);
      }
    }
  } catch (e) {
    console.warn('预加载触发失败（可能是依赖未加载或循环依赖），已忽略:', e);
  }
};

/**
 * 更新文档标题
 */
const updateDocumentTitle = (music: SongResult): void => {
  let title = music.name;
  if (music.source === 'netease' && music?.song?.artists) {
    title += ` - ${music.song.artists.reduce(
      (prev: string, curr: any) => `${prev}${curr.name}/`,
      ''
    )}`;
  }
  document.title = 'AlgerMusic - ' + title;
};

// ==================== 导出函数 ====================

/**
 * 核心播放函数（优化版）
 *
 * @param music 要播放的歌曲
 * @param shouldPlay 是否立即播放（默认 true）
 * @returns 是否成功
 */
type PlaybackOptions = {
  startTime?: number;
  recovery?: boolean;
  recordHistory?: boolean;
};

export const playTrack = async (
  music: SongResult,
  shouldPlay: boolean = true,
  options: PlaybackOptions = {}
): Promise<boolean> => {
  if (!music?.id) return false;
  const requestId = playbackRequestManager.createRequest(music);
  const gen = getCurrentGeneration();
  const playerCore = await getPlayerCoreStore();
  if (gen !== getCurrentGeneration()) return false;
  if (music.id !== playerCore.playMusic.id) {
    SongSourceConfigManager.clearTriedSources(music.id);
  }
  if (!options.recovery) resetUrlExpiredRetry();

  audioService.stop();
  playerCore.setIsPlay(false);
  playerCore.userPlayIntent = shouldPlay;
  playerCore.playMusic = { ...music, playLoading: true };
  playerCore.playMusicUrl = '';
  updateDocumentTitle(music);

  const originalMusic = { ...music };
  let loadedMetadata: Awaited<ReturnType<typeof loadMetadata>> | null = null;
  const applyLoadedMetadata = () => {
    if (!loadedMetadata || gen !== getCurrentGeneration()) return;
    playerCore.playMusic.lyric = loadedMetadata.lyrics;
    playerCore.playMusic.backgroundColor = loadedMetadata.backgroundColor;
    playerCore.playMusic.primaryColor = loadedMetadata.primaryColor;
    // 触发 watcher 更新
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

  const { getSongDetail } = useSongDetail();
  const startTime =
    Number.isFinite(options.startTime) && options.startTime! >= 0 ? options.startTime! : 0;
  let candidate = originalMusic;
  for (let attempt = 0; attempt < 2; attempt++) {
    let audioUrl: string | undefined;
    try {
      const song = await getSongDetail(candidate, requestId);
      if (gen !== getCurrentGeneration()) return false;
      if (!song.playMusicUrl) throw new Error('歌曲没有播放URL');
      audioUrl = song.playMusicUrl;
      playerCore.playMusic = { ...song, playLoading: true };
      playerCore.playMusicUrl = audioUrl;
      applyLoadedMetadata();
      audioService.setVolume(playerCore.isMuted ? 0 : playerCore.volume);
      audioService.setPlaybackRate(playerCore.playbackRate);
      await loadAndPlayAudio(playerCore.playMusic, shouldPlay, startTime);
      if (gen !== getCurrentGeneration()) return false;

      playerCore.setIsPlay(shouldPlay);
      playerCore.playMusic.playLoading = false;
      playerCore.playMusic.isFirstPlay = false;
      playbackRequestManager.completeRequest(requestId);
      window.dispatchEvent(
        new CustomEvent('audio-ready', {
          detail: { sound: audioService.getCurrentSound(), shouldPlay }
        })
      );
      void triggerPreload(playerCore.playMusic, gen);
      if (shouldPlay && options.recordHistory !== false) {
        try {
          const history = await getPlayHistoryStore();
          if (gen !== getCurrentGeneration()) return false;
          if (music.isPodcast) {
            if (music.program) history.addPodcast(music.program);
          } else {
            history.addMusic(playerCore.playMusic);
          }
        } catch (error) {
          console.warn('[playbackController] 添加播放历史失败:', error);
        }
      }
      return true;
    } catch (error) {
      if (gen !== getCurrentGeneration()) return false;
      const name = (error as Error)?.name;
      if (
        attempt === 0 &&
        !options.recovery &&
        audioUrl &&
        /^https?:\/\//i.test(audioUrl) &&
        name !== 'AbortError' &&
        name !== 'NotAllowedError'
      ) {
        await clearParsedUrlCache(music.id);
        if (gen !== getCurrentGeneration()) return false;
        candidate = { ...originalMusic, playMusicUrl: undefined, expiredAt: undefined };
        continue;
      }

      console.error('[playbackController] 播放失败:', error);
      playerCore.setIsPlay(false);
      playerCore.userPlayIntent = false;
      playerCore.playMusic.playLoading = false;
      audioService.pause();
      if (name !== 'AbortError') {
        message.error(
          i18n.global.t(name === 'NotAllowedError' ? 'player.resumeFailed' : 'player.playFailed')
        );
      }
      playbackRequestManager.failRequest(requestId);
      return false;
    }
  }
  return false;
};

export const resumeCurrentSong = async (): Promise<boolean> => {
  const initialGeneration = getCurrentGeneration();
  const core = await getPlayerCoreStore();
  if (initialGeneration !== getCurrentGeneration() || !core.playMusic?.id) return false;
  const song = { ...core.playMusic };
  const sound = audioService.getCurrentSound();
  if (
    !sound ||
    sound.error ||
    sound.readyState < 2 ||
    audioService.getCurrentTrack()?.id !== song.id
  ) {
    return playTrack(song, true, {
      startTime: readPlaybackProgress(song.id),
      recordHistory: false
    });
  }

  const requestId = playbackRequestManager.createRequest(song);
  const gen = getCurrentGeneration();
  core.userPlayIntent = true;
  core.playMusic.playLoading = true;
  try {
    audioService.setVolume(core.isMuted ? 0 : core.volume);
    audioService.setPlaybackRate(core.playbackRate);
    await loadAndPlayAudio(song, true, sound.ended ? 0 : sound.currentTime);
    if (gen !== getCurrentGeneration()) return false;
    core.setIsPlay(true);
    core.playMusic.playLoading = false;
    playbackRequestManager.completeRequest(requestId);
    window.dispatchEvent(new CustomEvent('audio-ready', { detail: { sound, shouldPlay: true } }));
    return true;
  } catch (error) {
    if (gen !== getCurrentGeneration()) return false;
    core.setIsPlay(false);
    core.userPlayIntent = false;
    core.playMusic.playLoading = false;
    console.error('[playbackController] 恢复播放失败:', error);
    message.error(i18n.global.t('player.resumeFailed'));
    return false;
  }
};

/**
 * 使用指定音源重新解析当前歌曲
 *
 * @param sourcePlatform 目标音源平台
 * @param isAuto 是否为自动切换
 * @returns 是否成功
 */
export const reparseCurrentSong = async (
  sourcePlatform: Platform,
  isAuto: boolean = false
): Promise<boolean> => {
  const gen = getCurrentGeneration();
  const reparseGen = ++reparseGeneration;
  try {
    const playerCore = await getPlayerCoreStore();
    if (gen !== getCurrentGeneration() || reparseGen !== reparseGeneration) return false;
    const currentSong = playerCore.playMusic;

    if (!currentSong || !currentSong.id) {
      console.warn('[playbackController] 没有有效的播放对象');
      return false;
    }

    // 本地库使用路径哈希作为 ID，不能用 parseInt 将其截断为另一首在线歌曲。
    const numericId = Number(currentSong.id);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) return false;

    // 使用 SongSourceConfigManager 保存配置
    SongSourceConfigManager.setConfig(currentSong.id, [sourcePlatform], isAuto ? 'auto' : 'manual');

    const currentSound = audioService.getCurrentSound();
    const startTime = currentSound?.currentTime ?? 0;
    if (currentSound) {
      audioService.pause();
    }

    console.log(`[playbackController] 使用音源 ${sourcePlatform} 重新解析歌曲 ${numericId}`);

    const songData = cloneDeep(currentSong);
    const res = await getParsingMusicUrl(numericId, songData);
    if (gen !== getCurrentGeneration() || reparseGen !== reparseGeneration) return false;

    if (res && res.data && res.data.data && res.data.data.url) {
      const newUrl = res.data.data.url;
      console.log(`[playbackController] 解析成功，获取新URL: ${newUrl.substring(0, 50)}...`);

      const updatedMusic: SongResult = {
        ...currentSong,
        playMusicUrl: newUrl,
        expiredAt: Date.now() + 1800000
      };

      const playback = playTrack(updatedMusic, true, { startTime, recordHistory: false });
      const playbackGeneration = getCurrentGeneration();
      const success = await playback;
      if (!success || playbackGeneration !== getCurrentGeneration()) return false;

      // 更新播放列表中的歌曲信息
      const playlistStore = await getPlaylistStore();
      if (playbackGeneration !== getCurrentGeneration()) return false;
      playlistStore.updateSong(updatedMusic);

      return true;
    } else {
      console.warn(`[playbackController] 使用音源 ${sourcePlatform} 解析失败`);
      return false;
    }
  } catch (error) {
    console.error('[playbackController] 重新解析失败:', error);
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

/** 只有新的主动播放才重置，恢复出声后立即再次失败不能无限重试。 */
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
  // 本地歌曲 id 为 hex 字符串，无解析缓存可清
  if (!/^\d+$/.test(String(songId))) return;
  try {
    const { MusicResolveCache } = await import('@/services/musicSource/cache');
    await MusicResolveCache.clearMusicCache(Number(songId));
  } catch (error) {
    console.warn('[playbackController] 清除URL缓存失败:', error);
  }
};

/**
 * 设置 URL 过期事件处理器
 * 监听 audioService 的 url_expired 事件，自动重新获取 URL 并恢复播放。
 * 恢复策略：清坏缓存 → 有限次重试 → 仍失败则自动切下一首
 */
let playbackHandlersInitialized = false;
let recoveryInFlight: number | null = null;

const handleUrlExpired = async (expiredTrack: SongResult): Promise<void> => {
  if (!expiredTrack || expiredTrack.playMusicUrl?.startsWith('local://')) return;
  const gen = getCurrentGeneration();
  if (recoveryInFlight === gen) return;
  recoveryInFlight = gen;
  try {
    const core = await getPlayerCoreStore();
    if (
      gen !== getCurrentGeneration() ||
      !core.userPlayIntent ||
      core.playMusic?.id !== expiredTrack.id ||
      core.playMusic.playMusicUrl !== expiredTrack.playMusicUrl
    )
      return;

    if (urlExpiredRetrySongId !== expiredTrack.id) {
      urlExpiredRetrySongId = expiredTrack.id;
      urlExpiredRetryCount = 0;
    }
    let activeGeneration = gen;
    if (urlExpiredRetryCount < MAX_URL_EXPIRED_RETRIES) {
      urlExpiredRetryCount++;
      const startTime = audioService.getCurrentSound()?.currentTime ?? 0;
      await clearParsedUrlCache(expiredTrack.id);
      if (gen !== getCurrentGeneration()) return;
      const playback = playTrack(
        { ...expiredTrack, playMusicUrl: undefined, expiredAt: undefined },
        true,
        { startTime, recovery: true, recordHistory: false }
      );
      activeGeneration = getCurrentGeneration();
      if (await playback) return;
    }
    if (activeGeneration !== getCurrentGeneration()) return;
    const playlist = await getPlaylistStore();
    if (activeGeneration !== getCurrentGeneration()) return;
    core.setIsPlay(false);
    if (playlist.playList.length > 1 || core.isFmPlaying) {
      await playlist.nextPlay(false, true);
    } else {
      core.handlePause();
    }
  } catch (error) {
    console.error('[playbackController] 处理URL过期事件失败:', error);
  } finally {
    if (recoveryInFlight === gen) recoveryInFlight = null;
  }
};

export const setupUrlExpiredHandler = (): void => {
  if (playbackHandlersInitialized) return;
  playbackHandlersInitialized = true;
  audioService.on('url_expired', handleUrlExpired);
  audioService.on('playback_error', async (track: SongResult) => {
    const gen = getCurrentGeneration();
    const core = await getPlayerCoreStore();
    if (gen !== getCurrentGeneration() || core.playMusic.id !== track.id) return;
    core.handlePause();
    message.error(i18n.global.t('player.playFailed'));
  });
  audioService.on('play_request', resumeCurrentSong);
  const pauseCurrent = async () => {
    const gen = getCurrentGeneration();
    const core = await getPlayerCoreStore();
    if (gen === getCurrentGeneration()) core.handlePause();
  };
  audioService.on('pause_request', pauseCurrent);
  audioService.on('stop_request', pauseCurrent);
};

/**
 * 初始化播放状态
 * 应用启动时恢复上次的播放状态
 */
export const initializePlayState = async (): Promise<void> => {
  const gen = getCurrentGeneration();
  const playerCore = await getPlayerCoreStore();
  const settingsStore = await getSettingsStore();
  if (gen !== 0 || gen !== getCurrentGeneration()) return;
  audioService.setPlaybackRate(playerCore.playbackRate);
  audioService.setVolume(playerCore.isMuted ? 0 : playerCore.volume);

  if (!playerCore.playMusic?.id) {
    console.log('[playbackController] 没有保存的播放状态，跳过初始化');
    return;
  }

  const savedSong = { ...playerCore.playMusic };
  try {
    console.log('[playbackController] 恢复上次播放的音乐:', playerCore.playMusic.name);
    const isPlaying = settingsStore.setData.autoPlay;

    if (!isPlaying) {
      // 自动播放禁用：仅加载元数据，不播放
      console.log('[playbackController] 自动播放已禁用，仅加载元数据');

      try {
        const { lyrics, backgroundColor, primaryColor } = await loadMetadata(savedSong);
        if (gen !== getCurrentGeneration()) return;
        playerCore.playMusic.lyric = lyrics;
        playerCore.playMusic.backgroundColor = backgroundColor;
        playerCore.playMusic.primaryColor = primaryColor;
      } catch (e) {
        console.warn('[playbackController] 加载元数据失败:', e);
      }
      if (gen !== getCurrentGeneration()) return;

      playerCore.play = false;
      playerCore.isPlay = false;
      playerCore.userPlayIntent = false;

      updateDocumentTitle(playerCore.playMusic);

      // 恢复上次保存的播放进度（仅UI显示）
      try {
        const savedProgress = readPlaybackProgress(savedSong.id);
        if (savedProgress > 0) {
          const { nowTime, allTime } = await import('@/hooks/MusicHook');
          if (gen !== getCurrentGeneration()) return;
          nowTime.value = savedProgress;
          // 用歌曲时长设置 allTime（dt 单位是毫秒）
          if (playerCore.playMusic.dt) {
            allTime.value = playerCore.playMusic.dt / 1000;
          }
        }
      } catch (e) {
        console.warn('[playbackController] 恢复播放进度失败:', e);
      }
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
        true,
        { startTime: readPlaybackProgress(savedSong.id), recordHistory: false }
      );
    }
  } catch (error) {
    if (gen !== getCurrentGeneration()) return;
    console.error('[playbackController] 恢复播放状态失败:', error);
    playerCore.play = false;
    playerCore.isPlay = false;
    playerCore.playMusic = {} as SongResult;
    playerCore.playMusicUrl = '';
  }
};
