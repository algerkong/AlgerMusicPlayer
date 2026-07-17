/**
 * 聚合 Player Store
 * - usePlayerCoreStore: 核心播放控制
 * - usePlaylistStore: 播放列表
 * - useFavoriteStore: 收藏
 */

import { defineStore, storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useFavoriteStore } from './favorite';
import { usePlayerCoreStore } from './playerCore';
import { cleanupLegacyPlayHistoryStorage } from './playHistory';
import { usePlaylistStore } from './playlist';

export { getSongUrl, loadLrc, useLyrics, useSongDetail, useSongUrl } from '@/hooks/usePlayerHooks';
export { isBilibiliIdMatch } from '@/utils/playerUtils';

/**
 * 聚合 Player Store
 */
export const usePlayerStore = defineStore('player', () => {
  const playerCore = usePlayerCoreStore();
  const playlist = usePlaylistStore();
  const favorite = useFavoriteStore();

  const {
    play,
    isPlay,
    playMusic,
    playMusicUrl,
    musicFull,
    playbackRate,
    volume,
    isMuted,
    userPlayIntent,
    isFmPlaying,
    currentTrack,
    currentRuntime,
    currentPlayable
  } = storeToRefs(playerCore);

  const {
    playList,
    playablePlayList,
    playListIndex,
    playMode,
    originalPlayList,
    playListDrawerVisible,
    playListTracks,
    currentPlayableItem
  } = storeToRefs(playlist);

  const { favoriteList, dislikeList } = storeToRefs(favorite);

  const currentSong = computed(() => playerCore.currentSong);
  const isPlaying = computed(() => playerCore.isPlaying);
  const currentPlayList = computed(() => playlist.currentPlayList);
  const currentPlayListIndex = computed(() => playlist.currentPlayListIndex);

  const initializePlayState = async () => {
    cleanupLegacyPlayHistoryStorage();
    const { playbackCoordinator } = await import('@/services/playbackCoordinator');
    await playbackCoordinator.initializePlayState();
    await playlist.initializePlaylist();
  };

  const initializeFavoriteList = async () => {
    await favorite.initializeFavoriteList();
  };

  return {
    play,
    isPlay,
    playMusic,
    playMusicUrl,
    musicFull,
    playbackRate,
    volume,
    isMuted,
    userPlayIntent,
    isFmPlaying,

    currentSong,
    isPlaying,
    currentTrack,
    currentRuntime,
    currentPlayable,

    setIsPlay: playerCore.setIsPlay,
    setMusicFull: playerCore.setMusicFull,
    setPlayMusic: playerCore.setPlayMusic,
    setCurrentSong: playerCore.setCurrentSong,
    setCurrentPlayable: playerCore.setCurrentPlayable,
    patchCurrentSong: playerCore.patchCurrentSong,
    getCurrentPlayable: playerCore.getCurrentPlayable,
    setPlaybackRate: playerCore.setPlaybackRate,
    setVolume: playerCore.setVolume,
    getVolume: playerCore.getVolume,
    increaseVolume: playerCore.increaseVolume,
    decreaseVolume: playerCore.decreaseVolume,
    setMuted: playerCore.setMuted,
    toggleMute: playerCore.toggleMute,
    handlePause: playerCore.handlePause,

    playList,
    playablePlayList,
    playListIndex,
    playMode,
    originalPlayList,
    playListDrawerVisible,

    currentPlayList,
    currentPlayListIndex,
    playListTracks,
    currentPlayableItem,

    setPlayList: playlist.setPlayList,
    setPlayListFromPlayables: playlist.setPlayListFromPlayables,
    addToNextPlay: playlist.addToNextPlay,
    removeFromPlayList: playlist.removeFromPlayList,
    clearPlayAll: playlist.clearPlayAll,
    togglePlayMode: playlist.togglePlayMode,
    shufflePlayList: playlist.shufflePlayList,
    restoreOriginalOrder: playlist.restoreOriginalOrder,
    preloadNextSongs: playlist.preloadNextSongs,
    patchSongMeta: playlist.patchSongMeta,
    nextPlay: playlist.nextPlay,
    prevPlay: playlist.prevPlay,
    setPlayListDrawerVisible: playlist.setPlayListDrawerVisible,
    setPlay: playlist.setPlay,

    favoriteList,
    dislikeList,

    addToFavorite: favorite.addToFavorite,
    seedFavorites: favorite.seedFavorites,
    removeFromFavorite: favorite.removeFromFavorite,
    addToDislikeList: favorite.addToDislikeList,
    removeFromDislikeList: favorite.removeFromDislikeList,
    isFavorite: favorite.isFavorite,
    isDisliked: favorite.isDisliked,

    initializePlayState,
    initializeFavoriteList
  };
});
