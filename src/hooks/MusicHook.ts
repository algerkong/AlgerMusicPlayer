import { computed, ref } from 'vue';

import { getMusicLrc } from '@/api/music';
import store from '@/store';
import { ILyric } from '@/type/lyric';
import type { ILyricText, SongResult } from '@/type/music';

const windowData = window as any;

export const isElectron = computed(() => !!windowData.electronAPI);

export const lrcArray = ref<ILyricText[]>([]); // 歌词数组
export const lrcTimeArray = ref<number[]>([]); // 歌词时间数组
export const nowTime = ref(0); // 当前播放时间
export const allTime = ref(0); // 总播放时间
export const nowIndex = ref(0); // 当前播放歌词
export const correctionTime = ref(0.4); // 歌词矫正时间Correction time
export const currentLrcProgress = ref(0); // 来存储当前歌词的进度
export const audio = ref<HTMLAudioElement>(); // 音频对象
export const playMusic = computed(() => store.state.playMusic as SongResult); // 当前播放歌曲

watch(
  () => store.state.playMusic,
  () => {
    nextTick(() => {
      lrcArray.value = playMusic.value.lyric?.lrcArray || [];
      lrcTimeArray.value = playMusic.value.lyric?.lrcTimeArray || [];
    });
  },
  {
    deep: true,
  },
);
const isPlaying = computed(() => store.state.play as boolean);

// 增加矫正时间
export const addCorrectionTime = (time: number) => (correctionTime.value += time);

// 减少矫正时间
export const reduceCorrectionTime = (time: number) => (correctionTime.value -= time);

// 获取当前播放歌词
export const isCurrentLrc = (index: number, time: number): boolean => {
  const currentTime = lrcTimeArray.value[index];
  const nextTime = lrcTimeArray.value[index + 1];
  const nowTime = time + correctionTime.value;
  const isTrue = nowTime > currentTime && nowTime < nextTime;
  return isTrue;
};

// 获取当前播放歌词INDEX
export const getLrcIndex = (time: number): number => {
  for (let i = 0; i < lrcTimeArray.value.length; i++) {
    if (isCurrentLrc(i, time)) {
      nowIndex.value = i;
      return i;
    }
  }
  return nowIndex.value;
};

// 获取当前播放歌词进度
const currentLrcTiming = computed(() => {
  const start = lrcTimeArray.value[nowIndex.value] || 0;
  const end = lrcTimeArray.value[nowIndex.value + 1] || start + 1;
  return { start, end };
});

// 获取歌词样式
export const getLrcStyle = (index: number) => {
  if (index === nowIndex.value) {
    return {
      backgroundImage: `linear-gradient(to right, #ffffff ${currentLrcProgress.value}%, #ffffff8a ${currentLrcProgress.value}%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      transition: 'background-image 0.1s linear',
    };
  }
  return {};
};

watch(nowTime, (newTime) => {
  const newIndex = getLrcIndex(newTime);
  if (newIndex !== nowIndex.value) {
    nowIndex.value = newIndex;
    currentLrcProgress.value = 0; // 重置进度
  }
});

// 播放进度
export const useLyricProgress = () => {
  let animationFrameId: number | null = null;

  const updateProgress = () => {
    if (!isPlaying.value) return;
    audio.value = audio.value || (document.querySelector('#MusicAudio') as HTMLAudioElement);
    if (!audio.value) return;
    const { start, end } = currentLrcTiming.value;
    const duration = end - start;
    const elapsed = audio.value.currentTime - start;
    currentLrcProgress.value = Math.min(Math.max((elapsed / duration) * 100, 0), 100);

    animationFrameId = requestAnimationFrame(updateProgress);
  };

  const startProgressAnimation = () => {
    if (!animationFrameId && isPlaying.value) {
      updateProgress();
    }
  };

  const stopProgressAnimation = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  watch(isPlaying, (newIsPlaying) => {
    if (newIsPlaying) {
      startProgressAnimation();
    } else {
      stopProgressAnimation();
    }
  });

  onMounted(() => {
    if (isPlaying.value) {
      startProgressAnimation();
    }
  });

  onUnmounted(() => {
    stopProgressAnimation();
  });

  return {
    currentLrcProgress,
    getLrcStyle,
  };
};

// 设置当前播放时间
export const setAudioTime = (index: number, audio: HTMLAudioElement) => {
  audio.currentTime = lrcTimeArray.value[index];
  audio.play();
};

// 获取当前播放的歌词
export const getCurrentLrc = () => {
  const index = getLrcIndex(nowTime.value);
  return {
    currentLrc: lrcArray.value[index],
    nextLrc: lrcArray.value[index + 1],
  };
};

// 获取一句歌词播放时间是 几秒到几秒
export const getLrcTimeRange = (index: number) => ({
  currentTime: lrcTimeArray.value[index],
  nextTime: lrcTimeArray.value[index + 1],
});

export const sendLyricToWin = (isPlay: boolean = true) => {
  if (!isElectron.value) return;

  try {
    if (lrcArray.value.length > 0) {
      const nowIndex = getLrcIndex(nowTime.value);
      const { currentLrc, nextLrc } = getCurrentLrc();
      const { currentTime, nextTime } = getLrcTimeRange(nowIndex);
      // 设置lyricWinData 获取 当前播放的两句歌词 和歌词时间
      const lyricWinData = {
        currentLrc,
        nextLrc,
        currentTime,
        nextTime,
        nowIndex,
        lrcTimeArray: lrcTimeArray.value,
        lrcArray: lrcArray.value,
        nowTime: nowTime.value,
        allTime: allTime.value,
        startCurrentTime: lrcTimeArray.value[nowIndex],
        isPlay,
      };
      windowData.electronAPI.sendLyric(JSON.stringify(lyricWinData));
    }
  } catch (error) {
    console.error('Error sending lyric to window:', error);
  }
};

export const openLyric = () => {
  if (!isElectron.value) return;
  windowData.electronAPI.openLyric();
  sendLyricToWin();
};
