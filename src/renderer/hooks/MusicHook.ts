import { cloneDeep } from 'lodash';
import { computed, type ComputedRef, nextTick, ref, watch } from 'vue';

import useIndexedDB from '@/hooks/IndexDBHook';
import { audioService } from '@/services/audioService';
import type { usePlayerStore } from '@/store';
import type { Artist, ILyricText, SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import { getTextColors } from '@/utils/linearColor';
import {
  detectPreviewLyricBaseSec,
  isPreviewStreamUrl,
  restorePreviewStreamFlags
} from '@/utils/previewStream';
import { parseLyrics } from '@/utils/yrcParser';

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
export const textColors = ref<any>(getTextColors());

// 这些 computed 属性需要在初始化后创建
export let playMusic: ComputedRef<SongResult>;
export let artistList: ComputedRef<Artist[]>;

let lastIndex = -1;

// 缓存平台信息，避免每次歌词变化时同步 IPC 调用
const cachedPlatform = isElectron ? window.api.getPlatform() : 'web';

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

// 键盘事件处理器（提取为命名函数，防止重复注册）
const handleKeyUp = (e: KeyboardEvent) => {
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

const setupKeyboardListeners = () => {
  document.removeEventListener('keyup', handleKeyUp);
  document.addEventListener('keyup', handleKeyUp);
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
      // 作词/作曲等元信息不走逐字
      const credit =
        /^(作词|作曲|编曲|制作人|制作|混音|录音|出品|原唱|翻唱|演唱|监制|和声|by|composer|lyricist)[:：\s]/i.test(
          (line.fullText || '').trim()
        );
      const hasWords = !credit && !!(line.words && line.words.length > 0);
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

      // yrcParser 的 startTime 是毫秒；lrcTimeArray 全链路（nowTime 对比、
      // setAudioTime seek）以秒为单位，必须换算，否则点击歌词会 seek 到
      // 远超时长的位置被钳到末尾、直接触发切歌
      lrcTimeArray.push(line.startTime / 1000);
    }
    return { lrcArray, lrcTimeArray, hasWordByWord };
  } catch (error) {
    console.error('解析歌词时发生错误:', error);
    return { lrcArray: [], lrcTimeArray: [], hasWordByWord: false };
  }
};

const ensureLyricsLoaded = async (force = false) => {
  const songId = playMusic.value?.id;
  if (!songId) {
    lrcArray.value = [];
    lrcTimeArray.value = [];
    nowIndex.value = 0;
    return;
  }
  if (!force && lrcArray.value.length > 0) return;

  await nextTick();

  const lyricData = playMusic.value.lyric;
  if (lyricData && typeof lyricData === 'string') {
    const {
      lrcArray: parsedLrcArray,
      lrcTimeArray: parsedTimeArray,
      hasWordByWord
    } = await parseLyricsString(lyricData);
    lrcArray.value = parsedLrcArray;
    lrcTimeArray.value = parsedTimeArray;

    if (playMusic.value.lyric && typeof playMusic.value.lyric === 'object') {
      playMusic.value.lyric.hasWordByWord = hasWordByWord;
    }
  } else if (lyricData && typeof lyricData === 'object' && lyricData.lrcArray?.length > 0) {
    const rawLrc = lyricData.lrcArray || [];
    lrcTimeArray.value = lyricData.lrcTimeArray || [];

    try {
      lrcArray.value = rawLrc as any;
    } catch (e) {
      console.error('翻译歌词失败，使用原始歌词：', e);
      lrcArray.value = rawLrc as any;
    }
  } else if (isElectron && playMusic.value.playMusicUrl?.startsWith('local:///')) {
    try {
      let filePath = decodeURIComponent(playMusic.value.playMusicUrl.replace('local:///', ''));
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
      }
    } catch (err) {
      console.error('Failed to extract embedded lyrics:', err);
    }
  } else if (isElectron && songId) {
    // 元数据未到：主动 loadLrc（含译文），避免只显示旧歌或空
    try {
      const { loadLrc } = await import('@/hooks/usePlayerHooks');
      const loaded = await loadLrc(songId);
      if (loaded.lrcArray?.length) {
        lrcArray.value = loaded.lrcArray as any;
        lrcTimeArray.value = loaded.lrcTimeArray || [];
        if (playMusic.value) {
          playMusic.value.lyric = loaded;
        }
        console.log(
          `[ensureLyricsLoaded] loadLrc ok tr=${loaded.lrcArray.filter((l) => l.trText).length}/${loaded.lrcArray.length}`
        );
      }
    } catch (e) {
      console.warn('[ensureLyricsLoaded] loadLrc failed:', e);
    }
  }
};

const setupMusicWatchers = () => {
  const store = getPlayerStore();

  // 切歌时 id 变化, 强制重新解析
  watch(
    () => store.playMusic.id,
    async (newId, oldId) => {
      if (newId !== oldId) nowIndex.value = 0;
      await ensureLyricsLoaded(true);
    },
    { immediate: true }
  );

  // 同一首歌但 lyric 字段后到 (播放后异步加载元数据 / 重启 + autoPlay 关闭场景)
  watch(
    () => playMusic.value?.lyric,
    (newLyric) => {
      if (!playMusic.value?.id) return;
      // 完整歌词对象（含 yrc 逐字/翻译，时间单位为秒）后到时强制重新解析，
      // 替换掉先行的 API 兜底纯 lrc 歌词
      const isRichLyric =
        !!newLyric && typeof newLyric === 'object' && (newLyric.lrcArray?.length ?? 0) > 0;
      if (lrcArray.value.length === 0 || isRichLyric) {
        ensureLyricsLoaded(isRichLyric);
      }
    }
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

        // 每首歌 duration 就绪后校准一次试听偏移（切回已缓存曲目时 flag 可能丢）
        const sid = String(playMusic.value?.id || '');
        if (
          sid &&
          sid !== lastLyricBaseRefineSongId &&
          currentSound.duration > 1 &&
          Number.isFinite(currentSound.duration)
        ) {
          lastLyricBaseRefineSongId = sid;
          refineLyricTimeBaseFromAudio(currentSound.duration);
        }

        // === 歌词索引更新 ===
        const newIndex = getLrcIndex(nowTime.value);
        if (newIndex !== nowIndex.value) {
          nowIndex.value = newIndex;
          currentLrcProgress.value = 0; // 换行时重置进度
        }
        if (isElectron && lrcArray.value[nowIndex.value]) {
          if (lastIndex !== nowIndex.value) {
            sendTrayLyric(nowIndex.value);
            lastIndex = nowIndex.value;
          }
        }

        // === 逐字歌词行内进度（全曲时间轴）===
        const { start, end } = currentLrcTiming.value;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
          const lyricNow = getLyricClockSec(currentTime);
          const elapsed = lyricNow - start;
          const duration = end - start;
          const progress = (elapsed / duration) * 100;
          currentLrcProgress.value = Math.min(Math.max(progress, 0), 100);
        }

        // === 节流发送轻量歌词进度更新（每 ~200ms / 约每 4 个 tick）===
        lyricThrottleCounter++;

        // === localStorage 进度保存（每 ~2 秒）===
        if (
          Math.floor(currentTime) % 2 === 0 &&
          Math.floor(currentTime) !== Math.floor(lastSavedProgress)
        ) {
          lastSavedProgress = currentTime;
          if (getPlayerStore().playMusic?.id) {
            void import('@/services/persistenceService').then(
              ({ persistenceService, playProgressSchema }) => {
                persistenceService.save(playProgressSchema, {
                  songId: getPlayerStore().playMusic.id,
                  progress: currentTime
                });
              }
            );
          }
        }

        // === MPRIS 进度更新（每 ~1 秒）===
        if (isElectron && lyricThrottleCounter % 20 === 0) {
          try {
            window.api.mprisPositionUpdate(currentTime);
          } catch {
            // 忽略发送失败
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

          // === MPRIS seek 时同步进度 ===
          if (isElectron) {
            window.api.mprisPositionUpdate(currentTime);
          }

          // 检查是否需要更新歌词
          const newIndex = getLrcIndex(nowTime.value);
          if (newIndex !== nowIndex.value) {
            nowIndex.value = newIndex;
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
    // 兜底: 重启后首次点播放时 lrcArray 仍为空则主动加载
    if (lrcArray.value.length === 0 && playMusic.value?.id) {
      ensureLyricsLoaded();
    }
    startProgressInterval();
  });

  // 监听暂停
  audioService.on('pause', () => {
    console.log('音频暂停事件触发');
    getPlayerStore().setPlayMusic(false);
    clearInterval();
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
      return;
    }

    // 其他模式（FM/顺序/列表循环/随机）：交给 playlist store 路由
    const { usePlaylistStore } = await import('@/store/modules/playlist');
    usePlaylistStore().nextPlayOnEnd();
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
        void import('@/services/persistenceService').then(
          ({ persistenceService, playProgressSchema }) => {
            persistenceService.save(playProgressSchema, {
              songId: getPlayerStore().playMusic.id,
              progress: currentTime
            });
          }
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

/**
 * 试听流时间基准（秒）：音频 t=0 对应全曲该时刻。
 * 全曲播放时为 0；VIP 试听为 preview.startMs/1000。
 */
export const lyricTimeBaseSec = ref(0);
/** 避免 progress interval 每帧 refine */
let lastLyricBaseRefineSongId = '';

/** 歌词用时间 = 音频进度 + 人工矫正 + 试听偏移 */
export const getLyricClockSec = (audioTimeSec?: number): number => {
  const t = audioTimeSec ?? nowTime.value;
  return t + (correctionTime.value || 0) + (lyricTimeBaseSec.value || 0);
};

const syncLyricTimeBaseFromSong = (song?: SongResult | null) => {
  if (!song) {
    lyricTimeBaseSec.value = 0;
    lastLyricBaseRefineSongId = '';
    return;
  }
  // 复用缓存 URL 时补回 isPreviewStream（切回第一首的主因）
  restorePreviewStreamFlags(song);
  const isPrev = Boolean(song.isPreviewStream || isPreviewStreamUrl(song.playMusicUrl));
  if (isPrev && Number(song.preview?.startMs) > 0) {
    lyricTimeBaseSec.value = Math.max(0, Number(song.preview?.startMs) || 0) / 1000;
    return;
  }
  // 非试听 / 缺 startMs：先清零，等 duration refine 或 re-resolve
  if (!isPrev) {
    lyricTimeBaseSec.value = 0;
  }
};

/** 音频 duration 就绪后兜底校准（切回第一首时常靠这个） */
export const refineLyricTimeBaseFromAudio = (audioDurationSec: number) => {
  const song = playMusic.value;
  if (!song?.id) return;
  const base = detectPreviewLyricBaseSec(song, audioDurationSec);
  if (Math.abs(base - lyricTimeBaseSec.value) > 0.05) {
    lyricTimeBaseSec.value = base;
    console.log(
      `[lyric] refine base=${base.toFixed(2)}s from audioDur=${audioDurationSec.toFixed(1)}s song=${song.name}`
    );
  }
};

// 设置歌词矫正时间的监听器
const setupCorrectionTimeWatcher = () => {
  // 切歌时自动读取矫正时间 + 试听偏移
  watch(
    () => playMusic.value?.id,
    (id) => {
      if (!id) return;
      correctionTime.value =
        correctionTimeMap.value[String(id)] ?? correctionTimeMap.value[id as any] ?? 0;
      syncLyricTimeBaseFromSong(playMusic.value);
    },
    { immediate: true }
  );
  // resolve / 复用 URL 后 isPreviewStream、playMusicUrl 才齐，必须跟
  watch(
    () =>
      [
        playMusic.value?.id,
        playMusic.value?.isPreviewStream,
        playMusic.value?.preview?.startMs,
        playMusic.value?.playMusicUrl
      ] as const,
    () => {
      syncLyricTimeBaseFromSong(playMusic.value);
    }
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
  const correctedTime = getLyricClockSec(time);

  // 如果是最后一句歌词，只需要判断时间是否大于等于当前句的开始时间
  if (index === lrcTimeArray.value.length - 1) {
    return correctedTime >= currentTime;
  }

  // 非最后一句歌词，需要判断时间在当前句和下一句之间
  const nextTime = lrcTimeArray.value[index + 1];
  return correctedTime >= currentTime && correctedTime < nextTime;
};

// 获取当前播放歌词INDEX
export const getLrcIndex = (time: number): number => {
  const correctedTime = getLyricClockSec(time);

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
  const currentTime = getLyricClockSec();
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

// 设置当前播放时间（歌词时间为全曲轴；试听需减 base 才是音频 seek）
export const setAudioTime = (index: number) => {
  const currentSound = sound.value;
  if (!currentSound) return;

  const lineSec = lrcTimeArray.value[index] ?? 0;
  const audioSec = Math.max(0, lineSec - (lyricTimeBaseSec.value || 0));
  audioService.seek(audioSec);
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

/** Linux 托盘滚动歌词（与桌面歌词窗无关） */
const sendTrayLyric = (index: number) => {
  if (!isElectron || cachedPlatform !== 'linux') return;

  try {
    const lyric = lrcArray.value[index];
    if (!lyric) return;

    const currentTime = lrcTimeArray.value[index] || 0;
    const nextTime = lrcTimeArray.value[index + 1] || currentTime + 3;
    const duration = nextTime - currentTime;

    const lrcObj = JSON.stringify({
      content: lyric.text || '',
      time: duration.toFixed(1),
      sender: 'LYMusicPlayer'
    });

    window.api.trayLyricUpdate(lrcObj);
  } catch (error) {
    console.error('[TrayLyric] Failed to send:', error);
  }
};

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

// 音频就绪事件处理器（提取为命名函数，防止重复注册）
const handleAudioReady = ((event: CustomEvent) => {
  try {
    const { sound: newSound } = event.detail;
    if (newSound) {
      sound.value = audioService.getCurrentSound();
      setupAudioListeners();

      const currentSound = audioService.getCurrentSound();
      if (currentSound) {
        const currentPosition = currentSound.currentTime;
        if (typeof currentPosition === 'number' && !Number.isNaN(currentPosition)) {
          nowTime.value = currentPosition;
        }
      }
    }
  } catch (error) {
    console.error('处理音频就绪事件出错:', error);
  }
}) as EventListener;

// 先移除再注册，防止重复
window.removeEventListener('audio-ready', handleAudioReady);
window.addEventListener('audio-ready', handleAudioReady);
