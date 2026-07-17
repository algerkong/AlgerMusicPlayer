import { cloneDeep } from 'lodash';
import { computed, type ComputedRef, nextTick, ref, watch } from 'vue';

import useIndexedDB from '@/hooks/IndexDBHook';
import { audioService } from '@/services/audioService';
import type { usePlayerStore } from '@/store';
import type { Artist, ILyricText, SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import {
  detectPreviewLyricBaseSec,
  isPreviewStreamUrl,
  restorePreviewStreamFlags
} from '@/utils/previewStream';
import { injectMakerCredits } from '@/utils/lyricMakerCredits';
import { sameTrackId } from '@/utils/playerUtils';
import { getSongArtists } from '@/utils/songFields';
import { parseLyrics } from '@/utils/yrcParser';

import { getLyricDisplayState } from './lyricDisplayState';

// 全局 playerStore 引用，通过 initMusicHook 函数注入
let playerStore: ReturnType<typeof usePlayerStore> | null = null;
/** HMR / 初始化前占位，避免 playMusic.value 读 undefined 崩整棵树 */
const emptySong = {} as SongResult;

/** 同步读当前 store；HMR 丢引用时为 null，等 initMusicHook / 异步捞回 */
const peekPlayerStore = (): ReturnType<typeof usePlayerStore> | null => playerStore;

/** 异步确保 pinia store 可用（HMR 后 init 前的窗口期） */
const ensurePlayerStoreBound = async (): Promise<ReturnType<typeof usePlayerStore> | null> => {
  if (playerStore) return playerStore;
  try {
    const { usePlayerStore: usePS } = await import('@/store/modules/player');
    playerStore = usePS();
    return playerStore;
  } catch {
    return null;
  }
};

/**
 * 展示层挂 globalThis（见 lyricDisplayState）：HMR 重载本模块不丢逐字。
 * 切歌仍走 clear / ensure；热更新只重绑 store+watch。
 */
const display = getLyricDisplayState();
export const lrcArray = display.lrcArray;
export const lrcTimeArray = display.lrcTimeArray;
export const nowTime = display.nowTime;
export const allTime = display.allTime;
export const nowIndex = display.nowIndex;
export const currentLrcProgress = display.currentLrcProgress;
export const sound = display.sound;
export const textColors = display.textColors;

export const initMusicHook = (store: ReturnType<typeof usePlayerStore>) => {
  playerStore = store;

  // 在 store 注入后初始化需要 store 的功能（可重复调用，适配热更新）
  setupKeyboardListeners();
  setupMusicWatchers();
  setupCorrectionTimeWatcher();

  const sid = store.playMusic?.id != null ? String(store.playMusic.id) : '';
  // HMR 保活：同曲已有逐字 → 不重拉、不清空（旧方案会 force 反而掉到行级）
  if (sid && display.lyricBoundSongId === sid && lyricLinesHaveWords(lrcArray.value)) {
    console.info(`[MusicHook] HMR keep word lyrics id=${sid} lines=${lrcArray.value.length}`);
    return;
  }
  if (sid) {
    void ensureLyricsLoaded(true).then(async () => {
      if (store.playMusic?.id && !lyricLinesHaveWords(lrcArray.value)) {
        await ensureLyricsLoaded(true);
      }
    });
  }
};

const getPlayerStore = () => {
  if (!playerStore) {
    throw new Error('MusicHook not initialized. Call initMusicHook first.');
  }
  return playerStore;
};

// 始终可用的 computed：HMR 重载模块后未再 init 也不会抛 TypeError 拖垮路由
export const playMusic: ComputedRef<SongResult> = computed(() => {
  const s = peekPlayerStore();
  if (!s) return emptySong;
  return (s.playMusic || emptySong) as SongResult;
});
export const artistList: ComputedRef<Artist[]> = computed(() => {
  const s = peekPlayerStore();
  if (!s?.playMusic) return [] as Artist[];
  return getSongArtists(s.playMusic) as Artist[];
});

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
      // 作词/作曲等也保留逐字时间轴（与音源库一致，不剥 words）
      const hasWords = !!(line.words && line.words.length > 0);
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

/** 清空展示层歌词（切歌/发现页对齐 UI 用） */
export const clearDisplayedLyrics = () => {
  lrcArray.value = [];
  lrcTimeArray.value = [];
  nowIndex.value = 0;
  currentLrcProgress.value = 0;
  display.lyricBoundSongId = '';
};

/** 按音频/进度时间算行号，不写 nowIndex（避免副作用干扰 watch） */
const computeLrcIndex = (audioTimeSec: number): number => {
  const times = lrcTimeArray.value;
  if (!times.length) return 0;
  const corrected =
    (Number.isFinite(audioTimeSec) ? audioTimeSec : 0) +
    (correctionTime.value || 0) +
    (lyricTimeBaseSec.value || 0);
  const last = times.length - 1;
  if (corrected >= times[last]) return last;
  if (corrected < times[0]) return 0;
  for (let i = 0; i < last; i++) {
    if (corrected >= times[i] && corrected < times[i + 1]) return i;
  }
  return 0;
};

/** 从当前曲 / 播放列表捞作词作曲（persist 曾丢掉字段时列表里可能还有） */
const resolveMakerCredits = (expectedId: string): { lyricists: string[]; composers: string[] } => {
  const pick = (s?: SongResult | null) => ({
    lyricists: (s?.lyricists || [])
      .map(String)
      .map((x) => x.trim())
      .filter(Boolean),
    composers: (s?.composers || [])
      .map(String)
      .map((x) => x.trim())
      .filter(Boolean)
  });

  if (String(playMusic.value?.id || '') === expectedId) {
    const fromPlay = pick(playMusic.value as SongResult);
    if (fromPlay.lyricists.length || fromPlay.composers.length) return fromPlay;
  }

  const store = peekPlayerStore() as {
    playList?: SongResult[];
    originalPlayList?: SongResult[];
  } | null;
  for (const list of [store?.playList, store?.originalPlayList]) {
    if (!list?.length) continue;
    const hit = list.find((s) => String(s.id) === expectedId);
    if (!hit) continue;
    const fromList = pick(hit);
    if (fromList.lyricists.length || fromList.composers.length) {
      // 写回当前曲，后续切页/HMR 也能用（只补缺失字段，不写 undefined）
      if (String(playMusic.value?.id || '') === expectedId) {
        try {
          const patch: Partial<SongResult> = {};
          if (fromList.lyricists.length) patch.lyricists = fromList.lyricists;
          if (fromList.composers.length) patch.composers = fromList.composers;
          (
            peekPlayerStore() as { patchCurrentSong?: (p: Partial<SongResult>) => void } | null
          )?.patchCurrentSong?.(patch);
        } catch {
          /* ignore */
        }
      }
      return fromList;
    }
  }
  return { lyricists: [], composers: [] };
};

/**
 * 汽水 作词/作曲多在 track.song_maker_team，不在歌词 sentences 里。
 * 仅当已有正文歌词时接到最前；无歌词不单独展示元信息（保持「暂无歌词」空态）。
 */
const prependMakerCredits = (expectedId: string) => {
  if (String(playMusic.value?.id || '') !== expectedId) return;
  // 纯元信息行不算「有歌词」
  if (!lrcArray.value.length) return;
  const { lyricists, composers } = resolveMakerCredits(expectedId);
  if (!lyricists.length && !composers.length) return;

  const next = injectMakerCredits(lrcArray.value, lrcTimeArray.value, lyricists, composers);
  if (!next.added) return;
  lrcArray.value = next.lrcArray;
  lrcTimeArray.value = next.lrcTimeArray;
};

const applyLyricsIfCurrent = (
  expectedId: string,
  loadGen: number,
  parsed: { lrcArray: ILyricText[]; lrcTimeArray: number[]; hasWordByWord?: boolean }
) => {
  // 已发起更新的加载 / 已切到别的歌 → 丢弃
  if (loadGen !== display.lyricLoadGen) return false;
  if (String(playMusic.value?.id || '') !== expectedId) return false;
  lrcArray.value = parsed.lrcArray as any;
  lrcTimeArray.value = parsed.lrcTimeArray || [];
  display.lyricBoundSongId = expectedId;
  prependMakerCredits(expectedId);
  // 禁止钉死 nowIndex=0：播放中重绑歌词（译文/HMR/force）会把跟滚打回首行
  try {
    const t =
      audioService.getCurrentSound()?.currentTime ??
      (Number.isFinite(nowTime.value) ? nowTime.value : 0);
    nowIndex.value = computeLrcIndex(typeof t === 'number' ? t : 0);
  } catch {
    nowIndex.value = computeLrcIndex(nowTime.value || 0);
  }
  currentLrcProgress.value = 0;
  return true;
};

/** 展示层是否已有可用逐字（words 非空且多于 1 个，排除假逐字） */
export const lyricLinesHaveWords = (lines?: ILyricText[] | null): boolean =>
  !!lines?.some(
    (l) =>
      Array.isArray((l as any).words) &&
      (l as any).words.length > 1 &&
      // hasWordByWord 可能在序列化/HMR 后丢失，以 words 为准
      (l as any).hasWordByWord !== false
  );

/** 加载/刷新当前曲歌词（HMR 或切歌后可 force 重拉） */
export const ensureLyricsLoaded = async (force = false) => {
  // HMR 后可能尚未 init：先尝试从 pinia 绑定
  await ensurePlayerStoreBound();

  const songId = playMusic.value?.id;
  if (!songId) {
    // 无当前曲时不要无脑 clear 以外的逻辑；若本就空则跳过
    if (lrcArray.value.length) clearDisplayedLyrics();
    return;
  }
  const expectedId = String(songId);

  // 历史误注入：只有「作词/作曲」元信息、无正文 → 清空，显示「暂无歌词」
  if (
    lrcArray.value.length > 0 &&
    display.lyricBoundSongId === expectedId &&
    lrcArray.value.every((l) => /^\s*(作词|作曲)\s*[:：]/.test((l.text || '').trim()))
  ) {
    clearDisplayedLyrics();
  }

  // 已展示的就是本曲且非强制 → 跳过（仅允许 store 侧译文/逐字原地升级）
  // 若只有行级没有逐字：不能 return，要落到 loadLrc（HMR 后常见）
  if (!force && lrcArray.value.length > 0 && display.lyricBoundSongId === expectedId) {
    const lyricData = playMusic.value.lyric;
    const incoming =
      lyricData && typeof lyricData === 'object' && Array.isArray(lyricData.lrcArray)
        ? lyricData
        : null;
    const needTrUpgrade =
      !!incoming?.lrcArray?.some((l: any) => !!l.trText) && !lrcArray.value.some((l) => !!l.trText);
    const needWordUpgrade =
      lyricLinesHaveWords(incoming?.lrcArray as ILyricText[]) &&
      !lyricLinesHaveWords(lrcArray.value);
    if (needTrUpgrade || needWordUpgrade) {
      const loadGen = ++display.lyricLoadGen;
      applyLyricsIfCurrent(expectedId, loadGen, {
        lrcArray: (incoming!.lrcArray || []) as any,
        lrcTimeArray: incoming!.lrcTimeArray || []
      });
      if (lyricLinesHaveWords(lrcArray.value)) {
        // 升级后仍要补作词/作曲（incoming 常无元数据行）
        prependMakerCredits(expectedId);
        return;
      }
      // store 也无 words → 继续 force 打网
      force = true;
    } else if (lyricLinesHaveWords(lrcArray.value)) {
      // 已有逐字也要补作词/作曲：HMR/缓存路径常跳过 apply
      prependMakerCredits(expectedId);
      return;
    } else {
      force = true;
    }
  }

  // 同曲已有展示 + force：已有逐字则只校正行号；仅有行级/译文仍要打网补 words
  const alreadyShowing = lrcArray.value.length > 0 && display.lyricBoundSongId === expectedId;
  if (force && alreadyShowing && lyricLinesHaveWords(lrcArray.value)) {
    prependMakerCredits(expectedId);
    try {
      const t = audioService.getCurrentSound()?.currentTime ?? nowTime.value ?? 0;
      nowIndex.value = computeLrcIndex(typeof t === 'number' ? t : 0);
    } catch {
      /* ignore */
    }
    return;
  }

  // 仅在「切到别的歌」时立刻清空，避免上一首残留。
  const wrongSong = !!display.lyricBoundSongId && display.lyricBoundSongId !== expectedId;
  if (wrongSong) {
    clearDisplayedLyrics();
  } else if (lrcArray.value.length > 0 && display.lyricBoundSongId !== expectedId) {
    clearDisplayedLyrics();
  }

  const loadGen = ++display.lyricLoadGen;
  await nextTick();
  // nextTick 后可能又切歌了
  if (loadGen !== display.lyricLoadGen || String(playMusic.value?.id || '') !== expectedId) {
    return;
  }

  const applyAndBind = (parsed: {
    lrcArray: ILyricText[];
    lrcTimeArray: number[];
    hasWordByWord?: boolean;
  }) => applyLyricsIfCurrent(expectedId, loadGen, parsed);

  const lyricData = playMusic.value.lyric;
  let applied = false;

  if (lyricData && typeof lyricData === 'string') {
    const {
      lrcArray: parsedLrcArray,
      lrcTimeArray: parsedTimeArray,
      hasWordByWord
    } = await parseLyricsString(lyricData);
    if (parsedLrcArray.length) {
      applied = applyAndBind({
        lrcArray: parsedLrcArray,
        lrcTimeArray: parsedTimeArray,
        hasWordByWord
      });
    }
  } else if (lyricData && typeof lyricData === 'object' && lyricData.lrcArray?.length > 0) {
    // 若 lyric 对象属于当前曲才用（防缓存串曲）
    const lyricSongId = (lyricData as any).id != null ? String((lyricData as any).id) : expectedId;
    if (lyricSongId === expectedId || (lyricData as any).id == null) {
      applied = applyAndBind({
        lrcArray: (lyricData.lrcArray || []) as any,
        lrcTimeArray: lyricData.lrcTimeArray || []
      });
    }
  }

  // store 有行级歌词但无逐字：不能 return，还要 loadLrc 升级（HMR 常见）
  // 注意：即使 applied 成功，只要没有 words 就必须继续打网/读盘
  if (applied && lrcArray.value.length > 0 && lyricLinesHaveWords(lrcArray.value)) {
    prependMakerCredits(expectedId);
    return;
  }

  // store 上没有可用歌词 / 缺逐字：走网络或磁盘
  if (isElectron && playMusic.value.playMusicUrl?.startsWith('local:///')) {
    try {
      let filePath = decodeURIComponent(playMusic.value.playMusicUrl.replace('local:///', ''));
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
        if (parsedLrcArray.length) {
          applied = applyAndBind({
            lrcArray: parsedLrcArray,
            lrcTimeArray: parsedTimeArray,
            hasWordByWord
          });
          if (lyricLinesHaveWords(lrcArray.value)) return;
        }
      }
    } catch (err) {
      console.error('Failed to extract embedded lyrics:', err);
    }
  }

  // HMR / 行级缓存：缺逐字时必须 loadLrc；force 时即使已有行级也再拉
  if (isElectron && songId && !lyricLinesHaveWords(lrcArray.value)) {
    try {
      const { loadLrc } = await import('@/hooks/usePlayerHooks');
      // forceRefresh：磁盘有行级无 words 时 bypass 旧缓存
      const loaded = await loadLrc(songId, {
        forceRefresh: force || !lyricLinesHaveWords(lrcArray.value)
      });
      if (loadGen !== display.lyricLoadGen) return;
      if (String(playMusic.value?.id || '') !== expectedId) return;
      if (loaded.lrcArray?.length) {
        applyAndBind({
          lrcArray: loaded.lrcArray as any,
          lrcTimeArray: loaded.lrcTimeArray || []
        });
        // 写回 store，便于下次 HMR 直接恢复逐字（含 words）
        if (String(playMusic.value?.id || '') === expectedId) {
          const store = peekPlayerStore();
          if (store?.playMusic && String(store.playMusic.id) === expectedId) {
            store.patchCurrentSong({
              lyric: {
                lrcArray: loaded.lrcArray,
                lrcTimeArray: loaded.lrcTimeArray,
                hasWordByWord: loaded.hasWordByWord,
                id: expectedId
              } as any
            });
          }
        }
        console.log(
          `[ensureLyricsLoaded] loadLrc ok id=${expectedId} words=${lyricLinesHaveWords(loaded.lrcArray)} tr=${loaded.lrcArray.filter((l) => l.trText).length}/${loaded.lrcArray.length}`
        );
      }
    } catch (e) {
      console.warn('[ensureLyricsLoaded] loadLrc failed:', e);
    }
  }

  // 本曲确认无歌词：钉死 boundId，展示层保持空 → UI「暂无歌词」
  // （不注入作词/作曲，避免只剩元信息行）
  if (
    loadGen === display.lyricLoadGen &&
    String(playMusic.value?.id || '') === expectedId &&
    !lrcArray.value.length
  ) {
    display.lyricBoundSongId = expectedId;
  }
};

let musicWatchersInited = false;
/** HMR dispose 时 stop，避免旧模块 watch 写进已废弃的 lrcArray */
let stopMusicWatchers: Array<() => void> = [];

const setupMusicWatchers = () => {
  // HMR 后 musicWatchersInited 随模块重置；dispose 也会清
  if (musicWatchersInited) return;
  musicWatchersInited = true;
  const store = getPlayerStore();

  // 切歌时 id 变化：先清空再加载，杜绝上一首歌词残留
  // immediate 时 oldId 为 undefined —— 不当作切歌；但若 HMR 后 lrc 为空仍要强制拉
  stopMusicWatchers.push(
    watch(
      () => store.playMusic.id,
      async (newId, oldId) => {
        const changed = oldId !== undefined && !sameTrackId(newId, oldId);
        if (changed) {
          clearDisplayedLyrics();
          nowIndex.value = 0;
        }
        // 空歌词或仅有行级（无逐字）都要恢复 — HMR / 异步元数据
        const needRecover =
          !changed &&
          !!newId &&
          (lrcArray.value.length === 0 || !lyricLinesHaveWords(lrcArray.value));
        await ensureLyricsLoaded(changed || needRecover);
      },
      { immediate: true }
    )
  );

  // 同一首歌但 lyric 字段后到 (播放后异步加载元数据 / 重启 + autoPlay 关闭场景)
  stopMusicWatchers.push(
    watch(
      () => playMusic.value?.lyric,
      (newLyric) => {
        if (!playMusic.value?.id) return;
        const id = String(playMusic.value.id);
        const isRichLyric =
          !!newLyric && typeof newLyric === 'object' && (newLyric.lrcArray?.length ?? 0) > 0;
        const incomingHasWords =
          isRichLyric && lyricLinesHaveWords((newLyric as any).lrcArray as ILyricText[]);
        // 已在展示本曲但缺逐字：force 补 loadLrc（HMR 后常见只有行级）
        if (display.lyricBoundSongId === id && lrcArray.value.length > 0) {
          if (!lyricLinesHaveWords(lrcArray.value)) {
            void ensureLyricsLoaded(true);
            return;
          }
          if (!isRichLyric) return;
          // store 侧有更完整逐字/译文：升级
          if (incomingHasWords || (newLyric as any).lrcArray?.some((l: any) => !!l.trText)) {
            void ensureLyricsLoaded(false);
          }
          return;
        }
        if (lrcArray.value.length === 0 || isRichLyric) {
          // 空展示或 store 已有歌词对象：force 拉全（含逐字）
          void ensureLyricsLoaded(lrcArray.value.length === 0 || !incomingHasWords);
        }
      }
    )
  );
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // 只停本模块的 watch；展示层与 audio 监听挂在 globalThis / 一次性 flag 上，勿清
    // （清 audioListeners 再绑会重复 on('play')，且清空 lrcArray 会丢逐字）
    stopMusicWatchers.forEach((stop) => {
      try {
        stop();
      } catch {
        /* ignore */
      }
    });
    stopMusicWatchers = [];
    musicWatchersInited = false;
  });
}

const setupAudioListeners = () => {
  // 监听器只注册一次，避免重复绑定和误清理全局恢复监听器
  if (display.audioListenersInitialized) {
    return () => {};
  }
  display.audioListenersInitialized = true;

  let interval: number | null = null;
  // 播放状态恢复定时器：当 interval 因异常被清除时，自动恢复
  let recoveryTimer: number | null = null;

  const clearInterval = () => {
    if (interval != null) {
      // 可能是 rAF id 或 setTimeout id（sound 暂空时的重试）
      cancelAnimationFrame(interval);
      window.clearTimeout(interval);
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
   * 启动进度更新：rAF ~60fps 刷新 nowTime（逐字歌词流畅），低频副作用仍节流
   */
  const startProgressInterval = () => {
    clearInterval();
    let rafId = 0;
    let lastPersistFloor = -1;
    let lastMprisAt = 0;

    const tick = (ts: number) => {
      rafId = 0;
      try {
        const currentSound = audioService.getCurrentSound();
        if (!currentSound) {
          // sound 暂时为空：下一帧再试
          interval = window.setTimeout(() => {
            interval = null;
            if (getPlayerStore().play) startProgressInterval();
          }, 50) as unknown as number;
          return;
        }

        const currentTime = currentSound.currentTime;
        if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
          if (sound.value !== currentSound) {
            sound.value = currentSound;
          }

          nowTime.value = currentTime;
          allTime.value = currentSound.duration;

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

          const newIndex = getLrcIndex(nowTime.value);
          if (newIndex !== nowIndex.value) {
            nowIndex.value = newIndex;
            currentLrcProgress.value = 0;
          }
          if (isElectron && lrcArray.value[nowIndex.value]) {
            if (lastIndex !== nowIndex.value) {
              sendTrayLyric(nowIndex.value);
              lastIndex = nowIndex.value;
            }
          }

          const { start, end } = currentLrcTiming.value;
          if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            const lyricNow = getLyricClockSec(currentTime);
            const elapsed = lyricNow - start;
            const duration = end - start;
            currentLrcProgress.value = Math.min(Math.max((elapsed / duration) * 100, 0), 100);
          }

          const floorT = Math.floor(currentTime);
          if (floorT % 2 === 0 && floorT !== lastPersistFloor) {
            lastPersistFloor = floorT;
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

          if (isElectron && ts - lastMprisAt > 1000) {
            lastMprisAt = ts;
            try {
              window.api.mprisPositionUpdate(currentTime);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (error) {
        console.error('进度更新 rAF 出错:', error);
      }

      // 仅播放中续帧；暂停由 pause 事件 clearInterval 停
      if (getPlayerStore().play) {
        rafId = requestAnimationFrame(tick);
        interval = rafId as unknown as number;
      }
    };

    rafId = requestAnimationFrame(tick);
    interval = rafId as unknown as number;
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

  startRecoveryMonitor();

  audioService.on('seek_start', (time) => {
    // 直接更新显示位置，不检查拖动状态
    nowTime.value = time;
  });

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

  // 立刻刷新时间/进度（避免首帧进度条空白）
  const updateCurrentTimeAndDuration = () => {
    const currentSound = audioService.getCurrentSound();
    if (currentSound) {
      try {
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

  audioService.on('pause', () => {
    // 切歌 softPause / promote 过渡期不改意图，否则新歌 canplay 后 wantPlay=false → 已加载却暂停
    if (audioService.isSuppressingMediaEvents?.()) {
      return;
    }
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

  audioService.on('end', async () => {
    console.log('音频播放结束事件触发');
    clearInterval();

    // 加密前缀短文件播完：优先接 .full.，避免误切下一首
    const endedSong = getPlayerStore().playMusic as SongResult | undefined;
    if (endedSong && (endedSong.isPartialStream || endedSong.playMusicUrl?.includes('.prefix.'))) {
      try {
        const { playbackCoordinator } = await import('@/services/playbackCoordinator');
        if (await playbackCoordinator.tryUpgradePartialStreamNow()) {
          startProgressInterval();
          return;
        }
        // full 可能刚写完：再等最多 ~2.4s
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 400));
          if (await playbackCoordinator.tryUpgradePartialStreamNow()) {
            startProgressInterval();
            return;
          }
          // 中途用户已切歌则放弃
          const cur = getPlayerStore().playMusic as SongResult | undefined;
          if (!cur || !sameTrackId(cur.id, endedSong.id)) return;
        }
      } catch (e) {
        console.warn('[MusicHook] prefix→full on end failed', e);
      }
    }

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

  // HMR / 重入：若已在播放不会再收到 play 事件，必须立刻开进度环，否则 nowTime 停住 → 逐字不动
  try {
    const st = getPlayerStore();
    const snd = audioService.getCurrentSound();
    if (st.play || (snd && !snd.paused)) {
      startProgressInterval();
    }
  } catch {
    /* pinia 未就绪 */
  }

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

let correctionWatcherInited = false;
const setupCorrectionTimeWatcher = () => {
  if (correctionWatcherInited) return;
  correctionWatcherInited = true;
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

export const getLrcIndex = (time: number): number => {
  const correctedTime = getLyricClockSec(time);

  // 如果歌词数组为空，返回当前索引
  if (lrcTimeArray.value.length === 0) {
    return nowIndex.value;
  }

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

const currentLrcTiming = computed(() => {
  const start = lrcTimeArray.value[nowIndex.value] || 0;
  const end = lrcTimeArray.value[nowIndex.value + 1] || start + 1;
  return { start, end };
});

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
  // 已在全局更新进度则直接返回
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

export const getCurrentLrc = () => {
  const index = getLrcIndex(nowTime.value);
  return {
    currentLrc: lrcArray.value[index],
    nextLrc: lrcArray.value[index + 1]
  };
};

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
    // 需已有正在播放的音乐
    if (!getPlayerStore().playMusic || !getPlayerStore().playMusic.id) {
      console.log('没有正在播放的音乐，跳过音频监听器初始化');
      return;
    }

    // 需已有音频实例
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

        setTimeout(() => {
          clearInterval(checkInterval);
          console.log('等待音频加载超时');
          resolve();
        }, 5000);
      });
    }

    setupAudioListeners();

    const finalSound = audioService.getCurrentSound();
    if (finalSound) {
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
