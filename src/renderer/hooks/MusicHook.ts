import { cloneDeep } from 'lodash';
import { computed, type ComputedRef, nextTick, onUnmounted, ref, watch } from 'vue';

import useIndexedDB from '@/hooks/IndexDBHook';
import { audioService } from '@/services/audioService';
import type { usePlayerStore } from '@/store';
import type { Artist, ILyricText, SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import { getTextColors } from '@/utils/linearColor';
import { parseLyrics } from '@/utils/yrcParser';

const windowData = window as any;

// 全局 playerStore 引用，通过 initMusicHook 函数注入
let playerStore: ReturnType<typeof usePlayerStore> | null = null;

// 初始化函数，接受 store 实例
export const initMusicHook = (store: ReturnType<typeof usePlayerStore>) => {
  playerStore = store;

  // 创建 computed 属性
  playMusic = computed(() => getPlayerStore().playMusic as SongResult);
  artistList = computed(
    () => (getPlayerStore().playMusic.ar || getPlayerStore().playMusic?.song?.artists) as Artist[]
  );

  // 在 store 注入后初始化需要 store 的功能
  setupKeyboardListeners();
  setupMusicWatchers();
  setupCorrectionTimeWatcher();
  setupPlayStateWatcher();
};

// 获取 playerStore 的辅助函数
const getPlayerStore = () => {
  if (!playerStore) {
    throw new Error('MusicHook not initialized. Call initMusicHook first.');
  }
  return playerStore;
};
export const lrcArray = ref<ILyricText[]>([]); // 歌词数组
export const lrcTimeArray = ref<number[]>([]); // 歌词时间数组
export const nowTime = ref(0); // 当前播放时间
export const allTime = ref(0); // 总播放时间
export const nowIndex = ref(0); // 当前播放歌词
export const currentLrcProgress = ref(0); // 来存储当前歌词的进度
export const sound = ref<HTMLAudioElement | null>(audioService.getCurrentSound());
export const isLyricWindowOpen = ref(false); // 新增状态
export const textColors = ref<any>(getTextColors());

// 这些 computed 属性需要在初始化后创建
export let playMusic: ComputedRef<SongResult>;
export let artistList: ComputedRef<Artist[]>;

export const musicDB = await useIndexedDB(
  'musicDB',
  [
    { name: 'music', keyPath: 'id' },
    { name: 'music_lyric', keyPath: 'id' },
    { name: 'api_cache', keyPath: 'id' },
    { name: 'music_url_cache', keyPath: 'id' },
    { name: 'music_failed_cache', keyPath: 'id' }
  ],
  3
);

// 键盘事件处理器，在初始化后设置
const setupKeyboardListeners = () => {
  document.onkeyup = (e) => {
    // 检查事件目标是否是输入框元素
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    const store = getPlayerStore();
    switch (e.code) {
      case 'Space':
        if (store.playMusic?.id) {
          void store.setPlay({ ...store.playMusic });
        }
        break;
      default:
    }
  };
};

let audioListenersInitialized = false;

/**
 * 解析歌词字符串并转换为ILyricText格式
 * @param lyricsStr 歌词字符串
 * @returns 解析后的歌词数据
 */
const parseLyricsString = async (
  lyricsStr: string
): Promise<{ lrcArray: ILyricText[]; lrcTimeArray: number[]; hasWordByWord: boolean }> => {
  if (!lyricsStr || typeof lyricsStr !== 'string') {
    return { lrcArray: [], lrcTimeArray: [], hasWordByWord: false };
  }

  try {
    const parseResult = parseLyrics(lyricsStr);
    console.log('parseResult', parseResult);

    if (!parseResult.success) {
      console.error('歌词解析失败:', parseResult.error.message);
      return { lrcArray: [], lrcTimeArray: [], hasWordByWord: false };
    }

    const { lyrics } = parseResult.data;
    const lrcArray: ILyricText[] = [];
    const lrcTimeArray: number[] = [];
    let hasWordByWord = false;

    for (const line of lyrics) {
      // 检查是否有逐字歌词
      const hasWords = line.words && line.words.length > 0;
      if (hasWords) {
        hasWordByWord = true;
      }

      lrcArray.push({
        text: line.fullText,
        trText: '', // 翻译文本稍后处理
        words: hasWords
          ? line.words.map((word) => ({
              ...word
            }))
          : undefined,
        hasWordByWord: hasWords,
        startTime: line.startTime,
        duration: line.duration
      });

      lrcTimeArray.push(line.startTime);
    }
    return { lrcArray, lrcTimeArray, hasWordByWord };
  } catch (error) {
    console.error('解析歌词时发生错误:', error);
    return { lrcArray: [], lrcTimeArray: [], hasWordByWord: false };
  }
};

// 设置音乐相关的监听器
const setupMusicWatchers = () => {
  const store = getPlayerStore();

  // 监听 playerStore.playMusic 的变化以更新歌词数据
  watch(
    () => store.playMusic.id,
    async (newId, oldId) => {
      // 如果没有歌曲ID，清空歌词
      if (!newId) {
        lrcArray.value = [];
        lrcTimeArray.value = [];
        nowIndex.value = 0;
        return;
      }

      // 避免相同ID的重复执行(但允许初始化时执行)
      if (newId === oldId && lrcArray.value.length > 0) return;

      // 歌曲切换时重置歌词索引
      if (newId !== oldId) {
        nowIndex.value = 0;
      }

      await nextTick(async () => {
        console.log('歌曲切换，更新歌词数据');

        // 检查是否有原始歌词字符串需要解析
        const lyricData = playMusic.value.lyric;
        if (lyricData && typeof lyricData === 'string') {
          // 如果歌词是字符串格式，使用新的解析器
          const {
            lrcArray: parsedLrcArray,
            lrcTimeArray: parsedTimeArray,
            hasWordByWord
          } = await parseLyricsString(lyricData);
          lrcArray.value = parsedLrcArray;
          lrcTimeArray.value = parsedTimeArray;

          // 更新歌曲的歌词数据结构
          if (playMusic.value.lyric && typeof playMusic.value.lyric === 'object') {
            playMusic.value.lyric.hasWordByWord = hasWordByWord;
          }
        } else if (lyricData && typeof lyricData === 'object' && lyricData.lrcArray?.length > 0) {
          // 使用现有的歌词数据结构
          const rawLrc = lyricData.lrcArray || [];
          lrcTimeArray.value = lyricData.lrcTimeArray || [];

          try {
            const { translateLyrics } = await import('@/services/lyricTranslation');
            lrcArray.value = await translateLyrics(rawLrc as any);
          } catch (e) {
            console.error('翻译歌词失败，使用原始歌词：', e);
            lrcArray.value = rawLrc as any;
          }
        } else if (isElectron && playMusic.value.playMusicUrl?.startsWith('local:///')) {
          // 从下载/本地文件的 ID3/FLAC 元数据中提取嵌入歌词
          try {
            let filePath = decodeURIComponent(
              playMusic.value.playMusicUrl.replace('local:///', '')
            );
            // 处理 Windows 路径：/C:/... → C:/...
            if (/^\/[a-zA-Z]:\//.test(filePath)) {
              filePath = filePath.slice(1);
            }
            const embeddedLyrics = await window.api.getEmbeddedLyrics(filePath);
            if (embeddedLyrics) {
              const {
                lrcArray: parsedLrcArray,
                lrcTimeArray: parsedTimeArray,
                hasWordByWord
              } = await parseLyricsString(embeddedLyrics);
              lrcArray.value = parsedLrcArray;
              lrcTimeArray.value = parsedTimeArray;
              if (playMusic.value.lyric && typeof playMusic.value.lyric === 'object') {
                (playMusic.value.lyric as any).hasWordByWord = hasWordByWord;
              }
            } else {
              // 无嵌入歌词 — 若有数字 ID，尝试 API 兜底
              const songId = playMusic.value.id;
              if (songId && typeof songId === 'number') {
                try {
                  const { getMusicLrc } = await import('@/api/music');
                  const res = await getMusicLrc(songId);
                  if (res?.data?.lrc?.lyric) {
                    const { lrcArray: apiLrcArray, lrcTimeArray: apiTimeArray } =
                      await parseLyricsString(res.data.lrc.lyric);
                    lrcArray.value = apiLrcArray;
                    lrcTimeArray.value = apiTimeArray;
                  }
                } catch (apiErr) {
                  console.error('API lyrics fallback failed:', apiErr);
                }
              }
            }
          } catch (err) {
            console.error('Failed to extract embedded lyrics:', err);
          }
        } else {
          // 无歌词数据
          lrcArray.value = [];
          lrcTimeArray.value = [];
        }
        // 当歌词数据更新时，如果歌词窗口打开，则发送数据
        if (isElectron && isLyricWindowOpen.value) {
          console.log('歌词窗口已打开，同步最新歌词数据');
          // 不管歌词数组是否为空，都发送最新数据
          sendLyricToWin();

          // 再次延迟发送，确保歌词窗口已完全加载
          setTimeout(() => {
            sendLyricToWin();
          }, 500);
        }
      });
    },
    { immediate: true }
  );
};

const setupAudioListeners = () => {
  // 监听器只注册一次，避免重复绑定和误清理全局恢复监听器
  if (audioListenersInitialized) {
    return () => {};
  }
  audioListenersInitialized = true;

  let interval: number | null = null;
  // 播放状态恢复定时器：当 interval 因异常被清除时，自动恢复
  let recoveryTimer: number | null = null;
  let lyricThrottleCounter = 0;
  let lastSavedProgress = 0;

  const clearInterval = () => {
    if (interval) {
      window.clearInterval(interval);
      interval = null;
    }
  };

  const stopRecovery = () => {
    if (recoveryTimer) {
      window.clearInterval(recoveryTimer);
      recoveryTimer = null;
    }
  };

  /**
   * 启动进度更新 interval
   * 从 audioService 实时获取 sound 引用，避免闭包中 sound.value 过期
   */
  const startProgressInterval = () => {
    clearInterval();
    interval = window.setInterval(() => {
      try {
        // 每次从 audioService 获取最新的 sound 引用，而不是依赖闭包中的 sound.value
        const currentSound = audioService.getCurrentSound();
        if (!currentSound) {
          // sound 暂时为空（可能在切歌/重建中），不清除 interval，等待恢复
          return;
        }

        const currentTime = currentSound.currentTime;
        if (typeof currentTime !== 'number' || Number.isNaN(currentTime)) {
          // 无效时间，跳过本次更新
          return;
        }

        // 同步 sound.value 引用（确保外部也能拿到最新的）
        if (sound.value !== currentSound) {
          sound.value = currentSound;
        }

        nowTime.value = currentTime;
        allTime.value = currentSound.duration;

        // === 歌词索引更新 ===
        const newIndex = getLrcIndex(nowTime.value);
        if (newIndex !== nowIndex.value) {
          nowIndex.value = newIndex;
          currentLrcProgress.value = 0; // 换行时重置进度
          if (isElectron && isLyricWindowOpen.value) {
            sendLyricToWin();
          }
        }

        // === 逐字歌词行内进度 ===
        const { start, end } = currentLrcTiming.value;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
          const elapsed = currentTime - start;
          const duration = end - start;
          const progress = (elapsed / duration) * 100;
          currentLrcProgress.value = Math.min(Math.max(progress, 0), 100);
        }

        // === 节流发送轻量歌词进度更新（每 ~200ms / 约每 4 个 tick）===
        lyricThrottleCounter++;
        if (isElectron && isLyricWindowOpen.value && lyricThrottleCounter % 4 === 0) {
          try {
            window.api.sendLyric(
              JSON.stringify({
                type: 'update',
                nowIndex: nowIndex.value,
                nowTime: nowTime.value,
                isPlay: getPlayerStore().play
              })
            );
          } catch {
            // 忽略发送失败
          }
        }

        // === localStorage 进度保存（每 ~2 秒）===
        if (
          Math.floor(currentTime) % 2 === 0 &&
          Math.floor(currentTime) !== Math.floor(lastSavedProgress)
        ) {
          lastSavedProgress = currentTime;
          if (getPlayerStore().playMusic?.id) {
            localStorage.setItem(
              'playProgress',
              JSON.stringify({
                songId: getPlayerStore().playMusic.id,
                progress: currentTime
              })
            );
          }
        }
      } catch (error) {
        console.error('进度更新 interval 出错:', error);
        // 出错时不清除 interval，让下一次 tick 继续尝试
      }
    }, 50);
  };

  /**
   * 启动播放状态恢复监控
   * 每 500ms 检查一次：如果 store 认为在播放但 interval 已丢失，则恢复
   */
  const startRecoveryMonitor = () => {
    stopRecovery();
    recoveryTimer = window.setInterval(() => {
      try {
        const store = getPlayerStore();
        if (store.play && !interval) {
          const currentSound = audioService.getCurrentSound();
          if (currentSound && !currentSound.paused) {
            console.warn('[MusicHook] 检测到播放中但 interval 丢失，自动恢复');
            startProgressInterval();
          }
        }
      } catch {
        // 静默忽略
      }
    }, 500);
  };

  // 启动恢复监控
  startRecoveryMonitor();

  // 监听seek开始事件，立即更新UI
  audioService.on('seek_start', (time) => {
    // 直接更新显示位置，不检查拖动状态
    nowTime.value = time;
  });

  // 监听seek完成事件
  audioService.on('seek', () => {
    try {
      const currentSound = audioService.getCurrentSound();
      if (currentSound) {
        // 立即更新显示时间，不进行任何检查
        const currentTime = currentSound.currentTime;
        if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
          nowTime.value = currentTime;

          // 检查是否需要更新歌词
          const newIndex = getLrcIndex(nowTime.value);
          if (newIndex !== nowIndex.value) {
            nowIndex.value = newIndex;
            if (isElectron && isLyricWindowOpen.value) {
              sendLyricToWin();
            }
          }
        }
      }
    } catch (error) {
      console.error('处理seek事件出错:', error);
    }
  });

  // 立即更新一次时间和进度（解决初始化时进度条不显示问题）
  const updateCurrentTimeAndDuration = () => {
    const currentSound = audioService.getCurrentSound();
    if (currentSound) {
      try {
        // 更新当前时间和总时长
        const currentTime = currentSound.currentTime;
        if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
          nowTime.value = currentTime;
          allTime.value = currentSound.duration;
        }
      } catch (error) {
        console.error('初始化时间和进度失败:', error);
      }
    }
  };

  // 立即执行一次更新
  updateCurrentTimeAndDuration();

  // 监听播放
  audioService.on('play', () => {
    getPlayerStore().setPlayMusic(true);
    if (isElectron) {
      window.api.sendSong(cloneDeep(getPlayerStore().playMusic));
    }
    // 启动进度更新
    startProgressInterval();
  });

  // 监听暂停
  audioService.on('pause', () => {
    console.log('音频暂停事件触发');
    getPlayerStore().setPlayMusic(false);
    clearInterval();
    if (isElectron && isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  });

  const replayMusic = async (retryCount = 0) => {
    const MAX_REPLAY_RETRIES = 3;
    try {
      if (getPlayerStore().playMusicUrl && playMusic.value) {
        await audioService.play(getPlayerStore().playMusicUrl, playMusic.value);
        sound.value = audioService.getCurrentSound();
        setupAudioListeners();
      } else {
        console.error('单曲循环：无可用 URL 或歌曲数据');
        const { usePlaylistStore } = await import('@/store/modules/playlist');
        usePlaylistStore().nextPlayOnEnd();
      }
    } catch (error) {
      console.error('单曲循环重播失败:', error);
      if (retryCount < MAX_REPLAY_RETRIES) {
        setTimeout(() => replayMusic(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        const { usePlaylistStore } = await import('@/store/modules/playlist');
        usePlaylistStore().nextPlayOnEnd();
      }
    }
  };

  // 监听结束
  audioService.on('end', async () => {
    console.log('音频播放结束事件触发');
    clearInterval();

    if (getPlayerStore().playMode === 1) {
      // 单曲循环模式
      replayMusic();
    } else if (getPlayerStore().isFmPlaying) {
      // 私人FM模式：自动获取下一首
      try {
        const { getPersonalFM } = await import('@/api/home');
        const res = await getPersonalFM();
        const songs = res.data?.data;
        if (Array.isArray(songs) && songs.length > 0) {
          const song = songs[0];
          const fmSong = {
            id: song.id,
            name: song.name,
            picUrl: song.al?.picUrl || song.album?.picUrl,
            ar: song.artists || song.ar,
            al: song.al || song.album,
            source: 'netease' as const,
            song,
            ...song,
            playLoading: false
          } as any;
          const { usePlaylistStore } = await import('@/store/modules/playlist');
          const playlistStore = usePlaylistStore();
          playlistStore.setPlayList([fmSong], false, false);
          getPlayerStore().isFmPlaying = true; // setPlayList 会清除，需重设
          const { playTrack } = await import('@/services/playbackController');
          await playTrack(fmSong, true);
        } else {
          getPlayerStore().setIsPlay(false);
        }
      } catch (error) {
        console.error('FM自动播放下一首失败:', error);
        getPlayerStore().setIsPlay(false);
      }
    } else {
      // 顺序播放、列表循环、随机播放模式：歌曲自然结束
      const { usePlaylistStore } = await import('@/store/modules/playlist');
      usePlaylistStore().nextPlayOnEnd();
    }
  });

  audioService.on('previoustrack', () => {
    getPlayerStore().prevPlay();
  });

  audioService.on('nexttrack', () => {
    getPlayerStore().nextPlay();
  });

  return () => {
    clearInterval();
    stopRecovery();
  };
};

export const play = () => {
  const currentSound = audioService.getCurrentSound();
  if (currentSound) {
    currentSound.play();
  }
};

export const pause = () => {
  const currentSound = audioService.getCurrentSound();
  if (currentSound) {
    try {
      // 保存当前播放进度
      const currentTime = currentSound.currentTime;
      if (getPlayerStore().playMusic && getPlayerStore().playMusic.id) {
        localStorage.setItem(
          'playProgress',
          JSON.stringify({
            songId: getPlayerStore().playMusic.id,
            progress: currentTime
          })
        );
      }

      audioService.pause();
    } catch (error) {
      console.error('暂停播放出错:', error);
    }
  }
};

// 歌词矫正时间映射（每首歌独立）
const CORRECTION_KEY = 'lyric-correction-map';
const correctionTimeMap = ref<Record<string, number>>({});

// 初始化 correctionTimeMap
const loadCorrectionMap = () => {
  try {
    const raw = localStorage.getItem(CORRECTION_KEY);
    correctionTimeMap.value = raw ? JSON.parse(raw) : {};
  } catch {
    correctionTimeMap.value = {};
  }
};
const saveCorrectionMap = () => {
  localStorage.setItem(CORRECTION_KEY, JSON.stringify(correctionTimeMap.value));
};

loadCorrectionMap();

// 歌词矫正时间，当前歌曲
export const correctionTime = ref(0);

// 设置歌词矫正时间的监听器
const setupCorrectionTimeWatcher = () => {
  // 切歌时自动读取矫正时间
  watch(
    () => playMusic.value?.id,
    (id) => {
      if (!id) return;
      correctionTime.value = correctionTimeMap.value[id] ?? 0;
    },
    { immediate: true }
  );
};

/**
 * 调整歌词矫正时间（每首歌独立）
 * @param delta 增加/减少的秒数（正为加，负为减）
 */
export const adjustCorrectionTime = (delta: number) => {
  const id = playMusic.value?.id;
  if (!id) return;
  const newVal = Math.max(-10, Math.min(10, (correctionTime.value ?? 0) + delta));
  correctionTime.value = newVal;
  correctionTimeMap.value[id] = newVal;
  saveCorrectionMap();
};

// 获取当前播放歌词
export const isCurrentLrc = (index: number, time: number): boolean => {
  const currentTime = lrcTimeArray.value[index];

  // 如果是最后一句歌词，只需要判断时间是否大于等于当前句的开始时间
  if (index === lrcTimeArray.value.length - 1) {
    const correctedTime = time + correctionTime.value;
    return correctedTime >= currentTime;
  }

  // 非最后一句歌词，需要判断时间在当前句和下一句之间
  const nextTime = lrcTimeArray.value[index + 1];
  const correctedTime = time + correctionTime.value;
  return correctedTime >= currentTime && correctedTime < nextTime;
};

// 获取当前播放歌词INDEX
export const getLrcIndex = (time: number): number => {
  const correctedTime = time + correctionTime.value;

  // 如果歌词数组为空，返回当前索引
  if (lrcTimeArray.value.length === 0) {
    return nowIndex.value;
  }

  // 处理最后一句歌词的情况
  const lastIndex = lrcTimeArray.value.length - 1;
  if (correctedTime >= lrcTimeArray.value[lastIndex]) {
    nowIndex.value = lastIndex;
    return lastIndex;
  }

  // 查找当前时间对应的歌词索引
  for (let i = 0; i < lrcTimeArray.value.length - 1; i++) {
    const currentTime = lrcTimeArray.value[i];
    const nextTime = lrcTimeArray.value[i + 1];

    if (correctedTime >= currentTime && correctedTime < nextTime) {
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
  const currentTime = nowTime.value + correctionTime.value;
  const start = lrcTimeArray.value[index];
  const end = lrcTimeArray.value[index + 1] ?? start + 1;

  if (currentTime >= start && currentTime < end) {
    // 当前句，显示进度
    const progress = ((currentTime - start) / (end - start)) * 100;
    return {
      backgroundImage: `linear-gradient(to right, #ffffff ${progress}%, #ffffff8a ${progress}%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      transition: 'background-image 0.1s linear'
    };
  }
  // 其它句
  return {};
};

// 播放进度
export const useLyricProgress = () => {
  // 如果已经在全局更新进度，立即返回
  return {
    getLrcStyle
  };
};

// 设置当前播放时间
export const setAudioTime = (index: number) => {
  const currentSound = sound.value;
  if (!currentSound) return;

  audioService.seek(lrcTimeArray.value[index]);
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
    return;
  }

  // 检查是否有播放的歌曲
  if (!playMusic.value || !playMusic.value.id) {
    return;
  }

  try {
    // 记录歌词发送状态
    if (lrcArray.value && lrcArray.value.length > 0) {
      const nowIndex = getLrcIndex(nowTime.value);
      // 构建完整的歌词更新数据
      const updateData = {
        type: 'full',
        nowIndex,
        nowTime: nowTime.value,
        startCurrentTime: lrcTimeArray.value[nowIndex] || 0,
        nextTime: lrcTimeArray.value[nowIndex + 1] || 0,
        isPlay: getPlayerStore().play,
        lrcArray: lrcArray.value,
        lrcTimeArray: lrcTimeArray.value,
        allTime: allTime.value,
        playMusic: playMusic.value
      };

      // 发送数据到歌词窗口
      window.api.sendLyric(JSON.stringify(updateData));
    } else {
      console.log('No lyric data available, sending empty lyric message');

      // 发送没有歌词的提示
      const emptyLyricData = {
        type: 'empty',
        nowIndex: 0,
        nowTime: nowTime.value,
        startCurrentTime: 0,
        nextTime: 0,
        isPlay: getPlayerStore().play,
        lrcArray: [{ text: '当前歌曲暂无歌词', trText: '' }],
        lrcTimeArray: [0],
        allTime: allTime.value,
        playMusic: playMusic.value
      };
      window.api.sendLyric(JSON.stringify(emptyLyricData));
    }
  } catch (error) {
    console.error('Error sending lyric update:', error);
  }
};

// 歌词同步定时器
let lyricSyncInterval: any = null;

// 开始歌词同步
const startLyricSync = () => {
  // 清除已有的定时器
  if (lyricSyncInterval) {
    clearInterval(lyricSyncInterval);
  }

  // 每秒同步一次歌词数据
  lyricSyncInterval = setInterval(() => {
    if (isElectron && isLyricWindowOpen.value && getPlayerStore().play && playMusic.value?.id) {
      // 发送当前播放进度的更新
      try {
        const updateData = {
          type: 'update',
          nowIndex: getLrcIndex(nowTime.value),
          nowTime: nowTime.value,
          isPlay: getPlayerStore().play
        };
        window.api.sendLyric(JSON.stringify(updateData));
      } catch (error) {
        console.error('发送歌词进度更新失败:', error);
      }
    }
  }, 1000);
};

// 停止歌词同步
const stopLyricSync = () => {
  if (lyricSyncInterval) {
    clearInterval(lyricSyncInterval);
    lyricSyncInterval = null;
  }
};

// 修改openLyric函数，添加定时同步
export const openLyric = () => {
  if (!isElectron) return;

  // 检查是否有播放中的歌曲
  if (!playMusic.value || !playMusic.value.id) {
    console.log('没有正在播放的歌曲，无法打开歌词窗口');
    return;
  }

  console.log('Opening lyric window with current song:', playMusic.value?.name);

  isLyricWindowOpen.value = !isLyricWindowOpen.value;
  if (isLyricWindowOpen.value) {
    // 立即打开窗口
    window.api.openLyric();

    // 确保有歌词数据，如果没有，则使用默认的"无歌词"提示
    if (!lrcArray.value || lrcArray.value.length === 0) {
      // 如果当前播放的歌曲有ID但没有歌词，则尝试加载歌词
      console.log('尝试加载歌词数据...');
      // 发送默认的"无歌词"数据
      const emptyLyricData = {
        type: 'empty',
        nowIndex: 0,
        nowTime: nowTime.value,
        startCurrentTime: 0,
        nextTime: 0,
        isPlay: getPlayerStore().play,
        lrcArray: [{ text: '加载歌词中...', trText: '' }],
        lrcTimeArray: [0],
        allTime: allTime.value,
        playMusic: playMusic.value
      };
      window.api.sendLyric(JSON.stringify(emptyLyricData));
    } else {
      // 发送完整歌词数据
      sendLyricToWin();
    }

    // 延迟重发一次，以防窗口加载略慢
    setTimeout(() => {
      if (isLyricWindowOpen.value) {
        sendLyricToWin();
      }
    }, 500);

    // 启动歌词同步
    startLyricSync();
  } else {
    closeLyric();
    // 停止歌词同步
    stopLyricSync();
  }
};

// 修改closeLyric函数，确保停止定时同步
export const closeLyric = () => {
  if (!isElectron) return;
  isLyricWindowOpen.value = false; // 确保状态更新
  windowData.electron.ipcRenderer.send('close-lyric');

  // 停止歌词同步
  stopLyricSync();
};

// 设置播放状态监听器
const setupPlayStateWatcher = () => {
  // 在组件挂载时设置对播放状态的监听
  watch(
    () => getPlayerStore().play,
    (isPlaying) => {
      // 如果歌词窗口打开，根据播放状态控制同步
      if (isElectron && isLyricWindowOpen.value) {
        if (isPlaying) {
          startLyricSync();
        } else {
          // 如果暂停播放，发送一次暂停状态的更新
          const pauseData = {
            type: 'update',
            isPlay: false
          };
          window.api.sendLyric(JSON.stringify(pauseData));
        }
      }
    }
  );
};

// 在组件卸载时清理资源
onUnmounted(() => {
  stopLyricSync();
});

// 导出歌词解析函数供外部使用
export { parseLyricsString };

// 添加播放控制命令监听
if (isElectron) {
  windowData.electron.ipcRenderer.on('lyric-control-back', (_, command: string) => {
    switch (command) {
      case 'playpause':
        if (getPlayerStore().playMusic?.id) {
          void getPlayerStore().setPlay({ ...getPlayerStore().playMusic });
        }
        break;
      case 'prev':
        getPlayerStore().prevPlay();
        break;
      case 'next':
        getPlayerStore().nextPlay();
        break;
      case 'close':
        isLyricWindowOpen.value = false; // 确保状态更新
        break;
      default:
        console.log('Unknown command:', command);
        break;
    }
  });
}

// 在组件挂载时设置监听器
export const initAudioListeners = async () => {
  try {
    // 确保有正在播放的音乐
    if (!getPlayerStore().playMusic || !getPlayerStore().playMusic.id) {
      console.log('没有正在播放的音乐，跳过音频监听器初始化');
      return;
    }

    // 确保有音频实例
    const initialSound = audioService.getCurrentSound();
    if (!initialSound) {
      console.log('没有音频实例，等待音频加载...');
      // 等待音频加载完成
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          const sound = audioService.getCurrentSound();
          if (sound) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // 设置超时
        setTimeout(() => {
          clearInterval(checkInterval);
          console.log('等待音频加载超时');
          resolve();
        }, 5000);
      });
    }

    // 初始化音频监听器
    setupAudioListeners();

    // 监听歌词窗口事件
    if (isElectron) {
      window.api.onLyricWindowClosed(() => {
        isLyricWindowOpen.value = false;
      });
      // 歌词窗口 Vue 加载完成后，发送完整歌词数据
      window.api.onLyricWindowReady(() => {
        if (isLyricWindowOpen.value) {
          sendLyricToWin();
        }
      });
    }

    // 获取最新的音频实例
    const finalSound = audioService.getCurrentSound();
    if (finalSound) {
      // 更新全局 sound 引用
      sound.value = finalSound;
    } else {
      console.warn('无法获取音频实例，跳过进度更新初始化');
    }
  } catch (error) {
    console.error('初始化音频监听器失败:', error);
  }
};

// 添加音频就绪事件监听器
window.addEventListener('audio-ready', ((event: CustomEvent) => {
  try {
    const { sound: newSound } = event.detail;
    if (newSound) {
      // 更新本地 sound 引用
      sound.value = audioService.getCurrentSound();

      // 设置音频监听器
      setupAudioListeners();

      // 获取当前播放位置并更新显示
      const currentSound = audioService.getCurrentSound();
      if (currentSound) {
        const currentPosition = currentSound.currentTime;
        if (typeof currentPosition === 'number' && !Number.isNaN(currentPosition)) {
          nowTime.value = currentPosition;
        }
      }

      console.log('音频就绪，已设置监听器并更新进度显示');
    }
  } catch (error) {
    console.error('处理音频就绪事件出错:', error);
  }
}) as EventListener);
