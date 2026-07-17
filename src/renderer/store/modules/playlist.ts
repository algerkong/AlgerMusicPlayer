import { useThrottleFn } from '@vueuse/core';
import { createDiscreteApi } from 'naive-ui';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import i18n from '@/../i18n/renderer';
import { useSongDetail } from '@/hooks/usePlayerHooks';
import { audioService } from '@/services/audioService';
import { preloadService } from '@/services/preloadService';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { debouncedLocalStorage } from '@/utils/debouncedStorage';
import { minifySongList } from '@/utils/persistedSong';
import { performShuffle, preloadCoverImage, sameTrackId } from '@/utils/playerUtils';
import {
  normalizeSongResult,
  playableToSongResult,
  songResultToPlayable
} from '@/utils/trackBridge';

import type { PlayableTrack, Track } from '../../../shared/domain/track';
import { usePlayerCoreStore } from './playerCore';
import { normalizePlayMode } from './playlistPlayMode';

// 延迟初始化 message，避免 chunk 循环依赖导致 TDZ 错误
let _message: ReturnType<typeof createDiscreteApi>['message'] | null = null;
const getMessage = () => {
  if (!_message) _message = createDiscreteApi(['message']).message;
  return _message;
};

/**
 * 播放列表管理 Store（P3：内部分层 PlayableTrack）
 *
 * - 兼容壳 `playList`：SongResult[]，UI / 持久化 / 旧调用方不变
 * - 领域镜像 `playablePlayList`：与壳同步的 PlayableTrack[]
 * - 写列表请走 setPlayList / replaceEntryAt / patchSongMeta，勿只改壳
 */
export const usePlaylistStore = defineStore(
  'playlist',
  () => {
    // ==================== 状态 ====================
    // 状态将由 pinia-plugin-persistedstate 自动从 localStorage 恢复
    const playList = shallowRef<SongResult[]>([]);
    /** P3 领域镜像（不持久化；由壳重建） */
    const playablePlayList = shallowRef<PlayableTrack[]>([]);
    const playListIndex = ref(0);
    const playMode = ref(0);
    const originalPlayList = shallowRef<SongResult[]>([]);
    const playableOriginalPlayList = shallowRef<PlayableTrack[]>([]);
    const playListDrawerVisible = ref(false);

    // 连续失败计数器（用于防止无限循环）
    const consecutiveFailCount = ref(0);
    const MAX_CONSECUTIVE_FAILS = 5; // 最大连续失败次数

    // ==================== P3 同步写口 ====================

    const toSongs = (list: SongResult[]) => list.map((s) => normalizeSongResult(s));

    const commitPlayList = (songs: SongResult[], alreadyNormalized = false) => {
      const list = alreadyNormalized ? songs : toSongs(songs);
      playList.value = list;
      playablePlayList.value = list.map((s) => songResultToPlayable(s));
    };

    const commitOriginalPlayList = (songs: SongResult[], alreadyNormalized = false) => {
      const list = alreadyNormalized ? songs : toSongs(songs);
      originalPlayList.value = list;
      playableOriginalPlayList.value = list.map((s) => songResultToPlayable(s));
    };

    const clearAllLists = () => {
      playList.value = [];
      playablePlayList.value = [];
      originalPlayList.value = [];
      playableOriginalPlayList.value = [];
      playListIndex.value = 0;
    };

    /** 替换单条（fetchSongs / patch / updateSong） */
    const replaceEntryAt = (idx: number, song: SongResult) => {
      if (idx < 0 || idx >= playList.value.length) return;
      const n = normalizeSongResult(song);
      const next = playList.value.slice();
      next[idx] = n;
      playList.value = next;
      const pnext = playablePlayList.value.slice();
      if (pnext.length === next.length) {
        pnext[idx] = songResultToPlayable(n);
        playablePlayList.value = pnext;
      } else {
        playablePlayList.value = next.map((s) => songResultToPlayable(s));
      }
    };

    /** 从领域列表写入（API / 测试） */
    const setPlayListFromPlayables = (
      playables: PlayableTrack[],
      keepIndex = false,
      preserveOrder = false
    ) => {
      setPlayList(
        playables.map((p) => playableToSongResult(p)),
        keepIndex,
        preserveOrder
      );
    };

    // ==================== 计算属性 ====================
    const currentPlayList = computed(() => playList.value);
    const currentPlayListIndex = computed(() => playListIndex.value);
    const playListTracks = computed<Track[]>(() => playablePlayList.value.map((p) => p.track));
    const currentPlayableItem = computed(() => playablePlayList.value[playListIndex.value] ?? null);

    // ==================== 操作 ====================

    const fetchSongs = async (startIndex: number, endIndex: number) => {
      try {
        const songs = playList.value.slice(
          Math.max(0, startIndex),
          Math.min(endIndex, playList.value.length)
        );
        const { getSongDetail } = useSongDetail();

        // 只补缺 URL 的曲；不再按网易云 source 特例批量 resolve
        const detailedSongs = await Promise.all(
          songs.map(async (song: SongResult) => {
            try {
              if (!song.playMusicUrl) {
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

        // 预热下一首的背景色：切歌时 playTrack 的元数据加载可直接缓存命中，
        // 全屏页封面/背景色与音频同步就绪，不再"先响歌、后换背景"
        if (nextSong?.picUrl && !(nextSong.backgroundColor && nextSong.primaryColor)) {
          try {
            const { getImageLinearBackground } = await import('@/utils/linearColor');
            const { backgroundColor, primaryColor } = await getImageLinearBackground(
              getImgUrl(nextSong.picUrl, '200y200')
            );
            nextSong.backgroundColor = backgroundColor;
            nextSong.primaryColor = primaryColor;
          } catch (error) {
            console.warn('预热背景色失败:', error);
          }
        }

        detailedSongs.forEach((song, index) => {
          if (song && startIndex + index < playList.value.length) {
            replaceEntryAt(startIndex + index, song);
          }
        });

        // resolve 写回后立刻灌 standby（真缓冲），封面并行
        if (nextSong) {
          if (nextSong.playMusicUrl) {
            try {
              audioService.preload(nextSong.playMusicUrl, nextSong, { priority: 'next' });
            } catch (err) {
              console.warn('预加载下一首失败:', err);
            }
            void preloadService.load(nextSong).catch(() => undefined);
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
     * 短去抖：快速连切只保留最后一次；P2 从 800ms 收到 200ms 提高 promote 命中
     */
    let preloadDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const preloadNextSongs = (currentIndex: number) => {
      // 首包立即预热下一首（缩短 debounce，避免「第一首播完第二首还在 resolve」）
      if (preloadDebounceTimer) clearTimeout(preloadDebounceTimer);
      doPreloadNextSongs(currentIndex);
      // 仍 debounce 一次，合并连切时的重复触发
      preloadDebounceTimer = setTimeout(() => {
        preloadDebounceTimer = null;
        doPreloadNextSongs(currentIndex);
      }, 120);
    };

    const doPreloadNextSongs = (currentIndex: number) => {
      if (playList.value.length <= 1) return;

      const len = playList.value.length;

      // 上一首：双向切歌都预热 resolve
      const prevIndex = (currentIndex - 1 + len) % len;
      if (prevIndex !== currentIndex) {
        void fetchSongs(prevIndex, prevIndex + 1);
      }

      let nextIndex: number;

      if (playMode.value === 0) {
        // 顺序播放模式
        if (currentIndex >= len - 1) {
          return;
        }
        nextIndex = currentIndex + 1;
      } else {
        // 循环播放和随机播放模式
        nextIndex = (currentIndex + 1) % len;
      }

      // 预加载下一首和下下首（最多2首）
      const endIndex = Math.min(nextIndex + 2, len);

      if (nextIndex < len) {
        // 立即执行预加载
        void fetchSongs(nextIndex, endIndex);

        // 循环模式且接近列表末尾，预加载列表开头
        if ((playMode.value === 1 || playMode.value === 2) && nextIndex + 1 >= len && len > 2) {
          // 立即预加载，不等待
          void fetchSongs(0, 1);
        }
      }
    };

    /**
     * 应用随机播放
     */
    const shufflePlayList = () => {
      console.log('[PlaylistStore] shufflePlayList called');
      if (playList.value.length === 0) return;

      if (originalPlayList.value.length === 0) {
        console.log('[PlaylistStore] Saving original list, length:', playList.value.length);
        commitOriginalPlayList([...playList.value], true);
      }

      const currentSong = playList.value[playListIndex.value];
      console.log('[PlaylistStore] Current song before shuffle:', currentSong?.name);

      const shuffled = performShuffle([...playList.value], currentSong);
      commitPlayList([...shuffled], true);
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

      commitPlayList([...originalPlayList.value], true);
      commitOriginalPlayList([], true);

      if (currentSong) {
        const index = playList.value.findIndex((s) => sameTrackId(s.id, currentSong.id));
        if (index !== -1) {
          playListIndex.value = index;
        }
      }
      console.log('[PlaylistStore] Original order restored, new index:', playListIndex.value);
    };

    const setPlayList = (
      list: SongResult[],
      keepIndex: boolean = false,
      // preserveOrder=true 表示"就地编辑当前队列"（下一首播放/移除单曲），
      // 此时即使处于随机模式也不应重新洗牌，保持调用方给定的顺序。
      preserveOrder: boolean = false
    ) => {
      // 当新播放列表长度>1时，清除FM模式标志（FM播放列表只有1首）
      if (list.length > 1) {
        const playerCore = usePlayerCoreStore();
        playerCore.isFmPlaying = false;
      }

      if (list.length === 0) {
        clearAllLists();
        return;
      }

      // 入口归一：镜像字段 ar/artists、duration/dt 对齐
      list = toSongs(list);

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
          commitOriginalPlayList(reconciled, true);
        } else if (originalPlayList.value.length > 0) {
          commitOriginalPlayList([], true);
        }

        // 修正当前索引，指向当前正在播放的歌曲
        const currentSong = playMusic.value;
        const currentIndex =
          currentSong && currentSong.id
            ? list.findIndex((song) => sameTrackId(song.id, currentSong.id))
            : -1;
        playListIndex.value =
          currentIndex !== -1
            ? currentIndex
            : Math.min(Math.max(0, playListIndex.value), list.length - 1);

        commitPlayList(list, true);
      } else if (playMode.value === 2) {
        // 随机模式：全新列表，保存原始顺序并洗牌
        console.log('随机模式下设置新播放列表，保存原始顺序并洗牌');

        commitOriginalPlayList([...list], true);

        const currentSong = playMusic.value;
        const shuffledList = performShuffle(list, currentSong);

        if (currentSong && currentSong.id) {
          const currentSongIndex = shuffledList.findIndex((song) =>
            sameTrackId(song.id, currentSong.id)
          );
          playListIndex.value =
            currentSongIndex !== -1 ? 0 : keepIndex ? Math.max(0, playListIndex.value) : 0;
        } else {
          playListIndex.value = keepIndex ? Math.max(0, playListIndex.value) : 0;
        }

        commitPlayList(shuffledList, true);
      } else {
        console.log('顺序/循环模式下设置新播放列表');
        if (originalPlayList.value.length > 0) {
          commitOriginalPlayList([], true);
        }

        if (!keepIndex) {
          const foundIndex = list.findIndex((item) => sameTrackId(item.id, playMusic.value.id));
          playListIndex.value = foundIndex !== -1 ? foundIndex : 0;
        }

        commitPlayList(list, true);
      }
      // pinia-plugin-persistedstate 会自动保存状态
    };

    const addToNextPlay = (song: SongResult) => {
      const list = [...playList.value];
      const currentIndex = playListIndex.value;

      // 如果歌曲已在播放列表中，先移除
      const existingIndex = list.findIndex((item) => sameTrackId(item.id, song.id));
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
      setPlayList(list, true, true);
    };

    /**
     * 从播放列表移除歌曲
     */
    const removeFromPlayList = (id: number | string) => {
      const index = playList.value.findIndex((item) => sameTrackId(item.id, id));
      if (index === -1) return;

      const playerCore = usePlayerCoreStore();
      const { playMusic } = storeToRefs(playerCore);

      // 如果删除的是当前播放的歌曲，先切换到下一首
      if (sameTrackId(id, playMusic.value.id)) {
        nextPlay();
      }

      const newPlayList = [...playList.value];
      newPlayList.splice(index, 1);
      // preserveOrder=true：随机模式下移除单曲不重新洗牌，仅从队列中删除
      setPlayList(newPlayList, false, true);
    };

    const clearPlayAll = async () => {
      const { audioService } = await import('@/services/audioService');
      const playerCore = usePlayerCoreStore();

      audioService.pause();
      setTimeout(() => {
        playerCore.setCurrentSong(null);
        playerCore.playMusicUrl = '';
        clearAllLists();
        // 只清除 playerCore 的 localStorage（这些由 playerCore store 管理）
        localStorage.removeItem('currentPlayMusic');
        localStorage.removeItem('currentPlayMusicUrl');
        // playlist 状态由 pinia-plugin-persistedstate 自动管理
      }, 500);
    };

    const togglePlayMode = async () => {
      const wasRandom = playMode.value === 2;
      // 0 顺序 / 1 循环 / 2 随机
      const newMode = (playMode.value + 1) % 3;
      const isRandom = newMode === 2;

      console.log(`[PlaylistStore] togglePlayMode: ${playMode.value} -> ${newMode}`);
      playMode.value = newMode;

      if (isRandom && !wasRandom && playList.value.length > 0) {
        shufflePlayList();
        console.log('切换到随机模式，洗牌播放列表');
      }

      if (!isRandom && wasRandom) {
        restoreOriginalOrder();
        console.log('切换出随机模式，恢复原始顺序');
      }
    };

    let nextPlayRetryTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelRetryTimer = () => {
      if (nextPlayRetryTimer) {
        clearTimeout(nextPlayRetryTimer);
        nextPlayRetryTimer = null;
      }
    };

    /**
     * 私人FM：在线音源已移除，退出 FM 模式
     */
    const _nextFmPlay = async () => {
      const playerCore = usePlayerCoreStore();
      playerCore.isFmPlaying = false;
      playerCore.setIsPlay(false);
      getMessage().info(i18n.global.t('player.playFailed'));
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

        // 私人FM模式：忽略 playMode 与列表长度，直接拉取新的 FM 歌曲
        if (playerCore.isFmPlaying) {
          if (!fromFailover) {
            cancelRetryTimer();
            consecutiveFailCount.value = 0;
          }
          await _nextFmPlay();
          return;
        }

        if (playList.value.length === 0) return;

        // 用户主动切歌：重置失败状态
        if (!fromFailover) {
          cancelRetryTimer();
          consecutiveFailCount.value = 0;
        }

        if (consecutiveFailCount.value >= MAX_CONSECUTIVE_FAILS) {
          console.error(`[nextPlay] 连续${MAX_CONSECUTIVE_FAILS}首播放失败，停止`);
          getMessage().warning(i18n.global.t('player.consecutiveFailsError'));
          consecutiveFailCount.value = 0;
          playerCore.setIsPlay(false);
          return;
        }

        // 顺序模式：已是最后一首
        if (playMode.value === 0 && playListIndex.value >= playList.value.length - 1) {
          if (autoEnd) {
            // 歌曲自然播放结束：停止播放
            console.log('[nextPlay] 顺序播放：最后一首播放完毕，停止');
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
        // 列表里可能有缓存 URL 但丢了试听标记，进 playTrack 前先恢复
        const { restorePreviewStreamFlags } = await import('@/utils/previewStream');
        restorePreviewStreamFlags(nextSong);

        console.log(
          `[nextPlay] ${nextSong.name}, 索引: ${playListIndex.value} -> ${nowPlayListIndex}`,
          nextSong.isPreviewStream ? `preview@${nextSong.preview?.startMs}ms` : 'full'
        );

        const { playbackCoordinator } = await import('@/services/playbackCoordinator');
        const success = await playbackCoordinator.playTrack(nextSong, true);

        // 是否被更新的操作抢占
        if (!sameTrackId(playerCore.playMusic.id, nextSong.id)) {
          console.log('[nextPlay] 被新操作取代，静默退出');
          return;
        }

        if (success) {
          consecutiveFailCount.value = 0;
          playListIndex.value = nowPlayListIndex;
          console.log(`[nextPlay] 播放成功，索引: ${nowPlayListIndex}`);
        } else {
          // 播放失败直接静默跳过到下一首（不原地重试——同曲的一次静默重试
          // 由 url_expired 恢复处理器负责：清坏缓存后换新 URL）
          consecutiveFailCount.value++;
          console.log(
            `[nextPlay] 播放失败，直接跳过，连续失败: ${consecutiveFailCount.value}/${MAX_CONSECUTIVE_FAILS}`
          );
          if (playList.value.length > 1) {
            playListIndex.value = nowPlayListIndex;
            nextPlayRetryTimer = setTimeout(() => {
              nextPlayRetryTimer = null;
              _nextPlay(false, true);
            }, 500);
          } else {
            getMessage().error(i18n.global.t('player.playFailed'));
            playerCore.setIsPlay(false);
          }
        }
      } catch (error) {
        console.error('切换下一首出错:', error);
      }
    };

    const nextPlay = useThrottleFn(_nextPlay, 500);

    /** 歌曲自然播放结束时调用，顺序模式最后一首会停止 */
    const nextPlayOnEnd = () => {
      _nextPlay(true);
    };

    const _prevPlay = async () => {
      try {
        const playerCore = usePlayerCoreStore();

        // 私人FM模式：FM 不支持回到上一首，与下一曲一致直接拉取新的 FM 歌曲（#682）
        if (playerCore.isFmPlaying) {
          cancelRetryTimer();
          consecutiveFailCount.value = 0;
          await _nextFmPlay();
          return;
        }

        if (playList.value.length === 0) return;

        cancelRetryTimer();
        const nowPlayListIndex =
          (playListIndex.value - 1 + playList.value.length) % playList.value.length;
        const prevSong = { ...playList.value[nowPlayListIndex] };

        console.log(
          `[prevPlay] ${prevSong.name}, 索引: ${playListIndex.value} -> ${nowPlayListIndex}`
        );

        const { playbackCoordinator } = await import('@/services/playbackCoordinator');
        const success = await playbackCoordinator.playTrack(prevSong);

        if (success) {
          consecutiveFailCount.value = 0;
          playListIndex.value = nowPlayListIndex;
          console.log(`[prevPlay] 播放成功，索引: ${nowPlayListIndex}`);
          preloadNextSongs(nowPlayListIndex);
        } else if (sameTrackId(playerCore.playMusic?.id, prevSong.id)) {
          // 上一首失败：索引已到 prev，沿下一首方向跳过，保持有声
          consecutiveFailCount.value++;
          playListIndex.value = nowPlayListIndex;
          if (playList.value.length > 1 && consecutiveFailCount.value < MAX_CONSECUTIVE_FAILS) {
            nextPlayRetryTimer = setTimeout(() => {
              nextPlayRetryTimer = null;
              void _nextPlay(false, true);
            }, 300);
          } else {
            consecutiveFailCount.value = 0;
            playerCore.setIsPlay(false);
            getMessage().error(i18n.global.t('player.playFailed'));
          }
        }
      } catch (error) {
        console.error('切换上一首出错:', error);
      }
    };

    const prevPlay = useThrottleFn(_prevPlay, 500);

    const setPlayListDrawerVisible = (value: boolean) => {
      playListDrawerVisible.value = value;
    };

    /** 播放成功后写回 URL / 试听标记 / 音质信息，循环切歌不丢 */
    const patchSongMeta = (
      id: string | number,
      patch: Partial<
        Pick<
          SongResult,
          | 'playMusicUrl'
          | 'isPreviewStream'
          | 'isPartialStream'
          | 'pendingFullUrl'
          | 'preview'
          | 'expiredAt'
          | 'availableQualities'
          | 'streamQuality'
          | 'streamBitrate'
          | 'lyric'
          | 'backgroundColor'
          | 'primaryColor'
        >
      >
    ) => {
      const idx = playList.value.findIndex((s) => sameTrackId(s.id, id));
      if (idx < 0) return;
      replaceEntryAt(idx, { ...playList.value[idx], ...patch });

      // 算「下一首」下标
      let nextIdx = playListIndex.value + 1;
      if (nextIdx >= playList.value.length) {
        nextIdx = playMode.value === 0 ? -1 : 0;
      }

      // 当前曲 meta 写回 → 灌下一首 standby；或直接写的是下一首 URL → 立刻灌
      const shouldWarmNext =
        playList.value.length > 1 &&
        nextIdx >= 0 &&
        (idx === playListIndex.value || idx === nextIdx);
      if (shouldWarmNext) {
        const next = playList.value[nextIdx];
        if (next?.playMusicUrl && !(next.expiredAt != null && next.expiredAt < Date.now())) {
          try {
            audioService.preload(next.playMusicUrl, next, { priority: 'next' });
          } catch {
            /* ignore */
          }
        }
      }
    };

    /** 连点切歌：只跟最后目标；短间隔合并，空闲时几乎立即播 */
    let setPlayCoalesceTimer: ReturnType<typeof setTimeout> | null = null;
    let setPlayCoalesceSeq = 0;
    let setPlayLastAt = 0;
    let setPlayPending: {
      song: SongResult;
      resolve: (v: boolean) => void;
      seq: number;
    } | null = null;

    const flushSetPlay = async (song: SongResult, seq: number): Promise<boolean> => {
      const playerCore = usePlayerCoreStore();
      const { playbackCoordinator } = await import('@/services/playbackCoordinator');
      const success = await playbackCoordinator.playTrack(song);
      // 已被更新的点选取代
      if (seq !== setPlayCoalesceSeq) return false;

      if (success) {
        cancelRetryTimer();
        consecutiveFailCount.value = 0;
        if (playerCore.userPlayIntent) {
          playerCore.isPlay = true;
        }
        preloadNextSongs(playListIndex.value);
        return true;
      }

      // 仍指向本曲且列表有多首 → 静默跳下一首
      const stillTarget = sameTrackId(playerCore.playMusic?.id, song.id);
      if (stillTarget && playList.value.length > 1) {
        consecutiveFailCount.value++;
        console.log(
          `[setPlay] 播放失败，自动跳下一首 (${consecutiveFailCount.value}/${MAX_CONSECUTIVE_FAILS})`
        );
        if (consecutiveFailCount.value >= MAX_CONSECUTIVE_FAILS) {
          consecutiveFailCount.value = 0;
          playerCore.setIsPlay(false);
          getMessage().warning(i18n.global.t('player.consecutiveFailsError'));
          return false;
        }
        nextPlayRetryTimer = setTimeout(() => {
          nextPlayRetryTimer = null;
          void _nextPlay(false, true);
        }, 300);
        return false;
      }

      if (stillTarget) {
        playerCore.setIsPlay(false);
        getMessage().error(i18n.global.t('player.playFailed'));
      }
      return false;
    };

    const setPlay = async (song: SongResult) => {
      try {
        const playerCore = usePlayerCoreStore();
        song = normalizeSongResult(song);

        // 检查 URL 是否过期
        if (song.expiredAt && song.expiredAt < Date.now()) {
          if (!song.playMusicUrl?.startsWith('local://')) {
            console.info(`歌曲URL已过期，重新获取: ${song.name}`);
            song.playMusicUrl = undefined;
            song.expiredAt = undefined;
          }
        }

        // 强制重取音质时不进切换分支
        const forceResolve = !!(song as SongResult & { forceQualityResolve?: boolean })
          .forceQualityResolve;

        // 同曲：播放/暂停切换（含加载中）。
        // 旧逻辑要求两侧 URL 都齐才 toggle → 加载中点暂停会 re-enter playTrack，
        // 恢复时又清掉非 local URL → 再 resolve 一次，体感极差。
        const sameSong = sameTrackId(playerCore.playMusic?.id, song.id);
        const coreUrl = playerCore.playMusic?.playMusicUrl;
        const songUrl = song.playMusicUrl;
        const urlsMatch = !!(coreUrl && songUrl && coreUrl === songUrl);
        const loadingSame = sameSong && !!playerCore.playMusic?.playLoading;
        // 同曲且（URL 对齐 / 仍在加载 / 核心已有有效 URL 且本次未强制换质）
        const canToggle =
          sameSong && !forceResolve && (urlsMatch || loadingSame || (!!coreUrl && !songUrl));

        if (canToggle) {
          // 取消排队中的换曲
          setPlayCoalesceSeq += 1;
          if (setPlayCoalesceTimer) {
            clearTimeout(setPlayCoalesceTimer);
            setPlayCoalesceTimer = null;
          }
          if (setPlayPending) {
            setPlayPending.resolve(false);
            setPlayPending = null;
          }

          const { audioService } = await import('@/services/audioService');

          // 正在播或仍想播（含加载中）→ 只切暂停意图，不打断 resolve
          if (playerCore.play || playerCore.userPlayIntent) {
            playerCore.setPlayMusic(false);
            playerCore.userPlayIntent = false;
            audioService.getCurrentSound()?.pause();
            return true;
          }

          // 恢复意图
          playerCore.setPlayMusic(true);
          playerCore.userPlayIntent = true;
          const sound = audioService.getCurrentSound();
          if (sound && sound.src) {
            try {
              await sound.play();
            } catch (e) {
              console.warn('[setPlay] resume play failed, keep URL and rebuild audio', e);
              const { playbackCoordinator } = await import('@/services/playbackCoordinator');
              // 保留已有 URL，禁止再走 resolve
              const recovered = await playbackCoordinator.playTrack(
                { ...playerCore.playMusic, isFirstPlay: false },
                true
              );
              if (!recovered) {
                playerCore.setIsPlay(false);
                getMessage().error(i18n.global.t('player.playFailed'));
              }
            }
            return true;
          }

          // 仍在加载：intent 已 true，等 playTrack 收尾时按 userPlayIntent 起播
          if (playerCore.playMusic?.playLoading) {
            return true;
          }

          // URL 已有但 audio 未挂上：用现有 URL 建实例，禁止清链重 resolve
          if (coreUrl) {
            const { playbackCoordinator } = await import('@/services/playbackCoordinator');
            const recovered = await playbackCoordinator.playTrack(
              { ...playerCore.playMusic, isFirstPlay: false },
              true
            );
            if (!recovered) {
              playerCore.setIsPlay(false);
              getMessage().error(i18n.global.t('player.playFailed'));
            }
            return recovered;
          }

          // 极端：同曲无 URL 且不在 loading（例如中断失败）→ 落下面 playTrack
        }

        if (song.isFirstPlay) song.isFirstPlay = false;

        // UI 索引立刻跟上（连点时界面先变）
        const songIndex = playList.value.findIndex(
          (item: SongResult) => sameTrackId(item.id, song.id) && item.source === song.source
        );
        if (songIndex !== -1 && songIndex !== playListIndex.value) {
          playListIndex.value = songIndex;
        }

        // 连点合并：只播最后一首；空闲几乎 0 延迟，连点 70ms 收尾
        const seq = ++setPlayCoalesceSeq;
        if (setPlayPending) {
          setPlayPending.resolve(false);
          setPlayPending = null;
        }
        const now = Date.now();
        const delay = now - setPlayLastAt < 200 ? 70 : 0;
        setPlayLastAt = now;

        return await new Promise<boolean>((resolve) => {
          setPlayPending = { song, resolve, seq };
          if (setPlayCoalesceTimer) clearTimeout(setPlayCoalesceTimer);
          setPlayCoalesceTimer = setTimeout(() => {
            setPlayCoalesceTimer = null;
            const job = setPlayPending;
            setPlayPending = null;
            if (!job || job.seq !== setPlayCoalesceSeq) {
              job?.resolve(false);
              return;
            }
            void flushSetPlay(job.song, job.seq)
              .then(job.resolve)
              .catch((err) => {
                console.error('设置播放失败:', err);
                job.resolve(false);
              });
          }, delay);
        });
      } catch (error) {
        console.error('设置播放失败:', error);
        return false;
      }
    };

    /**
     * 初始化播放列表
     * 注意：状态已由 pinia-plugin-persistedstate 自动恢复
     * 这里只需要处理特殊逻辑（如非法 playMode 迁移、随机模式的恢复）
     */
    const initializePlaylist = async () => {
      // 迁移：旧版心动模式 playMode=3 及任何非法值 → 顺序播放
      const normalized = normalizePlayMode(playMode.value);
      if (normalized !== playMode.value) {
        console.log(`[PlaylistStore] 非法/已移除 playMode=${playMode.value}，归一为 ${normalized}`);
        playMode.value = normalized;
      }

      // 持久化只恢复 SongResult 壳：重建 PlayableTrack 镜像
      commitPlayList(
        playList.value.map((s) => normalizeSongResult(s)),
        true
      );
      commitOriginalPlayList(
        originalPlayList.value.map((s) => normalizeSongResult(s)),
        true
      );

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
      playList,
      playablePlayList,
      playListIndex,
      playMode,
      originalPlayList,
      playableOriginalPlayList,
      playListDrawerVisible,

      currentPlayList,
      currentPlayListIndex,
      playListTracks,
      currentPlayableItem,

      setPlayList,
      setPlayListFromPlayables,
      replaceEntryAt,
      patchSongMeta,
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
          (item) => sameTrackId(item.id, song.id) && item.source === song.source
        );
        if (index !== -1) {
          replaceEntryAt(index, song);
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
