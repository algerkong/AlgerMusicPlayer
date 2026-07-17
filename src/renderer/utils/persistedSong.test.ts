import { describe, expect, it } from 'vitest';

import type { SongResult } from '../types/music';
import {
  inflateHistoryEntry,
  inflateSong,
  minifyHistoryEntry,
  minifySong,
  PERSIST_SONG_VERSION
} from './persistedSong';

const sample = {
  id: '9007199254740993',
  name: 'Hello',
  picUrl: 'https://x/y.jpg',
  artists: [{ id: '1', name: 'Artist' }],
  album: { id: '2', name: 'Album', picUrl: 'https://x/a.jpg' },
  duration: 120_000,
  source: 'qishui',
  count: 0,
  isVip: true,
  streamQuality: 'higher',
  likedCount: 3
} as unknown as SongResult;

describe('persistedSong v2', () => {
  it('minifies to track-aligned fields with version', () => {
    const m = minifySong(sample);
    expect(m.v).toBe(PERSIST_SONG_VERSION);
    expect(m.id).toBe('9007199254740993');
    expect(m.title).toBe('Hello');
    expect(m.artists[0].name).toBe('Artist');
    expect(m.album?.name).toBe('Album');
    expect(m.durationMs).toBe(120_000);
    expect(m.platform).toBe('qishui');
    expect(m.streamQuality).toBe('higher');
    // no legacy name/ar/dt keys required
    expect((m as any).name).toBeUndefined();
    expect((m as any).ar).toBeUndefined();
  });

  it('roundtrips v2 through inflate', () => {
    const back = inflateSong(minifySong(sample));
    expect(back.id).toBe(sample.id);
    expect(back.name).toBe('Hello');
    expect(back.ar[0].name).toBe('Artist');
    expect(back.artists?.[0].name).toBe('Artist');
    expect(back.dt).toBe(120_000);
    expect(back.duration).toBe(120_000);
    expect(back.isVip).toBe(true);
  });

  it('inflates legacy v1 shape', () => {
    const v1 = {
      id: 42,
      name: 'Old',
      picUrl: 'http://c',
      ar: [{ id: 1, name: 'A' }],
      al: { id: 2, name: 'AL', picUrl: '' },
      dt: 5000,
      source: 'qishui'
    };
    const song = inflateSong(v1);
    expect(song.name).toBe('Old');
    expect(song.artists?.[0].name).toBe('A');
    expect(song.duration).toBe(5000);
  });

  it('strips remote playMusicUrl but keeps local', () => {
    const remote = minifySong({
      ...sample,
      playMusicUrl: 'https://cdn/x.mp3'
    } as SongResult);
    expect(remote.playMusicUrl).toBeUndefined();

    const local = minifySong({
      ...sample,
      playMusicUrl: 'local://path/to.mp3'
    } as SongResult);
    expect(local.playMusicUrl).toBe('local://path/to.mp3');
  });

  it('history minify/inflate keeps count', () => {
    const entry = minifyHistoryEntry({ ...sample, count: 5, lastPlayTime: 99 });
    expect(entry.v).toBe(2);
    expect(entry.count).toBe(5);
    const live = inflateHistoryEntry(entry);
    expect(live.count).toBe(5);
    expect(live.name).toBe('Hello');
    expect(live.lastPlayTime).toBe(99);
  });
});
