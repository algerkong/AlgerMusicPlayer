import { describe, expect, it } from 'vitest';

import type { Track } from '../../shared/domain/track';
import { songResultToTrack, trackToSongResult } from './trackBridge';

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
  });
});
