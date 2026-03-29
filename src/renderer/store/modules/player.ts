/**
 * - usePlayerCoreStore: 核心播放控制（播放/暂停、音量、速度）
 * - usePlaylistStore: 播放列表管理（列表、索引、模式、上下一首）
 * - useFavoriteStore: 收藏管理（收藏列表、不喜欢列表）
 * - useSleepTimerStore: 定时关闭（时间/歌曲数/列表结束）
 * - useIntelligenceModeStore: 心动模式
 */

import { defineStore, storeToRefs } from 'pinia';
import { computed } from 'vue';

// 导入所有拆分的子 stores
import { useFavoriteStore } from './favorite';
import { useIntelligenceModeStore } from './intelligenceMode';
import { usePlayerCoreStore } from './playerCore';
import { usePlayHistoryStore } from './playHistory';
import { usePlaylistStore } from './playlist';
import { type SleepTimerInfo, SleepTimerType, useSleepTimerStore } from './sleepTimer';

export { type SleepTimerInfo, SleepTimerType };
export { getSongUrl, loadLrc, useLyrics, useSongDetail, useSongUrl } from '@/hooks/usePlayerHooks';
export { isBilibiliIdMatch } from '@/utils/playerUtils';

/**
 * 聚合 Player Store
 */
export const usePlayerStore = defineStore('player', () => {
  // 获取所有子 stores
  const playerCore = usePlayerCoreStore();
  const playlist = usePlaylistStore();
  const favorite = useFavoriteStore();
  const sleepTimer = useSleepTimerStore();
  const intelligenceMode = useIntelligenceModeStore();

  // 使用 storeToRefs 获取响应式引用
  const {
    play,
    isPlay,
    playMusic,
    playMusicUrl,
    musicFull,
    playbackRate,
    volume,
    userPlayIntent,
    isFmPlaying
  } = storeToRefs(playerCore);

  const { playList, playListIndex, playMode, originalPlayList, playListDrawerVisible } =
    storeToRefs(playlist);

  const { favoriteList, dislikeList } = storeToRefs(favorite);

  const { sleepTimer: sleepTimerState, showSleepTimer } = storeToRefs(sleepTimer);

  const { isIntelligenceMode, intelligenceModeInfo } = storeToRefs(intelligenceMode);

  // ==================== Computed ====================
  const currentSong = computed(() => playerCore.currentSong);
  const isPlaying = computed(() => playerCore.isPlaying);
  const currentPlayList = computed(() => playlist.currentPlayList);
  const currentPlayListIndex = computed(() => playlist.currentPlayListIndex);

  // 定时器相关 computed
  const currentSleepTimer = computed(() => sleepTimer.currentSleepTimer);
  const hasSleepTimerActive = computed(() => sleepTimer.hasSleepTimerActive);
  const sleepTimerRemainingTime = computed(() => sleepTimer.sleepTimerRemainingTime);
  const sleepTimerRemainingSongs = computed(() => sleepTimer.sleepTimerRemainingSongs);

  // ==================== 初始化方法 ====================
  /**
   * 初始化播放状态（从 localStorage 恢复）
   */
  const initializePlayState = async () => {
    // 从旧的 localStorage 迁移播放记录到 Pinia store
    const playHistoryStore = usePlayHistoryStore();
    playHistoryStore.migrateFromLocalStorage();

    const { initializePlayState: initPlayState } = await import('@/services/playbackController');
    await initPlayState();
    await playlist.initializePlaylist();
  };

  /**
   * 初始化收藏列表（从服务器同步）
   */
  const initializeFavoriteList = async () => {
    await favorite.initializeFavoriteList();
  };

  // ==================== 返回所有状态和方法 ====================
  return {
    // ========== 核心播放控制 (PlayerCore) ==========
    play,
    isPlay,
    playMusic,
    playMusicUrl,
    musicFull,
    playbackRate,
    volume,
    userPlayIntent,
    isFmPlaying,

    // PlayerCore - Computed
    currentSong,
    isPlaying,

    // PlayerCore - Actions
    setIsPlay: playerCore.setIsPlay,
    setMusicFull: playerCore.setMusicFull,
    setPlayMusic: playerCore.setPlayMusic,
    setPlaybackRate: playerCore.setPlaybackRate,
    setVolume: playerCore.setVolume,
    getVolume: playerCore.getVolume,
    increaseVolume: playerCore.increaseVolume,
    decreaseVolume: playerCore.decreaseVolume,
    handlePause: playerCore.handlePause,

    // ========== 播放列表管理 (Playlist) ==========
    playList,
    playListIndex,
    playMode,
    originalPlayList,
    playListDrawerVisible,

    // Playlist - Computed
    currentPlayList,
    currentPlayListIndex,

    // Playlist - Actions
    setPlayList: playlist.setPlayList,
    addToNextPlay: playlist.addToNextPlay,
    removeFromPlayList: playlist.removeFromPlayList,
    clearPlayAll: playlist.clearPlayAll,
    togglePlayMode: playlist.togglePlayMode,
    shufflePlayList: playlist.shufflePlayList,
    restoreOriginalOrder: playlist.restoreOriginalOrder,
    preloadNextSongs: playlist.preloadNextSongs,
    nextPlay: playlist.nextPlay,
    prevPlay: playlist.prevPlay,
    setPlayListDrawerVisible: playlist.setPlayListDrawerVisible,
    setPlay: playlist.setPlay,

    // ========== 收藏管理 (Favorite) ==========
    favoriteList,
    dislikeList,

    // Favorite - Actions
    addToFavorite: favorite.addToFavorite,
    removeFromFavorite: favorite.removeFromFavorite,
    addToDislikeList: favorite.addToDislikeList,
    removeFromDislikeList: favorite.removeFromDislikeList,

    // ========== 定时关闭 (SleepTimer) ==========
    sleepTimer: sleepTimerState,
    showSleepTimer,

    // SleepTimer - Computed
    currentSleepTimer,
    hasSleepTimerActive,
    sleepTimerRemainingTime,
    sleepTimerRemainingSongs,

    // SleepTimer - Actions
    setSleepTimerByTime: sleepTimer.setSleepTimerByTime,
    setSleepTimerBySongs: sleepTimer.setSleepTimerBySongs,
    setSleepTimerAtPlaylistEnd: sleepTimer.setSleepTimerAtPlaylistEnd,
    clearSleepTimer: sleepTimer.clearSleepTimer,

    // ========== 心动模式 (IntelligenceMode) ==========
    isIntelligenceMode,
    intelligenceModeInfo,

    // IntelligenceMode - Actions
    playIntelligenceMode: intelligenceMode.playIntelligenceMode,

    // ========== 初始化方法 ==========
    initializePlayState,
    initializeFavoriteList
  };
});
