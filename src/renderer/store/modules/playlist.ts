import { useThrottleFn } from '@vueuse/core';
import { createDiscreteApi } from 'naive-ui';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import i18n from '@/../i18n/renderer';
import { useSongDetail } from '@/hooks/usePlayerHooks';
import { preloadService } from '@/services/preloadService';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { performShuffle, preloadCoverImage } from '@/utils/playerUtils';

import { useIntelligenceModeStore } from './intelligenceMode';
import { usePlayerCoreStore } from './playerCore';
import { useSleepTimerStore } from './sleepTimer';

const { message } = createDiscreteApi(['message']);

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
    const SINGLE_TRACK_MAX_RETRIES = 3; // 单曲最大重试次数

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
      const { useUserStore } = await import('./user');
      const userStore = useUserStore();
      const wasRandom = playMode.value === 2;
      const wasIntelligence = playMode.value === 3;

      let newMode = (playMode.value + 1) % 4;

      // 如果要切换到心动模式，但用户未使用cookie登录，则跳过
      if (newMode === 3 && (!userStore.user || userStore.loginType !== 'cookie')) {
        console.log('跳过心动模式：需要cookie登录');
        newMode = 0;
      }

      const isRandom = newMode === 2;
      const isIntelligence = newMode === 3;

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

      // 切换到心动模式
      if (isIntelligence && !wasIntelligence) {
        console.log('切换到心动模式');
        const intelligenceStore = useIntelligenceModeStore();
        await intelligenceStore.playIntelligenceMode();
      }

      // 从心动模式切换出去
      if (!isIntelligence && wasIntelligence) {
        console.log('退出心动模式');
        const intelligenceStore = useIntelligenceModeStore();
        intelligenceStore.clearIntelligenceMode(true);
      }
    };

    /**
     * 下一首
     * @param singleTrackRetryCount 单曲重试次数（同一首歌的重试）
     */
    const _nextPlay = async (singleTrackRetryCount: number = 0) => {
      try {
        if (playList.value.length === 0) {
          return;
        }

        const playerCore = usePlayerCoreStore();
        const sleepTimerStore = useSleepTimerStore();

        // 检查是否超过最大连续失败次数
        if (consecutiveFailCount.value >= MAX_CONSECUTIVE_FAILS) {
          console.error(`[nextPlay] 连续${MAX_CONSECUTIVE_FAILS}首歌曲播放失败，停止播放`);
          message.warning(i18n.global.t('player.consecutiveFailsError'));
          consecutiveFailCount.value = 0; // 重置计数器
          playerCore.setIsPlay(false);
          return;
        }

        // 检查是否是播放列表的最后一首且设置了播放列表结束定时
        if (
          playMode.value === 0 &&
          playListIndex.value === playList.value.length - 1 &&
          sleepTimerStore.sleepTimer.type === 'end'
        ) {
          sleepTimerStore.stopPlayback();
          return;
        }

        const currentIndex = playListIndex.value;
        const nowPlayListIndex = (playListIndex.value + 1) % playList.value.length;
        const nextSong = { ...playList.value[nowPlayListIndex] };

        console.log(
          `[nextPlay] 尝试播放: ${nextSong.name}, 索引: ${currentIndex} -> ${nowPlayListIndex}, 单曲重试: ${singleTrackRetryCount}/${SINGLE_TRACK_MAX_RETRIES}, 连续失败: ${consecutiveFailCount.value}/${MAX_CONSECUTIVE_FAILS}`
        );
        console.log(
          '[nextPlay] Current mode:',
          playMode.value,
          'Playlist length:',
          playList.value.length
        );

        // 先尝试播放歌曲
        const success = await playerCore.handlePlayMusic(nextSong, true);

        if (success) {
          // 播放成功，重置所有计数器并更新索引
          consecutiveFailCount.value = 0;
          playListIndex.value = nowPlayListIndex;
          console.log(`[nextPlay] 播放成功，索引已更新为: ${nowPlayListIndex}`);
          console.log(
            '[nextPlay] New current song in list:',
            playList.value[playListIndex.value]?.name
          );
          sleepTimerStore.handleSongChange();
        } else {
          console.error(`[nextPlay] 播放失败: ${nextSong.name}`);

          // 单曲重试逻辑
          if (singleTrackRetryCount < SINGLE_TRACK_MAX_RETRIES) {
            console.log(
              `[nextPlay] 单曲重试 ${singleTrackRetryCount + 1}/${SINGLE_TRACK_MAX_RETRIES}`
            );
            // 不更新索引，重试同一首歌
            setTimeout(() => {
              _nextPlay(singleTrackRetryCount + 1);
            }, 1000);
          } else {
            // 单曲重试次数用尽，递增连续失败计数，尝试下一首
            consecutiveFailCount.value++;
            console.log(
              `[nextPlay] 单曲重试用尽，连续失败计数: ${consecutiveFailCount.value}/${MAX_CONSECUTIVE_FAILS}`
            );

            if (playList.value.length > 1) {
              // 更新索引到失败的歌曲位置，这样下次递归调用会继续往下
              playListIndex.value = nowPlayListIndex;
              message.warning(i18n.global.t('player.parseFailedPlayNext'));

              // 延迟后尝试下一首（重置单曲重试计数）
              setTimeout(() => {
                _nextPlay(0);
              }, 500);
            } else {
              // 只有一首歌且失败
              message.error(i18n.global.t('player.playFailed'));
              playerCore.setIsPlay(false);
            }
          }
        }
      } catch (error) {
        console.error('切换下一首出错:', error);
      }
    };

    const nextPlay = useThrottleFn(_nextPlay, 500);

    /**
     * 上一首
     */
    const _prevPlay = async () => {
      try {
        if (playList.value.length === 0) {
          return;
        }

        const playerCore = usePlayerCoreStore();
        const currentIndex = playListIndex.value;
        const nowPlayListIndex =
          (playListIndex.value - 1 + playList.value.length) % playList.value.length;

        const prevSong = { ...playList.value[nowPlayListIndex] };

        console.log(
          `[prevPlay] 尝试播放上一首: ${prevSong.name}, 索引: ${currentIndex} -> ${nowPlayListIndex}`
        );

        let success = false;
        let retryCount = 0;
        const maxRetries = 2;

        // 先尝试播放歌曲，成功后再更新索引
        while (!success && retryCount < maxRetries) {
          success = await playerCore.handlePlayMusic(prevSong);

          if (!success) {
            retryCount++;
            console.error(`播放上一首失败，尝试 ${retryCount}/${maxRetries}`);

            if (retryCount >= maxRetries) {
              console.error('多次尝试播放失败，将从播放列表中移除此歌曲');
              const newPlayList = [...playList.value];
              newPlayList.splice(nowPlayListIndex, 1);

              if (newPlayList.length > 0) {
                const keepCurrentIndexPosition = true;
                setPlayList(newPlayList, keepCurrentIndexPosition);

                if (newPlayList.length === 1) {
                  playListIndex.value = 0;
                } else {
                  const newPrevIndex =
                    (playListIndex.value - 1 + newPlayList.length) % newPlayList.length;
                  playListIndex.value = newPrevIndex;
                }

                setTimeout(() => {
                  prevPlay();
                }, 300);
                return;
              } else {
                console.error('播放列表为空，停止尝试');
                break;
              }
            }
          }
        }

        if (success) {
          // 播放成功，更新索引
          playListIndex.value = nowPlayListIndex;
          console.log(`[prevPlay] 播放成功，索引已更新为: ${nowPlayListIndex}`);
        } else {
          console.error(`[prevPlay] 播放上一首失败，保持当前索引: ${currentIndex}`);
          playerCore.setIsPlay(false);
          message.error(i18n.global.t('player.playFailed'));
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

    /**
     * 设置播放（兼容旧API）
     */
    const setPlay = async (song: SongResult) => {
      try {
        const playerCore = usePlayerCoreStore();

        // 检查URL是否已过期
        if (song.expiredAt && song.expiredAt < Date.now()) {
          console.info(`歌曲URL已过期，重新获取: ${song.name}`);
          song.playMusicUrl = undefined;
          song.expiredAt = undefined;
        }

        // 如果是当前正在播放的音乐，则切换播放/暂停状态
        if (
          playerCore.playMusic.id === song.id &&
          playerCore.playMusic.playMusicUrl === song.playMusicUrl &&
          !song.isFirstPlay
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
              // 在恢复播放时也进行状态检测，防止URL已过期导致无声
              playerCore.checkPlaybackState(playerCore.playMusic);
            }
          }
          return;
        }

        if (song.isFirstPlay) {
          song.isFirstPlay = false;
        }

        // 查找歌曲在播放列表中的索引
        const songIndex = playList.value.findIndex(
          (item: SongResult) => item.id === song.id && item.source === song.source
        );

        // 更新播放索引
        if (songIndex !== -1 && songIndex !== playListIndex.value) {
          console.log('歌曲索引不匹配，更新为:', songIndex);
          playListIndex.value = songIndex;
        }

        const success = await playerCore.handlePlayMusic(song);

        // playerCore 的状态由其自己的 store 管理

        if (success) {
          playerCore.isPlay = true;

          // 预加载下一首歌曲
          if (songIndex !== -1) {
            setTimeout(() => {
              preloadNextSongs(playListIndex.value);
            }, 3000);
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
    // 配置 pinia-plugin-persistedstate
    persist: {
      key: 'playlist-store',
      storage: localStorage,
      // 持久化所有状态，除了 playListDrawerVisible（UI 状态不需要持久化）
      pick: ['playList', 'playListIndex', 'playMode', 'originalPlayList']
    }
  }
);
