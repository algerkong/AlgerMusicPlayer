// musicHistoryHooks
import { useLocalStorage } from '@vueuse/core';

import { recordPlay } from '@/api/stats';
import type { SongResult } from '@/type/music';

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

    // 记录播放统计
    if (music?.id && music?.name) {
      // 获取艺术家名称
      let artistName = '未知艺术家';

      if (music.ar) {
        artistName = music.ar.map((artist) => artist.name).join('/');
      } else if (music.song?.artists && music.song.artists.length > 0) {
        artistName = music.song.artists.map((artist) => artist.name).join('/');
      } else if (music.artists) {
        artistName = music.artists.map((artist) => artist.name).join('/');
      }

      // 发送播放统计
      recordPlay(music.id, music.name, artistName).catch((error) =>
        console.error('记录播放统计失败:', error)
      );
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
