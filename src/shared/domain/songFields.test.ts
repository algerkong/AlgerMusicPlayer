import { describe, expect, it } from 'vitest';

import {
  formatDurationMs,
  getSongAlbumName,
  getSongArtistNames,
  getSongArtists,
  getSongDurationMs
} from './songFields';

describe('shared songFields', () => {
  it('prefers ar then artists then song.artists', () => {
    expect(getSongArtistNames({ ar: [{ name: 'A' }] })).toBe('A');
    expect(getSongArtistNames({ artists: [{ name: 'B' }] })).toBe('B');
    expect(getSongArtistNames({ song: { artists: [{ name: 'C' }] } })).toBe('C');
    expect(getSongArtistNames(null, ' / ', '未知')).toBe('未知');
  });

  it('reads duration then dt then song.duration', () => {
    expect(getSongDurationMs({ duration: 10 })).toBe(10);
    expect(getSongDurationMs({ dt: 20 })).toBe(20);
    expect(getSongDurationMs({ song: { duration: 30 } })).toBe(30);
  });

  it('reads album name with fallbacks', () => {
    expect(getSongAlbumName({ al: { name: 'AL' } })).toBe('AL');
    expect(getSongAlbumName({ song: { album: { name: 'SA' } } })).toBe('SA');
    expect(getSongAlbumName({ name: 'T' }, 'x')).toBe('T');
  });

  it('formats duration', () => {
    expect(formatDurationMs(0)).toBe('--:--');
    expect(formatDurationMs(65_000)).toBe('01:05');
  });

  it('getSongArtists returns empty for null', () => {
    expect(getSongArtists(null)).toEqual([]);
  });
});
