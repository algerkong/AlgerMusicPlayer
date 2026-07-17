import { describe, expect, it } from 'vitest';

import type { SongResult } from '../types/music';
import { artistTextOf, toPlayableView, trackToPlayableView } from './playableView';

describe('toPlayableView', () => {
  it('builds display fields from dual SongResult shapes', () => {
    const song = {
      id: '1',
      name: 'Hello',
      picUrl: 'http://x/y.jpg',
      artists: [{ id: 2, name: 'A' }],
      duration: 65_000,
      count: 0,
      source: 'qishui'
    } as unknown as SongResult;

    const v = toPlayableView(song)!;
    expect(v.title).toBe('Hello');
    expect(v.artistText).toBe('A');
    expect(v.durationText).toBe('01:05');
    expect(v.raw.ar[0].name).toBe('A');
    expect(v.raw.dt).toBe(65_000);
  });

  it('returns null for empty', () => {
    expect(toPlayableView(null)).toBeNull();
    expect(toPlayableView({} as SongResult)).toBeNull();
  });
});

describe('trackToPlayableView', () => {
  it('maps Track without going through UI', () => {
    const v = trackToPlayableView({
      platform: 'qishui',
      id: '9',
      title: 'T',
      artists: [{ id: '1', name: 'B' }],
      durationMs: 1000
    });
    expect(v.title).toBe('T');
    expect(v.artistText).toBe('B');
    expect(artistTextOf(v.raw)).toBe('B');
  });
});
