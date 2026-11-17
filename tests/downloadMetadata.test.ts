import type { ILyricsTag } from 'music-metadata';
import { describe, expect, it } from 'vitest';

import { extractLyricsText } from '../src/main/modules/downloadMetadata';

const lyricsTag = (tag: Partial<ILyricsTag>): ILyricsTag => ({
  contentType: 1,
  timeStampFormat: 0,
  syncText: [],
  ...tag
});

describe('extractLyricsText', () => {
  it('rebuilds LRC from millisecond-synced lyrics so the time axis survives', () => {
    const lyrics = [
      lyricsTag({
        timeStampFormat: 2,
        text: '第一行\nline one\n第二行',
        syncText: [
          { timestamp: 1000, text: '第一行' },
          { timestamp: 1000, text: 'line one' },
          { timestamp: 62500, text: '第二行' }
        ]
      })
    ];

    expect(extractLyricsText(lyrics)).toBe(
      '[00:01.000]第一行\n[00:01.000]line one\n[01:02.500]第二行'
    );
  });

  it('returns unsynchronized text verbatim, including LRC stored in USLT', () => {
    const lrc = '[00:01.00]第一行\n[00:02.50]第二行';
    expect(extractLyricsText([lyricsTag({ text: lrc })])).toBe(lrc);
  });

  it('falls back to plain text when timestamps are not in milliseconds', () => {
    const lyrics = [
      lyricsTag({
        timeStampFormat: 1,
        text: 'a\nb',
        syncText: [
          { timestamp: 10, text: 'a' },
          { timestamp: 20, text: 'b' }
        ]
      })
    ];

    expect(extractLyricsText(lyrics)).toBe('a\nb');
  });

  it('skips empty entries and returns null when nothing is embedded', () => {
    expect(extractLyricsText([lyricsTag({ text: '' }), lyricsTag({ text: 'x' })])).toBe('x');
    expect(extractLyricsText([lyricsTag({ text: '' })])).toBeNull();
    expect(extractLyricsText(undefined)).toBeNull();
  });
});
