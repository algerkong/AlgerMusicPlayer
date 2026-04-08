import { useThrottleFn } from '@vueuse/core';
import { debounce } from 'lodash';
import { createDiscreteApi } from 'naive-ui';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, shallowRef, triggerRef } from 'vue';

import i18n from '@/../i18n/renderer';
import { useSongDetail } from '@/hooks/usePlayerHooks';
import { preloadService } from '@/services/preloadService';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { performShuffle, preloadCoverImage } from '@/utils/playerUtils';

import { useIntelligenceModeStore } from './intelligenceMode';
import { usePlayerCoreStore } from './playerCore';
import { useSleepTimerStore } from './sleepTimer';

// 延迟初始化 message，避免 chunk 循环依赖导致 TDZ 错误
let _message: ReturnType<typeof createDiscreteApi>['message'] | null = null;
const getMessage = () => {
  if (!_message) _message = createDiscreteApi(['message']).message;
  return _message;
};

/**
 * 精简 SongResult 对象，只保留持久化必要字段
 * 排除大体积字段：lyric, song, playMusicUrl, backgroundColor, primaryColor
 */
const minifySong = (s: SongResult) => ({
  id: s.id,
  name: s.name,
  picUrl: s.picUrl,
  ar: s.ar?.map((a) => ({ id: a.id, name: a.name })),
  al: s.al,
  source: s.source,
  dt: s.dt
});

const minifySongList = (list: SongResult[] | undefined) => list?.map(minifySong) ?? [];

/**
 * 防抖 localStorage 包装，降低写入频率
 * 通过 pendingWrites 跟踪未写入数据，beforeunload 时刷新
 */
const pendingWrites = new Map<string, string>();

const flushPendingWrites = () => {
  pendingWrites.forEach((value, key) => {
    localStorage.setItem(key, value);
  });
  pendingWrites.clear();
};

const debouncedSetItem = debounce((key: string, value: string) => {
  localStorage.setItem(key, value);
  pendingWrites.delete(key);
}, 2000);

const debouncedLocalStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    pendingWrites.set(key, value);
    debouncedSetItem(key, value);
  }
};

// 正常关闭时刷新未写入的数据
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingWrites);
}

/**
 * 播放列表管理 Store
 * 负责：播放列表、索引、播放模式、预加载、上/下一首
 */
export const usePlaylistStore = defineStore(
  'playlist',
  () => {
    // ==================== 状态 ====================
    // 状态将由 pinia-plugin-persistedstate 自动从 localStorage 恢复
    const playList = shallowRef<SongResult[]>([]);
    const playListIndex = ref(0);
    const playMode = ref(0);
    const originalPlayList = shallowRef<SongResult[]>([]);
    const playListDrawerVisible = ref(false);

    // 连续失败计数器（用于防止无限循环）
    const consecutiveFailCount = ref(0);
    const MAX_CONSECUTIVE_FAILS = 5; // 最大连续失败次数

    // ==================== Computed ====================
    const currentPlayList = computed(() => playList.value);
    const currentPlayListIndex = computed(() => playListIndex.value);

    // ==================== Actions ====================

    /**
     * 获取歌曲详情并预加载
     */
    const fetchSongs = async (startIndex: number, endIndex: number) => {
      try {
        const songs = playList.value.slice(
          Math.max(0, startIndex),
          Math.min(endIndex, playList.value.length)
        );
        const { getSongDetail } = useSongDetail();

        const detailedSongs = await Promise.all(
          songs.map(async (song: SongResult) => {
            try {
              if (!song.playMusicUrl || (song.source === 'netease' && !song.backgroundColor)) {
                return await getSongDetail(song);
              }
              return song;
            } catch (error) {
              console.error('获取歌曲详情失败:', error);
              return song;
            }
          })
        );

        const nextSong = detailedSongs[0];
        if (nextSong && !(nextSong.lyric && nextSong.lyric.lrcTimeArray.length > 0)) {
          try {
            const { useLyrics } = await import('@/hooks/usePlayerHooks');
            const { loadLrc } = useLyrics();
            nextSong.lyric = await loadLrc(nextSong.id);
          } catch (error) {
            console.error('加载歌词失败:', error);
          }
        }

        detailedSongs.forEach((song, index) => {
          if (song && startIndex + index < playList.value.length) {
            playList.value[startIndex + index] = song;
          }
        });
        // 触发 shallowRef 响应式更新（直接修改元素不会自动触发）
        triggerRef(playList);

        // 预加载下一首歌曲的音频和封面
        if (nextSong) {
          if (nextSong.playMusicUrl) {
            preloadService.load(nextSong);
          }
          if (nextSong.picUrl) {
            preloadCoverImage(nextSong.picUrl, getImgUrl);
          }
        }
      } catch (error) {
        console.error('获取歌曲列表失败:', error);
      }
    };

    /**
     * 智能预加载下一首歌曲
     */
    const preloadNextSongs = (currentIndex: number) => {
      if (playList.value.length <= 1) return;

      let nextIndex: number;

      if (playMode.value === 0) {
        // 顺序播放模式
        if (currentIndex >= playList.value.length - 1) {
          return;
        }
        nextIndex = currentIndex + 1;
      } else {
        // 循环播放和随机播放模式
        nextIndex = (currentIndex + 1) % playList.value.length;
      }

      const endIndex = Math.min(nextIndex + 2, playList.value.length);

      if (nextIndex < playList.value.length) {
        fetchSongs(nextIndex, endIndex);

        // 循环模式且接近列表末尾，预加载列表开头
        if (
          (playMode.value === 1 || playMode.value === 2) &&
          nextIndex + 1 >= playList.value.length &&
          playList.value.length > 2
        ) {
          setTimeout(() => {
            fetchSongs(0, 1);
          }, 1000);
        }
      }
    };

    /**
     * 应用随机播放
     */
    const shufflePlayList = () => {
      console.log('[PlaylistStore] shufflePlayList called');
      if (playList.value.length === 0) return;

      // 保存原始列表
      if (originalPlayList.value.length === 0) {
        console.log('[PlaylistStore] Saving original list, length:', playList.value.length);
        originalPlayList.value = [...playList.value];
      }

      const currentSong = playList.value[playListIndex.value];
      console.log('[PlaylistStore] Current song before shuffle:', currentSong?.name);

      // 执行洗牌
      const shuffled = performShuffle([...playList.value], currentSong);
      // 确保触发 shallowRef 的响应式
      playList.value = [...shuffled];
      playListIndex.value = 0;

      console.log('[PlaylistStore] List shuffled, new length:', playList.value.length);
      console.log('[PlaylistStore] New first song:', playList.value[0]?.name);
    };

    /**
     * 恢复原始播放列表顺序
     */
    const restoreOriginalOrder = () => {
      console.log('[PlaylistStore] restoreOriginalOrder called');
      if (originalPlayList.value.length === 0) return;

      const currentSong = playList.value[playListIndex.value];
      console.log('[PlaylistStore] Current song before restore:', currentSong?.name);

      playList.value = [...originalPlayList.value];
      originalPlayList.value = [];

      // 找到当前歌曲在原始列表中的索引
      if (currentSong) {
        const index = playList.value.findIndex((s) => s.id === currentSong.id);
        if (index !== -1) {
          playListIndex.value = index;
        }
      }
      console.log('[PlaylistStore] Original order restored, new index:', playListIndex.value);
    };

    /**
     * 设置播放列表
     */
    const setPlayList = (
      list: SongResult[],
      keepIndex: boolean = false,
      fromIntelligenceMode: boolean = false
    ) => {
      // 如果不是从心动模式调用，清除心动模式状态并切换播放模式
      if (!fromIntelligenceMode) {
        const intelligenceStore = useIntelligenceModeStore();
        console.log('[PlaylistStore.setPlayList] 检查心动模式状态:', {
          isIntelligenceMode: intelligenceStore.isIntelligenceMode,
          currentPlayMode: playMode.value,
          fromIntelligenceMode
        });

        if (intelligenceStore.isIntelligenceMode) {
          console.log('[PlaylistStore] 退出心动模式，切换播放模式为顺序播放');
          playMode.value = 0;
          // 清除心动模式状态
          intelligenceStore.clearIntelligenceMode(true);
          console.log('[PlaylistStore] 心动模式已退出，新的播放模式:', playMode.value);
        }
      }

      // 当新播放列表长度>1时，清除FM模式标志（FM播放列表只有1首）
      if (list.length > 1) {
        const playerCore = usePlayerCoreStore();
        playerCore.isFmPlaying = false;
      }

      if (list.length === 0) {
        playList.value = [];
        playListIndex.value = 0;
        originalPlayList.value = [];
        return;
      }

      const playerCore = usePlayerCoreStore();
      const { playMusic } = storeToRefs(playerCore);

      // 根据当前播放模式处理新的播放列表
      if (playMode.value === 2) {
        // 随机模式
        console.log('随机模式下设置新播放列表，保存原始顺序并洗牌');

        originalPlayList.value = [...list];

        const currentSong = playMusic.value;
        const shuffledList = performShuffle(list, currentSong);

        if (currentSong && currentSong.id) {
          const currentSongIndex = shuffledList.findIndex((song) => song.id === currentSong.id);
          playListIndex.value =
            currentSongIndex !== -1 ? 0 : keepIndex ? Math.max(0, playListIndex.value) : 0;
        } else {
          playListIndex.value = keepIndex ? Math.max(0, playListIndex.value) : 0;
        }

        playList.value = shuffledList;
      } else {
        console.log('顺序/循环模式下设置新播放列表');
        if (originalPlayList.value.length > 0) {
          originalPlayList.value = [];
        }

        if (!keepIndex) {
          const foundIndex = list.findIndex((item) => item.id === playMusic.value.id);
          playListIndex.value = foundIndex !== -1 ? foundIndex : 0;
        }

        playList.value = list;
      }
      // pinia-plugin-persistedstate 会自动保存状态
    };

    /**
     * 添加到下一首播放
     */
    const addToNextPlay = (song: SongResult) => {
      const list = [...playList.value];
      const currentIndex = playListIndex.value;

      // 如果歌曲已在播放列表中，先移除
      const existingIndex = list.findIndex((item) => item.id === song.id);
      if (existingIndex !== -1) {
        list.splice(existingIndex, 1);
        if (existingIndex <= currentIndex) {
          playListIndex.value = Math.max(0, playListIndex.value - 1);
        }
      }

      // 插入到当前播放歌曲的下一个位置
      const insertIndex = playListIndex.value + 1;
      list.splice(insertIndex, 0, song);

      setPlayList(list, true);
    };

    /**
     * 从播放列表移除歌曲
     */
    const removeFromPlayList = (id: number | string) => {
      const index = playList.value.findIndex((item) => item.id === id);
      if (index === -1) return;

      const playerCore = usePlayerCoreStore();
      const { playMusic } = storeToRefs(playerCore);

      // 如果删除的是当前播放的歌曲，先切换到下一首
      if (id === playMusic.value.id) {
        nextPlay();
      }

      const newPlayList = [...playList.value];
      newPlayList.splice(index, 1);
      setPlayList(newPlayList);
    };

    /**
     * 清空播放列表
     */
    const clearPlayAll = async () => {
      const { audioService } = await import('@/services/audioService');
      const playerCore = usePlayerCoreStore();

      audioService.pause();
      setTimeout(() => {
        playerCore.playMusic = {} as SongResult;
        playerCore.playMusicUrl = '';
        playList.value = [];
        playListIndex.value = 0;
        originalPlayList.value = [];
        // 只清除 playerCore 的 localStorage（这些由 playerCore store 管理）
        localStorage.removeItem('currentPlayMusic');
        localStorage.removeItem('currentPlayMusicUrl');
        // playlist 状态由 pinia-plugin-persistedstate 自动管理
      }, 500);
    };

    /**
     * 切换播放模式
     */
    const togglePlayMode = async () => {
      const wasRandom = playMode.value === 2;
      const wasIntelligence = playMode.value === 3;

      // 心动模式(3)不参与循环切换，仅通过 SearchBar 入口进入
      // 如果当前是心动模式，切换回顺序播放
      const newMode = wasIntelligence ? 0 : (playMode.value + 1) % 3;

      const isRandom = newMode === 2;

      console.log(`[PlaylistStore] togglePlayMode: ${playMode.value} -> ${newMode}`);
      playMode.value = newMode;

      // 切换到随机模式时洗牌
      if (isRandom && !wasRandom && playList.value.length > 0) {
        shufflePlayList();
        console.log('切换到随机模式，洗牌播放列表');
      }

      // 从随机模式切换出去时恢复原始顺序
      if (!isRandom && wasRandom) {
        restoreOriginalOrder();
        console.log('切换出随机模式，恢复原始顺序');
      }

      // 从心动模式切换出去
      if (wasIntelligence) {
        console.log('退出心动模式');
        const intelligenceStore = useIntelligenceModeStore();
        intelligenceStore.clearIntelligenceMode(true);
      }
    };

    let nextPlayRetryTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelRetryTimer = () => {
      if (nextPlayRetryTimer) {
        clearTimeout(nextPlayRetryTimer);
        nextPlayRetryTimer = null;
      }
    };

    const _nextPlay = async (retryCount: number = 0, autoEnd: boolean = false) => {
      try {
        if (playList.value.length === 0) return;

        // User-initiated (retryCount=0): reset state
        if (retryCount === 0) {
          cancelRetryTimer();
          consecutiveFailCount.value = 0;
        }

        const playerCore = usePlayerCoreStore();
        const sleepTimerStore = useSleepTimerStore();

        if (consecutiveFailCount.value >= MAX_CONSECUTIVE_FAILS) {
          console.error(`[nextPlay] 连续${MAX_CONSECUTIVE_FAILS}首播放失败，停止`);
          getMessage().warning(i18n.global.t('player.consecutiveFailsError'));
          consecutiveFailCount.value = 0;
          playerCore.setIsPlay(false);
          return;
        }

        // Sequential mode: at the last song
        if (playMode.value === 0 && playListIndex.value >= playList.value.length - 1) {
          if (autoEnd) {
            // 歌曲自然播放结束：停止播放
            console.log('[nextPlay] 顺序播放：最后一首播放完毕，停止');
            if (sleepTimerStore.sleepTimer.type === 'end') {
              sleepTimerStore.stopPlayback();
            }
            getMessage().info(i18n.global.t('player.playListEnded'));
            playerCore.setIsPlay(false);
            const { audioService } = await import('@/services/audioService');
            audioService.pause();
          } else {
            // 用户手动点击下一首：保持当前播放，只提示
            console.log('[nextPlay] 顺序播放：已是最后一首，保持当前播放');
            getMessage().info(i18n.global.t('player.playListEnded'));
          }
          return;
        }

        const nowPlayListIndex = (playListIndex.value + 1) % playList.value.length;
        const nextSong = { ...playList.value[nowPlayListIndex] };

        // Force refresh URL on retry
        if (retryCount > 0 && !nextSong.playMusicUrl?.startsWith('local://')) {
          nextSong.playMusicUrl = undefined;
          nextSong.expiredAt = undefined;
        }

        console.log(
          `[nextPlay] ${nextSong.name}, 索引: ${playListIndex.value} -> ${nowPlayListIndex}, 重试: ${retryCount}/1`
        );

        const { playTrack } = await import('@/services/playbackController');
        const success = await playTrack(nextSong, true);

        // Check if we were superseded by a newer operation
        if (playerCore.playMusic.id !== nextSong.id) {
          console.log('[nextPlay] 被新操作取代，静默退出');
          return;
        }

        if (success) {
          consecutiveFailCount.value = 0;
          playListIndex.value = nowPlayListIndex;
          console.log(`[nextPlay] 播放成功，索引: ${nowPlayListIndex}`);
          sleepTimerStore.handleSongChange();
        } else {
          // Retry once, then skip to next
          if (retryCount < 1) {
            console.log(`[nextPlay] 播放失败，1秒后重试`);
            nextPlayRetryTimer = setTimeout(() => {
              nextPlayRetryTimer = null;
              _nextPlay(retryCount + 1);
            }, 1000);
          } else {
            consecutiveFailCount.value++;
            console.log(
              `[nextPlay] 重试用尽，连续失败: ${consecutiveFailCount.value}/${MAX_CONSECUTIVE_FAILS}`
            );
            if (playList.value.length > 1) {
              playListIndex.value = nowPlayListIndex;
              getMessage().warning(i18n.global.t('player.parseFailedPlayNext'));
              nextPlayRetryTimer = setTimeout(() => {
                nextPlayRetryTimer = null;
                _nextPlay(0);
              }, 500);
            } else {
              getMessage().error(i18n.global.t('player.playFailed'));
              playerCore.setIsPlay(false);
            }
          }
        }
      } catch (error) {
        console.error('切换下一首出错:', error);
      }
    };

    const nextPlay = useThrottleFn(_nextPlay, 500);

    /** 歌曲自然播放结束时调用，顺序模式最后一首会停止 */
    const nextPlayOnEnd = () => {
      _nextPlay(0, true);
    };

    const _prevPlay = async () => {
      try {
        if (playList.value.length === 0) return;

        cancelRetryTimer();
        const playerCore = usePlayerCoreStore();
        const nowPlayListIndex =
          (playListIndex.value - 1 + playList.value.length) % playList.value.length;
        const prevSong = { ...playList.value[nowPlayListIndex] };

        console.log(
          `[prevPlay] ${prevSong.name}, 索引: ${playListIndex.value} -> ${nowPlayListIndex}`
        );

        const { playTrack } = await import('@/services/playbackController');
        const success = await playTrack(prevSong);

        if (success) {
          playListIndex.value = nowPlayListIndex;
          console.log(`[prevPlay] 播放成功，索引: ${nowPlayListIndex}`);
        } else if (playerCore.playMusic.id === prevSong.id) {
          // Only show error if not superseded
          playerCore.setIsPlay(false);
          getMessage().error(i18n.global.t('player.playFailed'));
        }
      } catch (error) {
        console.error('切换上一首出错:', error);
      }
    };

    const prevPlay = useThrottleFn(_prevPlay, 500);

    /**
     * 设置播放列表抽屉显示状态
     */
    const setPlayListDrawerVisible = (value: boolean) => {
      playListDrawerVisible.value = value;
    };

    const setPlay = async (song: SongResult) => {
      try {
        const playerCore = usePlayerCoreStore();

        // Check URL expiration
        if (song.expiredAt && song.expiredAt < Date.now()) {
          if (!song.playMusicUrl?.startsWith('local://')) {
            console.info(`歌曲URL已过期，重新获取: ${song.name}`);
            song.playMusicUrl = undefined;
            song.expiredAt = undefined;
          }
        }

        // Toggle play/pause for current song
        if (
          playerCore.playMusic.id === song.id &&
          playerCore.playMusic.playMusicUrl === song.playMusicUrl
        ) {
          if (playerCore.play) {
            playerCore.setPlayMusic(false);
            const { audioService } = await import('@/services/audioService');
            audioService.getCurrentSound()?.pause();
            playerCore.userPlayIntent = false;
          } else {
            playerCore.setPlayMusic(true);
            playerCore.userPlayIntent = true;
            const { audioService } = await import('@/services/audioService');
            const sound = audioService.getCurrentSound();
            if (sound) {
              sound.play();
            } else {
              // No audio instance, rebuild via playTrack
              const { playTrack } = await import('@/services/playbackController');
              const recoverSong = {
                ...playerCore.playMusic,
                isFirstPlay: true,
                playMusicUrl: playerCore.playMusic.playMusicUrl?.startsWith('local://')
                  ? playerCore.playMusic.playMusicUrl
                  : undefined
              };
              const recovered = await playTrack(recoverSong, true);
              if (!recovered) {
                playerCore.setIsPlay(false);
                getMessage().error(i18n.global.t('player.playFailed'));
              }
            }
          }
          return;
        }

        if (song.isFirstPlay) song.isFirstPlay = false;

        // Update playlist index
        const songIndex = playList.value.findIndex(
          (item: SongResult) => item.id === song.id && item.source === song.source
        );
        if (songIndex !== -1 && songIndex !== playListIndex.value) {
          console.log('歌曲索引不匹配，更新为:', songIndex);
          playListIndex.value = songIndex;
        }

        const { playTrack } = await import('@/services/playbackController');
        const success = await playTrack(song);

        if (success) {
          playerCore.isPlay = true;
          if (songIndex !== -1) {
            setTimeout(() => preloadNextSongs(playListIndex.value), 3000);
          }
        }
        return success;
      } catch (error) {
        console.error('设置播放失败:', error);
        return false;
      }
    };

    /**
     * 初始化播放列表
     * 注意：状态已由 pinia-plugin-persistedstate 自动恢复
     * 这里只需要处理特殊逻辑（如随机模式的恢复）
     */
    const initializePlaylist = async () => {
      // 重启后恢复随机播放状态
      if (playMode.value === 2 && playList.value.length > 0) {
        if (originalPlayList.value.length === 0) {
          console.log('重启后恢复随机播放模式，重新洗牌播放列表');
          shufflePlayList();
        } else {
          console.log('重启后恢复随机播放模式，播放列表已是洗牌状态');
        }
      }
    };

    return {
      // 状态
      playList,
      playListIndex,
      playMode,
      originalPlayList,
      playListDrawerVisible,

      // Computed
      currentPlayList,
      currentPlayListIndex,

      // Actions
      setPlayList,
      addToNextPlay,
      removeFromPlayList,
      clearPlayAll,
      togglePlayMode,
      shufflePlayList,
      restoreOriginalOrder,
      preloadNextSongs,
      nextPlay: nextPlay as unknown as typeof _nextPlay,
      nextPlayOnEnd,
      prevPlay: prevPlay as unknown as typeof _prevPlay,
      setPlayListDrawerVisible,
      setPlay,
      initializePlaylist,
      fetchSongs,
      updateSong: (song: SongResult) => {
        const index = playList.value.findIndex(
          (item) => item.id === song.id && item.source === song.source
        );
        if (index !== -1) {
          playList.value[index] = song;
          // 触发响应式更新
          playList.value = [...playList.value];
        }
      }
    };
  },
  {
    // 配置 pinia-plugin-persistedstate（精简序列化 + 防抖写入）
    persist: {
      key: 'playlist-store',
      storage: debouncedLocalStorage,
      pick: ['playList', 'playListIndex', 'playMode', 'originalPlayList'],
      serializer: {
        serialize: (state: any) => {
          return JSON.stringify({
            ...state,
            playList: minifySongList(state.playList),
            originalPlayList: minifySongList(state.originalPlayList)
          });
        },
        deserialize: JSON.parse
      }
    }
  }
);
