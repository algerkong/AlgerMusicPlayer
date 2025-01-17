import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import useIndexedDB from '@/hooks/IndexDBHook';
import { audioService } from '@/services/audioService';
import store from '@/store';
import type { Artist, ILyricText, SongResult } from '@/type/music';
import { isElectron } from '@/utils';
import { getTextColors } from '@/utils/linearColor';
import { createDiscreteApi } from 'naive-ui';
const windowData = window as any;

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
export const textColors = ref<any>(getTextColors());
export const artistList = computed(
  () => (store.state.playMusic.ar || store.state.playMusic?.song?.artists) as Artist[]
);

export const musicDB = await useIndexedDB('musicDB', [
  { name: 'music', keyPath: 'id' },
  { name: 'music_lyric', keyPath: 'id' },
  { name: 'api_cache', keyPath: 'id' }
]);

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

const { message } = createDiscreteApi(['message']);

watch(
  () => store.state.playMusicUrl,
  async (newVal) => {
    if (newVal && playMusic.value) {
      try {
        const newSound = await audioService.play(newVal, playMusic.value);
        sound.value = newSound as Howl;
        setupAudioListeners();
      } catch (error) {

        console.error('播放音频失败:', error);
        store.commit('setPlayMusic', false);
        message.error('当前歌曲播放失败，播放下一首');
        // 下一首
        store.commit('nextPlay');
      }
    }
  }
);

watch(
  () => store.state.playMusic,
  () => {
    nextTick(async () => {
      lrcArray.value = playMusic.value.lyric?.lrcArray || [];
      lrcTimeArray.value = playMusic.value.lyric?.lrcTimeArray || [];
      // 当歌词数据更新时，如果歌词窗口打开，则发送数据
      if (isElectron && isLyricWindowOpen.value && lrcArray.value.length > 0) {
        sendLyricToWin();
      }
    });
  },
  {
    deep: true,
    immediate: true
  }
);

const setupAudioListeners = () => {
  let interval: any = null;

  const clearInterval = () => {
    if (interval) {
      window.clearInterval(interval);
      interval = null;
    }
  };

  // 清理所有事件监听器
  audioService.clearAllListeners();

  // 监听播放
  audioService.on('play', () => {
    store.commit('setPlayMusic', true);
    clearInterval();
    interval = window.setInterval(() => {
      try {
        const currentSound = sound.value;
        if (!currentSound || typeof currentSound.seek !== 'function') {
          console.error('Invalid sound object or seek function');
          clearInterval();
          return;
        }

        const currentTime = currentSound.seek() as number;
        if (typeof currentTime !== 'number' || Number.isNaN(currentTime)) {
          console.error('Invalid current time:', currentTime);
          clearInterval();
          return;
        }

        nowTime.value = currentTime;
        allTime.value = currentSound.duration() as number;
        const newIndex = getLrcIndex(nowTime.value);
        if (newIndex !== nowIndex.value) {
          nowIndex.value = newIndex;
          currentLrcProgress.value = 0;
          if (isElectron && isLyricWindowOpen.value) {
            sendLyricToWin();
          }
        }
        if (isElectron && isLyricWindowOpen.value) {
          sendLyricToWin();
        }
      } catch (error) {
        console.error('Error in interval:', error);
        clearInterval();
      }
    }, 50);
  });

  // 监听暂停
  audioService.on('pause', () => {
    store.commit('setPlayMusic', false);
    clearInterval();
    if (isElectron && isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  });

  const replayMusic = async () => {
    try {
      // 如果当前有音频实例，先停止并销毁
      if (sound.value) {
        sound.value.stop();
        sound.value.unload();
        sound.value = null;
      }

      // 重新播放当前歌曲
      if (store.state.playMusicUrl && playMusic.value) {
        const newSound = await audioService.play(store.state.playMusicUrl, playMusic.value);
        sound.value = newSound as Howl;
        setupAudioListeners();
      } else {
        console.error('No music URL or playMusic data available');
        store.commit('nextPlay');
      }
    } catch (error) {
      console.error('Error replaying song:', error);
      store.commit('nextPlay');
    }
  };

  // 监听结束
  audioService.on('end', () => {
    clearInterval();

    if (store.state.playMode === 1) {
      // 单曲循环模式
      if (sound.value) {
        replayMusic();
      }
    } else if (store.state.playMode === 2) {
      // 随机播放模式
      const { playList } = store.state;
      if (playList.length <= 1) {
        replayMusic();
      } else {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * playList.length);
        } while (randomIndex === store.state.playListIndex && playList.length > 1);
        store.state.playListIndex = randomIndex;
        store.commit('setPlay', playList[randomIndex]);
      }
    } else {
      // 列表循环模式
      store.commit('nextPlay');
    }
  });

  return clearInterval;
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
      transition: 'background-image 0.1s linear'
    };
  }
  return {};
};

// 播放进度
export const useLyricProgress = () => {
  let animationFrameId: number | null = null;

  const updateProgress = () => {
    if (!isPlaying.value) {
      stopProgressAnimation();
      return;
    }

    const currentSound = sound.value;
    if (!currentSound || typeof currentSound.seek !== 'function') {
      console.error('Invalid sound object or seek function');
      stopProgressAnimation();
      return;
    }

    try {
      const { start, end } = currentLrcTiming.value;
      if (typeof start !== 'number' || typeof end !== 'number' || start === end) {
        return;
      }

      const currentTime = currentSound.seek() as number;
      if (typeof currentTime !== 'number' || Number.isNaN(currentTime)) {
        console.error('Invalid current time:', currentTime);
        return;
      }

      const elapsed = currentTime - start;
      const duration = end - start;
      const progress = (elapsed / duration) * 100;

      // 确保进度在 0-100 之间
      currentLrcProgress.value = Math.min(Math.max(progress, 0), 100);
    } catch (error) {
      console.error('Error updating progress:', error);
    }

    // 继续下一帧更新
    animationFrameId = requestAnimationFrame(updateProgress);
  };

  const startProgressAnimation = () => {
    stopProgressAnimation(); // 先停止之前的动画
    if (isPlaying.value) {
      updateProgress();
    }
  };

  const stopProgressAnimation = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  // 监听播放状态变化
  watch(
    isPlaying,
    (newIsPlaying) => {
      if (newIsPlaying) {
        startProgressAnimation();
      } else {
        stopProgressAnimation();
      }
    },
    { immediate: true }
  );

  // 监听当前歌词索引变化
  watch(nowIndex, () => {
    currentLrcProgress.value = 0;
    if (isPlaying.value) {
      startProgressAnimation();
    }
  });

  // 监听音频对象变化
  watch(sound, (newSound) => {
    if (newSound && isPlaying.value) {
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
    getLrcStyle
  };
};

// 设置当前播放时间
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
    nextLrc: lrcArray.value[index + 1]
  };
};

// 获取一句歌词播放时间几秒到几秒
export const getLrcTimeRange = (index: number) => ({
  currentTime: lrcTimeArray.value[index],
  nextTime: lrcTimeArray.value[index + 1]
});

// 监听歌词数组变化，当切换歌曲时重新初始化歌词窗口
watch(
  () => lrcArray.value,
  (newLrcArray) => {
    if (newLrcArray.length > 0 && isElectron && isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  }
);

// 发送歌词更新数据
export const sendLyricToWin = () => {
  if (!isElectron || !isLyricWindowOpen.value) {
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
        playMusic: playMusic.value
      };
      window.api.sendLyric(JSON.stringify(updateData));
    }
  } catch (error) {
    console.error('Error sending lyric update:', error);
  }
};

export const openLyric = () => {
  if (!isElectron) return;
  console.log('Opening lyric window with current song:', playMusic.value?.name);

  isLyricWindowOpen.value = !isLyricWindowOpen.value;
  if (isLyricWindowOpen.value) {
    setTimeout(() => {
      window.api.openLyric();
      sendLyricToWin();
    }, 500);
    sendLyricToWin();
  } else {
    closeLyric();
  }
};

// 添加关闭歌词窗口的方法
export const closeLyric = () => {
  if (!isElectron) return;
  windowData.electron.ipcRenderer.send('close-lyric');
};

// 添加播放控制命令监听
if (isElectron) {
  windowData.electron.ipcRenderer.on('lyric-control-back', (_, command: string) => {
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

// 在组件挂载时设置监听器
onMounted(() => {
  setupAudioListeners();
  useLyricProgress(); // 直接调用，不需要解构返回值
});
