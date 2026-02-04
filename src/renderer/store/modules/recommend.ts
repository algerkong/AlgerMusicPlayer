import { defineStore } from 'pinia';
import { ref } from 'vue';

import { getDayRecommend } from '@/api/home';
import type { IDayRecommend } from '@/types/day_recommend';
import type { SongResult } from '@/types/music';

// 获取当前日期字符串 YYYY-MM-DD
const getTodayDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const useRecommendStore = defineStore('recommend', () => {
  const dailyRecommendSongs = ref<SongResult[]>([]);
  const lastFetchDate = ref<string>('');

  // 检查数据是否过期（跨天）
  const isDataStale = (): boolean => {
    if (!lastFetchDate.value || dailyRecommendSongs.value.length === 0) {
      return true;
    }
    return lastFetchDate.value !== getTodayDateString();
  };

  const fetchDailyRecommendSongs = async () => {
    try {
      const { data } = await getDayRecommend();
      const recommendData = data.data as unknown as IDayRecommend;

      if (recommendData && Array.isArray(recommendData.dailySongs)) {
        dailyRecommendSongs.value = recommendData.dailySongs as any;
        lastFetchDate.value = getTodayDateString();
        console.log(`[Recommend Store] 已加载 ${recommendData.dailySongs.length} 首每日推荐歌曲。`);
      } else {
        dailyRecommendSongs.value = [];
      }
    } catch (error) {
      console.error('[Recommend Store] 获取每日推荐失败:', error);
      dailyRecommendSongs.value = [];
    }
  };

  // 如果数据过期则刷新
  const refreshIfStale = async (): Promise<boolean> => {
    if (isDataStale()) {
      await fetchDailyRecommendSongs();
      return true;
    }
    return false;
  };

  const replaceSongInDailyRecommend = (oldSongId: number | string, newSong: SongResult) => {
    const index = dailyRecommendSongs.value.findIndex((song) => song.id === oldSongId);
    if (index !== -1) {
      dailyRecommendSongs.value.splice(index, 1, newSong as any);
      console.log(`[Recommend Store] 已将歌曲 ${oldSongId} 替换为 ${newSong.name}`);
    } else {
      console.warn(`[Recommend Store] 未在日推列表中找到要替换的歌曲ID: ${oldSongId}`);
    }
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
