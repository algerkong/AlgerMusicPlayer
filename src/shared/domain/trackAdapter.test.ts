import { describe, expect, it } from 'vitest';

import { msSongToTrack } from './trackAdapter';

describe('msSongToTrack', () => {
  it('maps MsSong-like to stable Track without runtime fields', () => {
    const track = msSongToTrack({
      platform: 'qishui',
      id: 'abc',
      title: 'Hello',
      artists: [{ id: '1', name: 'A', avatarUrl: 'http://x' }],
      album: 'Alb',
      coverUrl: 'http://c',
      durationMs: 120000,
      isVip: true
    });

    expect(track).toEqual(
      expect.objectContaining({
        platform: 'qishui',
        id: 'abc',
        title: 'Hello',
        durationMs: 120000,
        isVip: true
      })
    );
    expect(track.artists[0]).toEqual({ id: '1', name: 'A', avatarUrl: 'http://x' });
    expect(track).not.toHaveProperty('playMusicUrl');
    expect(track).not.toHaveProperty('lyric');
  });
});
