import { createDiscreteApi } from 'naive-ui';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, shallowRef, triggerRef } from 'vue';

import i18n from '@/../i18n/renderer';
import { useSongDetail } from '@/hooks/usePlayerHooks';
import { audioService } from '@/services/audioService';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import { preloadService } from '@/services/preloadService';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { debouncedLocalStorage } from '@/utils/debouncedStorage';
import { minifySongList } from '@/utils/persistedSong';
import { performShuffle, preloadCoverImage } from '@/utils/playerUtils';

import { useIntelligenceModeStore } from './intelligenceMode';
import { usePlayerCoreStore } from './playerCore';
import { useSettingsStore } from './settings';
import { useSleepTimerStore } from './sleepTimer';

// 延迟初始化 message，避免 chunk 循环依赖导致 TDZ 错误
let _message: ReturnType<typeof createDiscreteApi>['message'] | null = null;
const getMessage = () => {
  if (!_message) _message = createDiscreteApi(['message']).message;
  return _message;
};

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
    let navigationGeneration = 0;
    let nextPlayRetryTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelRetryTimer = (): void => {
      if (nextPlayRetryTimer) clearTimeout(nextPlayRetryTimer);
      nextPlayRetryTimer = null;
    };

    // ==================== Computed ====================
    const currentPlayList = computed(() => playList.value);
    const currentPlayListIndex = computed(() => playListIndex.value);

    // ==================== Actions ====================

    /**
     * 获取歌曲详情并预加载
     */
    const fetchSongs = async (startIndex: number, endIndex: number) => {
      try {
        const targetList = playList.value;
        const firstIndex = Math.max(0, startIndex);
        const songs = targetList.slice(firstIndex, Math.min(endIndex, targetList.length));
        const { getSongDetail } = useSongDetail();

        const detailedSongs = await Promise.all(
          songs.map(async (song: SongResult) => {
            try {
              if (!song.playMusicUrl || (song.source === 'netease' && !song.backgroundColor)) {
                return await getSongDetail({ ...song });
              }
              return song;
            } catch (error) {
              console.error('获取歌曲详情失败:', error);
              return song;
            }
          })
        );
        if (playList.value !== targetList) return;

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

        // 预热下一首的背景色：切歌时 playTrack 的元数据加载可直接缓存命中，
        // 全屏页封面/背景色与音频同步就绪，不再"先响歌、后换背景"
        if (nextSong?.picUrl && !(nextSong.backgroundColor && nextSong.primaryColor)) {
          try {
            const { getImageLinearBackground } = await import('@/utils/linearColor');
            const { backgroundColor, primaryColor } = await getImageLinearBackground(
              getImgUrl(nextSong.picUrl, '30y30')
            );
            nextSong.backgroundColor = backgroundColor;
            nextSong.primaryColor = primaryColor;
          } catch (error) {
            console.warn('预热背景色失败:', error);
          }
        }

        // 等待详情/歌词期间可能已换了队列，旧结果不能按下标覆盖新队列。
        if (playList.value !== targetList) return;
        detailedSongs.forEach((song, index) => {
          if (song && targetList[firstIndex + index] === songs[index]) {
            targetList[firstIndex + index] = song;
          }
        });
        // 触发 shallowRef 响应式更新（直接修改元素不会自动触发）
        triggerRef(playList);

        // 预加载下一首歌曲的音频和封面
        if (nextSong) {
          if (nextSong.playMusicUrl) {
            // 预加载失败（URL 验证不过）不应影响主流程，捕获避免未处理的 Promise rejection
            preloadService.load(nextSong).catch((err) => {
              console.warn('预加载下一首失败:', err);
            });
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
     * 短去抖：快速连续切歌时只保留最后一次，避免对音源 API 的请求风暴
     */
    let preloadDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const preloadNextSongs = (currentIndex: number) => {
      if (preloadDebounceTimer) clearTimeout(preloadDebounceTimer);
      const list = playList.value;
      preloadDebounceTimer = setTimeout(() => {
        preloadDebounceTimer = null;
        if (list !== playList.value || currentIndex !== playListIndex.value) return;
        doPreloadNextSongs(currentIndex);
      }, 800);
    };

    const doPreloadNextSongs = (currentIndex: number) => {
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

      // 预加载下一首和下下首（最多2首）
      const endIndex = Math.min(nextIndex + 2, playList.value.length);

      if (nextIndex < playList.value.length) {
        // 立即执行预加载
        fetchSongs(nextIndex, endIndex);

        // 循环模式且接近列表末尾，预加载列表开头
        if (
          (playMode.value === 1 || playMode.value === 2) &&
          nextIndex + 1 >= playList.value.length &&
          playList.value.length > 2
        ) {
          // 立即预加载，不等待
          fetchSongs(0, 1);
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
      fromIntelligenceMode: boolean = false,
      // preserveOrder=true 表示"就地编辑当前队列"（下一首播放/移除单曲），
      // 此时即使处于随机模式也不应重新洗牌，保持调用方给定的顺序。
      preserveOrder: boolean = false
    ) => {
      navigationGeneration++;
      cancelRetryTimer();
      if (preloadDebounceTimer) clearTimeout(preloadDebounceTimer);
      preloadDebounceTimer = null;
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

      // FM 入口会在设置完单曲队列后显式重新开启，普通单曲队列也应退出 FM。
      usePlayerCoreStore().isFmPlaying = false;

      if (list.length === 0) {
        playList.value = [];
        playListIndex.value = 0;
        originalPlayList.value = [];
        return;
      }

      const playerCore = usePlayerCoreStore();
      const { playMusic } = storeToRefs(playerCore);

      if (preserveOrder) {
        // 就地编辑当前队列（下一首播放 / 移除单曲）：保留调用方给定的顺序，不重新洗牌。
        console.log('就地编辑播放列表，保持给定顺序');

        if (playMode.value === 2) {
          // 随机模式下同步原始顺序列表：删除已移除项、追加新加入项，保留既有原始顺序
          const idSet = new Set(list.map((song) => song.id));
          const reconciled = originalPlayList.value.filter((song) => idSet.has(song.id));
          const existingIds = new Set(reconciled.map((song) => song.id));
          for (const song of list) {
            if (!existingIds.has(song.id)) {
              reconciled.push(song);
            }
          }
          originalPlayList.value = reconciled;
        } else if (originalPlayList.value.length > 0) {
          originalPlayList.value = [];
        }

        // 修正当前索引，指向当前正在播放的歌曲
        const currentSong = playMusic.value;
        const currentIndex =
          currentSong && currentSong.id ? list.findIndex((song) => song.id === currentSong.id) : -1;
        playListIndex.value =
          currentIndex !== -1
            ? currentIndex
            : Math.min(Math.max(0, playListIndex.value), list.length - 1);

        playList.value = [...list];
      } else if (playMode.value === 2) {
        // 随机模式：全新列表，保存原始顺序并洗牌
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

        playList.value = [...list];
      }
      playListIndex.value = Math.min(Math.max(0, playListIndex.value), playList.value.length - 1);
      // pinia-plugin-persistedstate 会自动保存状态
    };

    /**
     * 添加到下一首播放
     */
    const addToNextPlay = (song: SongResult) => {
      const list = [...playList.value];
      const currentIndex = playListIndex.value;
      if (list[currentIndex]?.id === song.id) return;

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

      // preserveOrder=true：随机模式下也不重新洗牌，确保"下一首播放"位置生效
      setPlayList(list, true, false, true);
    };

    /**
     * 单曲播放前准备队列，返回是否替换了列表；实际播放仍由歌曲组件统一触发。
     */
    const prepareSongPlayback = (song: SongResult, context: SongResult[] = []): boolean => {
      const playerCore = usePlayerCoreStore();
      const matchesSong = (item: SongResult): boolean =>
        item.id === song.id && (item.source ?? 'netease') === (song.source ?? 'netease');
      const existingIndex = playList.value.findIndex(matchesSong);

      // 当前歌曲的播放/暂停不应丢弃用户已经编辑过的队列。
      if (
        existingIndex !== -1 &&
        !playerCore.isFmPlaying &&
        matchesSong(playerCore.playMusic) &&
        (!song.playMusicUrl || song.playMusicUrl === playerCore.playMusic.playMusicUrl)
      ) {
        return false;
      }

      const settingsStore = useSettingsStore();
      playerCore.isFmPlaying = false;
      const replaceContext =
        settingsStore.setData.singleSongPlayMode !== 'add' && context.some(matchesSong);
      if (replaceContext) {
        setPlayList([...context]);
      } else if (existingIndex === -1) {
        addToNextPlay(song);
      } else {
        setPlayList([...playList.value], true, false, true);
      }

      playListIndex.value = Math.max(0, playList.value.findIndex(matchesSong));
      return replaceContext;
    };

    /**
     * 从播放列表移除歌曲
     */
    const removeFromPlayList = (id: number | string) => {
      const index = playList.value.findIndex((item) => item.id === id);
      if (index === -1) return;

      const playerCore = usePlayerCoreStore();
      const { playMusic } = storeToRefs(playerCore);

      const isCurrent = id === playMusic.value.id;
      const shouldPlay = playerCore.userPlayIntent || playerCore.play;
      const newPlayList = [...playList.value];
      newPlayList.splice(index, 1);
      if (isCurrent && newPlayList.length === 0) {
        clearPlayAll();
        return;
      }
      // preserveOrder=true：随机模式下移除单曲不重新洗牌，仅从队列中删除
      setPlayList(newPlayList, false, false, true);
      if (isCurrent) {
        playerCore.handlePause();
        playListIndex.value = Math.min(index, newPlayList.length - 1);
        void playAtIndex(playListIndex.value, shouldPlay, false);
      }
    };

    /**
     * 清空播放列表
     */
    const clearPlayAll = (): void => {
      const playerCore = usePlayerCoreStore();
      playerCore.handlePause();
      audioService.stop();
      playerCore.playMusic = {} as SongResult;
      playerCore.playMusicUrl = '';
      setPlayList([]);
      consecutiveFailCount.value = 0;
      preloadService.clearAll();
      try {
        localStorage.removeItem('currentPlayMusic');
        localStorage.removeItem('currentPlayMusicUrl');
        localStorage.removeItem('playProgress');
      } catch (error) {
        console.warn('清理播放进度失败:', error);
      }
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

    /**
     * 私人FM：拉取下一首并播放（FM 列表始终只保留当前一首）
     */
    const _nextFmPlay = async () => {
      const playerCore = usePlayerCoreStore();
      const operation = ++navigationGeneration;
      playerCore.handlePause();
      const gen = playbackRequestManager.getGeneration();
      const isCurrent = () =>
        operation === navigationGeneration && gen === playbackRequestManager.getGeneration();
      try {
        const { getPersonalFM } = await import('@/api/home');
        if (!isCurrent()) return;
        const res = await getPersonalFM();
        if (!isCurrent()) return;
        const songs = res.data?.data;
        if (!Array.isArray(songs) || songs.length === 0) {
          playerCore.setIsPlay(false);
          return;
        }
        const song = songs[0];
        const fmSong = {
          id: song.id,
          name: song.name,
          picUrl: song.al?.picUrl || song.album?.picUrl,
          ar: song.artists || song.ar,
          al: song.al || song.album,
          source: 'netease' as const,
          song,
          ...song,
          playLoading: false
        } as any;
        setPlayList([fmSong], false, false);
        playerCore.isFmPlaying = true;
        await playAtIndex(0, true, false);
      } catch (error) {
        console.error('FM切换下一首失败:', error);
        if (isCurrent()) playerCore.handlePause();
      }
    };

    const playAtIndex = async (
      index: number,
      shouldPlay: boolean = true,
      skipOnFailure: boolean = true
    ): Promise<boolean> => {
      const song = playList.value[index];
      if (!song?.id) return false;
      playListIndex.value = index;
      const operation = ++navigationGeneration;
      playbackRequestManager.cancelCurrentRequest();
      const initialGeneration = playbackRequestManager.getGeneration();
      try {
        const { playTrack, getCurrentGeneration } = await import('@/services/playbackController');
        if (operation !== navigationGeneration || initialGeneration !== getCurrentGeneration())
          return false;
        const playback = playTrack({ ...song }, shouldPlay);
        const generation = getCurrentGeneration();
        const success = await playback;
        if (operation !== navigationGeneration || generation !== getCurrentGeneration())
          return false;
        if (success) {
          consecutiveFailCount.value = 0;
          return true;
        }
        const core = usePlayerCoreStore();
        consecutiveFailCount.value++;
        if (!skipOnFailure || consecutiveFailCount.value >= MAX_CONSECUTIVE_FAILS) {
          if (consecutiveFailCount.value >= MAX_CONSECUTIVE_FAILS) {
            getMessage().warning(i18n.global.t('player.consecutiveFailsError'));
          }
          core.handlePause();
          return false;
        }
        if (playList.value.length > 1) {
          cancelRetryTimer();
          nextPlayRetryTimer = setTimeout(() => {
            nextPlayRetryTimer = null;
            if (operation !== navigationGeneration || generation !== getCurrentGeneration()) return;
            void _nextPlay(false, true);
          }, 500);
        } else {
          core.handlePause();
        }
        return false;
      } catch (error) {
        console.error('切歌失败:', error);
        if (operation === navigationGeneration) usePlayerCoreStore().handlePause();
        return false;
      }
    };

    /**
     * @param autoEnd 是否由歌曲自然播放结束触发
     * @param fromFailover 是否由"播放失败跳歌"链触发。
     *   失败链不能重置 consecutiveFailCount，否则连续失败上限永远不会触发，
     *   全列表都无法播放时会无限跳歌
     */
    const _nextPlay = async (autoEnd: boolean = false, fromFailover: boolean = false) => {
      try {
        const playerCore = usePlayerCoreStore();
        const sleepTimerStore = useSleepTimerStore();
        const isLast = playListIndex.value >= playList.value.length - 1;
        if (autoEnd && sleepTimerStore.handleSongEnd(isLast)) return false;

        // 私人FM模式：忽略 playMode 与列表长度，直接拉取新的 FM 歌曲
        if (playerCore.isFmPlaying) {
          if (!fromFailover) {
            cancelRetryTimer();
            consecutiveFailCount.value = 0;
          }
          await _nextFmPlay();
          return false;
        }

        if (playList.value.length === 0) return false;

        // 用户主动切歌：重置失败状态
        if (!fromFailover) {
          cancelRetryTimer();
          consecutiveFailCount.value = 0;
        }

        if (consecutiveFailCount.value >= MAX_CONSECUTIVE_FAILS) {
          console.error(`[nextPlay] 连续${MAX_CONSECUTIVE_FAILS}首播放失败，停止`);
          getMessage().warning(i18n.global.t('player.consecutiveFailsError'));
          consecutiveFailCount.value = 0;
          playerCore.handlePause();
          return false;
        }

        // Sequential mode: at the last song
        if (playMode.value === 0 && playListIndex.value >= playList.value.length - 1) {
          if (autoEnd || fromFailover) {
            // 歌曲自然播放结束：停止播放
            console.log('[nextPlay] 顺序播放：最后一首播放完毕，停止');
            getMessage().info(i18n.global.t('player.playListEnded'));
            playerCore.handlePause();
          } else {
            // 用户手动点击下一首：保持当前播放，只提示
            console.log('[nextPlay] 顺序播放：已是最后一首，保持当前播放');
            getMessage().info(i18n.global.t('player.playListEnded'));
          }
          return false;
        }

        const index =
          autoEnd && playMode.value === 1
            ? playListIndex.value
            : (playListIndex.value + 1) % playList.value.length;
        return await playAtIndex(index);
      } catch (error) {
        console.error('切换下一首出错:', error);
        return false;
      }
    };

    const nextPlay = _nextPlay;

    /** 歌曲自然播放结束时调用，顺序模式最后一首会停止 */
    const nextPlayOnEnd = () => {
      return _nextPlay(true);
    };

    const _prevPlay = async () => {
      try {
        const playerCore = usePlayerCoreStore();

        // 私人FM模式：FM 不支持回到上一首，与下一曲一致直接拉取新的 FM 歌曲（#682）
        if (playerCore.isFmPlaying) {
          cancelRetryTimer();
          consecutiveFailCount.value = 0;
          await _nextFmPlay();
          return false;
        }

        if (playList.value.length === 0) return false;

        cancelRetryTimer();
        const nowPlayListIndex =
          (playListIndex.value - 1 + playList.value.length) % playList.value.length;
        consecutiveFailCount.value = 0;
        return await playAtIndex(nowPlayListIndex, true, false);
      } catch (error) {
        console.error('切换上一首出错:', error);
        return false;
      }
    };

    const prevPlay = _prevPlay;

    /**
     * 设置播放列表抽屉显示状态
     */
    const setPlayListDrawerVisible = (value: boolean) => {
      playListDrawerVisible.value = value;
    };

    const setPlay = async (song: SongResult): Promise<boolean> => {
      if (!song?.id) return false;
      navigationGeneration++;
      cancelRetryTimer();
      consecutiveFailCount.value = 0;
      try {
        const playerCore = usePlayerCoreStore();

        // Toggle play/pause for current song
        if (
          playerCore.playMusic.id === song.id &&
          (!song.playMusicUrl || playerCore.playMusic.playMusicUrl === song.playMusicUrl)
        ) {
          if (playerCore.userPlayIntent || playerCore.play) {
            playerCore.handlePause();
            return true;
          }
          return await playerCore.setPlayMusic(true);
        }

        // Update playlist index
        const songIndex = playList.value.findIndex((item: SongResult) => item.id === song.id);
        if (songIndex !== -1 && songIndex !== playListIndex.value) {
          console.log('歌曲索引不匹配，更新为:', songIndex);
          playListIndex.value = songIndex;
        }

        return await playerCore.setPlayMusic({ ...song });
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
      prepareSongPlayback,
      addToNextPlay,
      removeFromPlayList,
      clearPlayAll,
      togglePlayMode,
      shufflePlayList,
      restoreOriginalOrder,
      preloadNextSongs,
      nextPlay,
      nextPlayOnEnd,
      prevPlay,
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
