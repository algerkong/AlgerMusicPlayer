import { computed, ref } from 'vue';

import { audioService } from '@/services/audioService';
import store from '@/store';
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
export const playMusic = computed(() => store.state.playMusic as SongResult); // 当前播放歌曲
export const sound = ref<Howl | null>(audioService.getCurrentSound());
export const isLyricWindowOpen = ref(false); // 新增状态

document.onkeyup = (e) => {
  // 检查事件目标是否是输入框元素
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return;
  }

  switch (e.code) {
    case 'Space':
      if (store.state.play) {
        store.commit('setPlayMusic', false);
        audioService.getCurrentSound()?.pause();
      } else {
        store.commit('setPlayMusic', true);
        audioService.getCurrentSound()?.play();
      }
      break;
    default:
  }
};

watch(
  () => store.state.playMusicUrl,
  (newVal) => {
    if (newVal) {
      audioService.play(newVal);
      sound.value = audioService.getCurrentSound();
      audioServiceOn(audioService);
    }
  },
);

watch(
  () => store.state.playMusic,
  () => {
    nextTick(async () => {
      lrcArray.value = playMusic.value.lyric?.lrcArray || [];
      lrcTimeArray.value = playMusic.value.lyric?.lrcTimeArray || [];
      // 当歌词数据更新时，如果歌词窗口打开，则发送数据
      if (isElectron.value && isLyricWindowOpen.value && lrcArray.value.length > 0) {
        sendLyricToWin();
      }
    });
  },
  {
    deep: true,
    immediate: true,
  },
);

export const audioServiceOn = (audio: typeof audioService) => {
  let interval: any = null;

  // 监听播放
  audio.onPlay(() => {
    store.commit('setPlayMusic', true);
    interval = setInterval(() => {
      nowTime.value = sound.value?.seek() as number;
      allTime.value = sound.value?.duration() as number;
      const newIndex = getLrcIndex(nowTime.value);
      if (newIndex !== nowIndex.value) {
        nowIndex.value = newIndex;
        currentLrcProgress.value = 0;
        // 当歌词索引更新时，发送歌词数据
        if (isElectron.value && isLyricWindowOpen.value) {
          sendLyricToWin();
        }
      }
      // 定期发送歌词数据更新
      if (isElectron.value && isLyricWindowOpen.value) {
        sendLyricToWin();
      }
    }, 50);
  });

  // 监听暂停
  audio.onPause(() => {
    store.commit('setPlayMusic', false);
    clearInterval(interval);
    // 暂停时也发送一次状态更新
    if (isElectron.value && isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  });

  // 监听结束
  audio.onEnd(() => {
    if (store.state.playMode === 1) {
      // 单曲循环模式
      audio.getCurrentSound()?.play();
    } else {
      // 列表循环模式
      store.commit('nextPlay');
    }
  });
};

export const play = () => {
  audioService.getCurrentSound()?.play();
};

export const pause = () => {
  audioService.getCurrentSound()?.pause();
};

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

// 播放进度
export const useLyricProgress = () => {
  let animationFrameId: number | null = null;

  const updateProgress = () => {
    if (!isPlaying.value) return;
    const currentSound = sound.value;
    if (!currentSound) return;

    const { start, end } = currentLrcTiming.value;
    const duration = end - start;
    const elapsed = (currentSound.seek() as number) - start;
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

// 设置���前播放时间
export const setAudioTime = (index: number) => {
  const currentSound = sound.value;
  if (!currentSound) return;

  currentSound.seek(lrcTimeArray.value[index]);
  currentSound.play();
};

// 获取当前播放的歌词
export const getCurrentLrc = () => {
  const index = getLrcIndex(nowTime.value);
  return {
    currentLrc: lrcArray.value[index],
    nextLrc: lrcArray.value[index + 1],
  };
};

// 获取一句歌词播放时间几秒到几秒
export const getLrcTimeRange = (index: number) => ({
  currentTime: lrcTimeArray.value[index],
  nextTime: lrcTimeArray.value[index + 1],
});

// 监听歌词数组变化，当切换歌曲时重新初始化歌词窗口
watch(
  () => lrcArray.value,
  (newLrcArray) => {
    if (newLrcArray.length > 0 && isElectron.value && isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  },
);

// 发送歌词更新数据
export const sendLyricToWin = () => {
  if (!isElectron.value || !isLyricWindowOpen.value) {
    console.log('Cannot send lyric: electron or lyric window not available');
    return;
  }

  try {
    if (lrcArray.value.length > 0) {
      const nowIndex = getLrcIndex(nowTime.value);
      const updateData = {
        type: 'full',
        nowIndex,
        nowTime: nowTime.value,
        startCurrentTime: lrcTimeArray.value[nowIndex],
        nextTime: lrcTimeArray.value[nowIndex + 1],
        isPlay: isPlaying.value,
        lrcArray: lrcArray.value,
        lrcTimeArray: lrcTimeArray.value,
        allTime: allTime.value,
        playMusic: playMusic.value,
      };
      windowData.electronAPI.sendLyric(JSON.stringify(updateData));
    }
  } catch (error) {
    console.error('Error sending lyric update:', error);
  }
};

export const openLyric = () => {
  if (!isElectron.value) return;
  console.log('Opening lyric window with current song:', playMusic.value?.name);
  windowData.electronAPI.openLyric();
  isLyricWindowOpen.value = true;

  // 延迟一下初始化，确保窗口已经创建
  setTimeout(() => {
    if (isLyricWindowOpen.value) {
      console.log('Initializing lyric window with data:', {
        hasLyrics: lrcArray.value.length > 0,
        songName: playMusic.value?.name,
      });
      sendLyricToWin();
    }
  }, 500);
};

// 添加关闭歌词窗口的方法
export const closeLyric = () => {
  if (!isElectron.value) return;
  isLyricWindowOpen.value = false;
  windowData.electron.ipcRenderer.send('close-lyric');
};

// 添加播放控制命令监听
if (isElectron.value) {
  windowData.electron.ipcRenderer.on('lyric-control-back', (command: string) => {
    console.log('Received playback control command:', command);
    switch (command) {
      case 'playpause':
        if (store.state.play) {
          store.commit('setPlayMusic', false);
          audioService.getCurrentSound()?.pause();
        } else {
          store.commit('setPlayMusic', true);
          audioService.getCurrentSound()?.play();
        }
        break;
      case 'prev':
        store.commit('prevPlay');
        break;
      case 'next':
        store.commit('nextPlay');
        break;
      case 'close':
        closeLyric();
        break;
      default:
        console.log('Unknown command:', command);
        break;
    }
  });
}
