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
// preloadService 用于预加载下一首的 URL 验证（triggerPreload 中使用）
import { SongSourceConfigManager } from '@/services/SongSourceConfigManager';
import type { Platform, SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';

const { message } = createDiscreteApi(['message']);

// Generation counter for cancellation
let generation = 0;

/**
 * 获取当前 generation（用于外部检查）
 */
export const getCurrentGeneration = (): number => generation;

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
      if (music.lyric && music.lyric.lrcTimeArray.length > 0) {
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
const loadAndPlayAudio = async (song: SongResult, shouldPlay: boolean): Promise<boolean> => {
  if (!song.playMusicUrl) {
    throw new Error('歌曲没有播放URL');
  }

  // 检查保存的进度
  let initialPosition = 0;
  const savedProgress = JSON.parse(localStorage.getItem('playProgress') || '{}');
  if (savedProgress.songId === song.id) {
    initialPosition = savedProgress.progress;
    console.log('[playbackController] 恢复播放进度:', initialPosition);
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
export const playTrack = async (
  music: SongResult,
  shouldPlay: boolean = true
): Promise<boolean> => {
  // 1. 递增 generation，创建 requestId
  const gen = ++generation;
  const requestId = playbackRequestManager.createRequest(music);
  console.log(
    `[playbackController] playTrack gen=${gen}, 歌曲: ${music.name}, requestId: ${requestId}`
  );

  // 如果是新歌曲，重置已尝试的音源
  const playerCore = await getPlayerCoreStore();
  if (music.id !== playerCore.playMusic.id) {
    SongSourceConfigManager.clearTriedSources(music.id);
  }

  // 2. 停止当前音频
  audioService.stop();

  // 验证 & 激活请求
  if (!playbackRequestManager.isRequestValid(requestId)) {
    console.log(`[playbackController] 请求创建后即失效: ${requestId}`);
    return false;
  }
  if (!playbackRequestManager.activateRequest(requestId)) {
    console.log(`[playbackController] 无法激活请求: ${requestId}`);
    return false;
  }

  // 3. 更新播放意图状态（不设置 playMusic，等歌词加载完再设置以触发 watcher）
  playerCore.play = shouldPlay;
  playerCore.isPlay = shouldPlay;
  playerCore.userPlayIntent = shouldPlay;

  // 4. 先设置基本歌曲信息（立即显示UI）
  music.playLoading = true;
  playerCore.playMusic = music;
  updateDocumentTitle(music);

  // 保存原始歌曲数据
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

  // 5. 添加到播放历史
  try {
    const playHistoryStore = await getPlayHistoryStore();
    if (music.isPodcast) {
      if (music.program) {
        playHistoryStore.addPodcast(music.program);
      }
    } else {
      playHistoryStore.addMusic(music);
    }
  } catch (e) {
    console.warn('[playbackController] 添加播放历史失败:', e);
  }

  // 6. 获取歌曲详情（解析 URL）- 这是必须的，不能跳过
  try {
    const { getSongDetail } = useSongDetail();
    const updatedPlayMusic = await getSongDetail(originalMusic, requestId);

    // 检查 generation
    if (gen !== generation) {
      console.log(`[playbackController] gen=${gen} 已过期（获取详情后），当前 gen=${generation}`);
      return false;
    }

    playerCore.playMusic = updatedPlayMusic;
    playerCore.playMusicUrl = updatedPlayMusic.playMusicUrl as string;
    music.playMusicUrl = updatedPlayMusic.playMusicUrl as string;
    // playMusic 被替换为新对象，若元数据已先行到达则重新应用，避免歌词/背景色丢失
    applyLoadedMetadata();
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

  // 7. 加载并播放音频（优先播放）
  try {
    const success = await loadAndPlayAudio(playerCore.playMusic, shouldPlay);

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
      playbackRequestManager.completeRequest(requestId);
      console.log(`[playbackController] gen=${gen} 播放成功: ${music.name}`);

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
  try {
    const playerCore = await getPlayerCoreStore();
    const currentSong = playerCore.playMusic;

    if (!currentSong || !currentSong.id) {
      console.warn('[playbackController] 没有有效的播放对象');
      return false;
    }

    // 使用 SongSourceConfigManager 保存配置
    SongSourceConfigManager.setConfig(currentSong.id, [sourcePlatform], isAuto ? 'auto' : 'manual');

    const currentSound = audioService.getCurrentSound();
    if (currentSound) {
      currentSound.pause();
    }

    const numericId =
      typeof currentSong.id === 'string' ? parseInt(currentSong.id, 10) : currentSong.id;

    console.log(`[playbackController] 使用音源 ${sourcePlatform} 重新解析歌曲 ${numericId}`);

    const songData = cloneDeep(currentSong);
    const res = await getParsingMusicUrl(numericId, songData);

    if (res && res.data && res.data.data && res.data.data.url) {
      const newUrl = res.data.data.url;
      console.log(`[playbackController] 解析成功，获取新URL: ${newUrl.substring(0, 50)}...`);

      const updatedMusic: SongResult = {
        ...currentSong,
        playMusicUrl: newUrl,
        expiredAt: Date.now() + 1800000
      };

      await playTrack(updatedMusic, true);

      // 更新播放列表中的歌曲信息
      const playlistStore = await getPlaylistStore();
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
  // 本地歌曲 id 为 hex 字符串，无解析缓存可清
  if (!/^\d+$/.test(String(songId))) return;
  try {
    const { CacheManager } = await import('@/api/musicParser');
    await CacheManager.clearMusicCache(Number(songId));
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

    // 当前歌曲已变更（例如 nextPlay 的失败跳歌已接管），不再恢复旧歌，
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

    // 超过重试上限：不再原地循环，静默切下一首
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

    // 保存当前播放位置
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
    // 设置播放速率
    setTimeout(() => {
      audioService.setPlaybackRate(playerCore.playbackRate);
    }, 2000);
    return;
  }

  try {
    console.log('[playbackController] 恢复上次播放的音乐:', playerCore.playMusic.name);
    const isPlaying = settingsStore.setData.autoPlay;

    if (!isPlaying) {
      // 自动播放禁用：仅加载元数据，不播放
      console.log('[playbackController] 自动播放已禁用，仅加载元数据');

      try {
        const { lyrics, backgroundColor, primaryColor } = await loadMetadata(playerCore.playMusic);
        playerCore.playMusic.lyric = lyrics;
        playerCore.playMusic.backgroundColor = backgroundColor;
        playerCore.playMusic.primaryColor = primaryColor;
      } catch (e) {
        console.warn('[playbackController] 加载元数据失败:', e);
      }

      playerCore.play = false;
      playerCore.isPlay = false;
      playerCore.userPlayIntent = false;

      updateDocumentTitle(playerCore.playMusic);

      // 恢复上次保存的播放进度（仅UI显示）
      try {
        const savedProgress = JSON.parse(localStorage.getItem('playProgress') || '{}');
        if (savedProgress.songId === playerCore.playMusic.id && savedProgress.progress > 0) {
          const { nowTime, allTime } = await import('@/hooks/MusicHook');
          nowTime.value = savedProgress.progress;
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
