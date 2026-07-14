import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { SongResult } from '@/types/music';

/**
 * 每日推荐 Store — 在线音源移除后为空壳
 */
export const useRecommendStore = defineStore('recommend', () => {
  const dailyRecommendSongs = ref<SongResult[]>([]);
  const lastFetchDate = ref<string>('');

  const isDataStale = (): boolean => true;

  const fetchDailyRecommendSongs = async () => {
    dailyRecommendSongs.value = [];
  };

  const refreshIfStale = async (): Promise<boolean> => {
    return false;
  };

  const replaceSongInDailyRecommend = (_oldSongId: number | string, _newSong: SongResult) => {
    // 空操作
  };

  return {
    dailyRecommendSongs,
    lastFetchDate,
    isDataStale,
    fetchDailyRecommendSongs,
    refreshIfStale,
    replaceSongInDailyRecommend
  };
});
