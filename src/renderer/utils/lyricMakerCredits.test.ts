import { describe, expect, it } from 'vitest';

import type { ILyricText } from '@/types/music';

import { injectMakerCredits, lyricsHaveMakerCredits } from './lyricMakerCredits';

const line = (text: string, t = 1): ILyricText => ({
  text,
  trText: '',
  hasWordByWord: false,
  startTime: t * 1000,
  duration: 0
});

describe('lyricMakerCredits', () => {
  it('injects 作词/作曲 at head when missing', () => {
    const { lrcArray, lrcTimeArray, added } = injectMakerCredits(
      [line('第一句', 10), line('第二句', 15)],
      [10, 15],
      ['甲'],
      ['乙']
    );
    expect(added).toBe(2);
    expect(lrcArray[0].text).toBe('作词：甲');
    expect(lrcArray[1].text).toBe('作曲：乙');
    expect(lrcArray[2].text).toBe('第一句');
    expect(lrcTimeArray[0]).toBeCloseTo(9.95);
    expect(lrcTimeArray.length).toBe(4);
  });

  it('skips when lyric already has credit lines', () => {
    const { added, lrcArray } = injectMakerCredits(
      [line('作词：已有'), line('真歌词', 5)],
      [0, 5],
      ['甲'],
      ['乙']
    );
    expect(added).toBe(1); // only 作曲
    expect(lrcArray[0].text).toBe('作曲：乙');
    expect(lrcArray[1].text).toBe('作词：已有');
  });

  it('no-op without makers', () => {
    const src = [line('x')];
    const { added, lrcArray } = injectMakerCredits(src, [0], [], []);
    expect(added).toBe(0);
    expect(lrcArray).toBe(src);
  });

  it('no-op when lyric body empty (show 暂无歌词)', () => {
    const { added, lrcArray } = injectMakerCredits([], [], ['甲'], ['乙']);
    expect(added).toBe(0);
    expect(lrcArray).toEqual([]);
  });

  it('lyricsHaveMakerCredits detects lines', () => {
    expect(lyricsHaveMakerCredits([line('作词：A')])).toBe(true);
    expect(lyricsHaveMakerCredits([line('hello')])).toBe(false);
  });
});
