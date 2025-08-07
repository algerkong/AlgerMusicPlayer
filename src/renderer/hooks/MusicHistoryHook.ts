import { useLocalStorage } from '@vueuse/core';

import type { SongResult } from '@/types/music';

export const useMusicHistory = () => {
  const musicHistory = useLocalStorage<SongResult[]>('musicHistory', []);

  const addMusic = (music: SongResult) => {
    const index = musicHistory.value.findIndex((item) => item.id === music.id);
    if (index !== -1) {
      musicHistory.value[index].count = (musicHistory.value[index].count || 0) + 1;
      musicHistory.value.unshift(musicHistory.value.splice(index, 1)[0]);
    } else {
      musicHistory.value.unshift({ ...music, count: 1 });
    }
  };

  const delMusic = (music: SongResult) => {
    const index = musicHistory.value.findIndex((item) => item.id === music.id);
    if (index !== -1) {
      musicHistory.value.splice(index, 1);
    }
  };
  const musicList = ref(musicHistory.value);
  watch(
    () => musicHistory.value,
    () => {
      musicList.value = musicHistory.value;
    }
  );

  return {
    musicHistory,
    musicList,
    addMusic,
    delMusic
  };
};
