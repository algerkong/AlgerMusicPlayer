import { defineStore } from 'pinia';
import { ref } from 'vue';

import { getDayRecommend } from '@/api/home';
import type { IDayRecommend } from '@/types/day_recommend';
import type { SongResult } from '@/types/music';

export const useRecommendStore = defineStore('recommend', () => {
  const dailyRecommendSongs = ref<SongResult[]>([]);

  const fetchDailyRecommendSongs = async () => {
    try {
      const { data } = await getDayRecommend();
      const recommendData = data.data as unknown as IDayRecommend;

      if (recommendData && Array.isArray(recommendData.dailySongs)) {
        dailyRecommendSongs.value = recommendData.dailySongs as any;
        console.log(`[Recommend Store] 已加载 ${recommendData.dailySongs.length} 首每日推荐歌曲。`);
      } else {
        dailyRecommendSongs.value = [];
      }
    } catch (error) {
      console.error('[Recommend Store] 获取每日推荐失败:', error);
      dailyRecommendSongs.value = [];
    }
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
    fetchDailyRecommendSongs,
    replaceSongInDailyRecommend
  };
});
