/**
 * 歌词展示态：挂在 globalThis 上，跨 Vite HMR 保活。
 *
 * 旧方案把 lrcArray 放在 MusicHook 模块顶层 ref —— 热更新一重载模块，
 * 逐字 words 全丢，只能再走 ensure/loadLrc，还经常只恢复到行级。
 *
 * 换思路：展示层数据不随模块销毁；HMR 只重绑 store / watch，不重拉歌词。
 */
import { ref, type Ref } from 'vue';

import { audioService } from '@/services/audioService';
import type { ILyricText } from '@/types/music';
import { getTextColors } from '@/utils/linearColor';

const GKEY = '__LY_LYRIC_DISPLAY_STATE_V1__';

export type LyricDisplayState = {
  lrcArray: Ref<ILyricText[]>;
  lrcTimeArray: Ref<number[]>;
  nowTime: Ref<number>;
  allTime: Ref<number>;
  nowIndex: Ref<number>;
  currentLrcProgress: Ref<number>;
  sound: Ref<HTMLAudioElement | null>;
  textColors: Ref<any>;
  /** 当前 lrcArray 绑定的 songId */
  lyricBoundSongId: string;
  /** 异步加载世代，丢弃过期 apply */
  lyricLoadGen: number;
  /** audio 监听只绑一次（跨 HMR） */
  audioListenersInitialized: boolean;
};

function createState(): LyricDisplayState {
  return {
    lrcArray: ref<ILyricText[]>([]),
    lrcTimeArray: ref<number[]>([]),
    nowTime: ref(0),
    allTime: ref(0),
    nowIndex: ref(0),
    currentLrcProgress: ref(0),
    sound: ref<HTMLAudioElement | null>(audioService.getCurrentSound()),
    textColors: ref<any>(getTextColors()),
    lyricBoundSongId: '',
    lyricLoadGen: 0,
    audioListenersInitialized: false
  };
}

export function getLyricDisplayState(): LyricDisplayState {
  const g = globalThis as typeof globalThis & { [GKEY]?: LyricDisplayState };
  if (!g[GKEY]) {
    g[GKEY] = createState();
  }
  return g[GKEY]!;
}

/** 仅测试/调试：丢掉保活态 */
export function resetLyricDisplayStateForTests(): void {
  const g = globalThis as typeof globalThis & { [GKEY]?: LyricDisplayState };
  delete g[GKEY];
}
