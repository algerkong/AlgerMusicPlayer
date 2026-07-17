import { describe, expect, it } from 'vitest';

import type { Track } from '../../shared/domain/track';
import type { SongResult } from '../types/music';
import { normalizeSongResult, songResultToTrack, trackToSongResult } from './trackBridge';

describe('trackBridge snowflake ids', () => {
  it('keeps song id as string without Number coercion', () => {
    // 超过 Number.MAX_SAFE_INTEGER 的雪花
    const snowflake = '9007199254740993';
    const track: Track = {
      platform: 'qishui',
      id: snowflake,
      title: 'Big Id',
      artists: [{ id: snowflake, name: 'Artist' }],
      album: { id: snowflake, name: 'Album' },
      coverUrl: '',
      durationMs: 1000
    };

    const song = trackToSongResult(track);
    expect(song.id).toBe(snowflake);
    expect(typeof song.id).toBe('string');
    // 超大雪花不得变成错误 number
    expect(String(song.id)).not.toBe(String(Number(snowflake)));

    const back = songResultToTrack(song);
    expect(back.id).toBe(snowflake);
  });

  it('maps safe integer artist ids to number for legacy Artist type', () => {
    const track: Track = {
      platform: 'qishui',
      id: '1',
      title: 'T',
      artists: [{ id: '42', name: 'A' }]
    };
    const song = trackToSongResult(track);
    expect(song.ar[0].id).toBe(42);
    // normalize mirrors both sides
    expect(song.artists?.[0].id).toBe(42);
    expect(song.dt).toBe(song.duration);
  });
});

describe('normalizeSongResult', () => {
  it('fills ar/dt from artists/duration only', () => {
    const partial = {
      id: '1',
      name: 'X',
      picUrl: '',
      artists: [{ id: 9, name: 'A' }],
      duration: 12_000,
      count: 0
    } as unknown as SongResult;
    const n = normalizeSongResult(partial);
    expect(n.ar[0].name).toBe('A');
    expect(n.dt).toBe(12_000);
    expect(n.artists?.[0].name).toBe('A');
  });

  it('fills artists from ar when artists empty', () => {
    const partial = {
      id: '2',
      name: 'Y',
      picUrl: '',
      ar: [{ id: 1, name: 'B' }],
      artists: [],
      dt: 3000,
      count: 0
    } as unknown as SongResult;
    const n = normalizeSongResult(partial);
    expect(n.artists?.[0].name).toBe('B');
    expect(n.duration).toBe(3000);
  });
});
