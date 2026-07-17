import { describe, expect, it } from 'vitest';

import { formatDurationMs, getSongArtists, getSongDurationMs } from './songFields';

describe('getSongArtists', () => {
  it('prefers ar then artists then song.artists', () => {
    expect(getSongArtists({ ar: [{ name: 'A' } as any] } as any).map((a) => a.name)).toEqual(['A']);
    expect(getSongArtists({ artists: [{ name: 'B' } as any] } as any).map((a) => a.name)).toEqual([
      'B'
    ]);
    expect(
      getSongArtists({ song: { artists: [{ name: 'C' }] } } as any).map((a) => a.name)
    ).toEqual(['C']);
    expect(getSongArtists(null)).toEqual([]);
  });
});

describe('getSongDurationMs', () => {
  it('reads duration then dt then song.duration', () => {
    expect(getSongDurationMs({ duration: 10 } as any)).toBe(10);
    expect(getSongDurationMs({ dt: 20 } as any)).toBe(20);
    expect(getSongDurationMs({ song: { duration: 30 } } as any)).toBe(30);
    expect(getSongDurationMs(null)).toBe(0);
  });
});

describe('formatDurationMs', () => {
  it('formats mm:ss', () => {
    expect(formatDurationMs(0)).toBe('--:--');
    expect(formatDurationMs(65_000)).toBe('01:05');
  });
});
