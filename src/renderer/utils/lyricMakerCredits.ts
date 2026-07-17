import type { ILyricText } from '@/types/music';

/** 是否已有「作词：/作曲：」行（歌词自带或已注入） */
export function lyricsHaveMakerCredits(
  lines: Array<{ text?: string } | null | undefined>
): boolean {
  return lines.some((l) => /^\s*(作词|作曲)\s*[:：]/.test((l?.text || '').trim()));
}

/**
 * 把曲目元数据里的作词/作曲接到歌词数组最前。
 * 汽水 feed 的 song_maker_team 不在 lyric sentences 里，展示层需自行注入。
 */
export function injectMakerCredits(
  lrcArray: ILyricText[],
  lrcTimeArray: number[],
  lyricists?: string[] | null,
  composers?: string[] | null
): { lrcArray: ILyricText[]; lrcTimeArray: number[]; added: number } {
  // 无正文时不单独塞作词/作曲（UI 应显示「暂无歌词」）
  if (!lrcArray.length) {
    return { lrcArray, lrcTimeArray, added: 0 };
  }
  const L = (lyricists || [])
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);
  const C = (composers || [])
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!L.length && !C.length) {
    return { lrcArray, lrcTimeArray, added: 0 };
  }

  const joined = lrcArray.map((l) => l.text || '').join('\n');
  const hasLyricistLine = /(^|\n)\s*作词\s*[:：]/.test(joined);
  const hasComposerLine = /(^|\n)\s*作曲\s*[:：]/.test(joined);

  // 略早于第一句，保证排序最前；数组序本身也在最前
  const firstT = lrcTimeArray.find((t) => Number.isFinite(t) && t >= 0) ?? 0;
  const base = Math.max(0, firstT > 0 ? firstT - 0.05 : 0);

  const head: ILyricText[] = [];
  const headTimes: number[] = [];

  if (L.length && !hasLyricistLine) {
    head.push({
      text: `作词：${L.join(' / ')}`,
      trText: '',
      hasWordByWord: false,
      startTime: base * 1000,
      duration: 0
    });
    headTimes.push(base);
  }
  if (C.length && !hasComposerLine) {
    head.push({
      text: `作曲：${C.join(' / ')}`,
      trText: '',
      hasWordByWord: false,
      startTime: base * 1000,
      duration: 0
    });
    headTimes.push(base);
  }

  if (!head.length) {
    return { lrcArray, lrcTimeArray, added: 0 };
  }

  return {
    lrcArray: [...head, ...lrcArray],
    lrcTimeArray: [...headTimes, ...lrcTimeArray],
    added: head.length
  };
}
