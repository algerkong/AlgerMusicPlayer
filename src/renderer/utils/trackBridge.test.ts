import { describe, expect, it } from 'vitest';

import type { Track } from '../../shared/domain/track';
import type { SongResult } from '../types/music';
import {
  normalizeSongResult,
  playableToSongResult,
  songResultToPlayable,
  songResultToTrack,
  trackToSongResult
} from './trackBridge';

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
    expect(song.artists?.[0].id).toBe(42);
    expect(song.name).toBe('T');
  });
});

describe('songResultToPlayable roundtrip', () => {
  it('preserves runtime stream fields', () => {
    const song = normalizeSongResult({
      id: '7',
      name: 'R',
      picUrl: '',
      ar: [{ id: 1, name: 'A' }] as any,
      al: { id: 1, name: 'AL', picUrl: '' } as any,
      count: 0,
      playMusicUrl: 'http://x',
      playLoading: true,
      streamQuality: 'higher',
      isPartialStream: true,
      pendingFullUrl: 'local://full'
    } as any);
    const playable = songResultToPlayable(song);
    expect(playable.track.id).toBe('7');
    expect(playable.runtime?.source?.url).toBe('http://x');
    expect(playable.runtime?.streamQuality).toBe('higher');
    expect(playable.runtime?.isPartialStream).toBe(true);
    const back = playableToSongResult(playable);
    expect(back.playMusicUrl).toBe('http://x');
    expect(back.streamQuality).toBe('higher');
    expect(back.isPartialStream).toBe(true);
    expect(back.pendingFullUrl).toBe('local://full');
  });
});

describe('normalizeSongResult', () => {
  it('keeps artists and duration as canonical', () => {
    const partial = {
      id: '1',
      name: 'X',
      picUrl: '',
      artists: [{ id: 9, name: 'A' }],
      duration: 12_000,
      count: 0
    } as unknown as SongResult;
    const n = normalizeSongResult(partial);
    expect(n.artists?.[0].name).toBe('A');
    expect(n.duration).toBe(12_000);
    expect((n as any).ar).toBeUndefined();
    expect((n as any).dt).toBeUndefined();
  });

  it('lifts legacy ar/dt via songFields when only legacy present', () => {
    const partial = {
      id: '2',
      name: 'Y',
      picUrl: '',
      ar: [{ id: 1, name: 'B' }],
      dt: 3000,
      count: 0
    } as unknown as SongResult;
    const n = normalizeSongResult(partial);
    expect(n.artists?.[0].name).toBe('B');
    expect(n.duration).toBe(3000);
  });
});
