import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLyricStore = defineStore('lyric', () => {
  const lyric = ref({});

  const setLyric = (newLyric: any) => {
    lyric.value = newLyric;
  };

  return {
    lyric,
    setLyric
  };
});
