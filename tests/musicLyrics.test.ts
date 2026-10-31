import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMusicLrc } from '@/api/music';

const mocks = vi.hoisted(() => ({
  getData: vi.fn(),
  saveData: vi.fn(),
  request: vi.fn()
}));

vi.mock('@/hooks/MusicHook', () => ({
  musicDB: { getData: mocks.getData, saveData: mocks.saveData }
}));
vi.mock('@/store', () => ({ useSettingsStore: vi.fn(), useUserStore: vi.fn() }));
vi.mock('@/utils/request', () => ({ default: { get: mocks.request } }));
vi.mock('@/services/musicSource/resolver', () => ({ resolveSong: vi.fn() }));

describe('lyrics caching during playback', () => {
  const response = { data: { lrc: { lyric: '[00:00.00]Test lyrics' } } };

  beforeEach(() => {
    mocks.getData.mockResolvedValue(undefined);
    mocks.saveData.mockResolvedValue(undefined);
    mocks.request.mockResolvedValue(response);
  });

  it('defers database access until after cache consumers are initialized', async () => {
    // Given: the database is not initialized while its consumers are imported.
    vi.resetModules();
    let ready = false;
    const readDatabase = vi.fn(() => {
      if (!ready) {
        throw new Error('Database is not initialized');
      }
      return { getData: mocks.getData, saveData: mocks.saveData };
    });
    vi.doMock('@/hooks/MusicHook', () => ({
      get musicDB() {
        return readDatabase();
      }
    }));

    try {
      // When: modules load before the database becomes ready for requests.
      const music = await import('@/api/music');
      const { MusicResolveCache } = await import('@/services/musicSource/cache');
      expect(readDatabase).not.toHaveBeenCalled();
      ready = true;

      // Then: the initialized database serves both lyrics and URL cache reads.
      await expect(music.getMusicLrc(1)).resolves.toEqual(response);
      await expect(MusicResolveCache.getCachedMusicUrl(1)).resolves.toBeNull();
      expect(readDatabase).toHaveBeenCalled();
    } finally {
      vi.doUnmock('@/hooks/MusicHook');
      vi.resetModules();
    }
  });

  it('safely saves concurrent responses for the same song', async () => {
    const records = new Map();
    mocks.saveData.mockImplementation(async (_store, record) => {
      records.set(record.id, record);
    });

    const responses = await Promise.all([getMusicLrc(1), getMusicLrc(1)]);

    expect(responses).toEqual([response, response]);
    expect(records.size).toBe(1);
    expect(records.get(1).data).toEqual(response.data);
  });

  it('returns fetched lyrics even when the cache cannot be saved', async () => {
    mocks.saveData.mockRejectedValueOnce(new Error('Quota exceeded'));

    await expect(getMusicLrc(1)).resolves.toEqual(response);
  });

  it('reuses a fresh cache entry without a network request', async () => {
    const cached = { id: 1, data: response.data, createTime: Date.now() };
    mocks.getData.mockResolvedValueOnce(cached);

    await expect(getMusicLrc(1)).resolves.toEqual(cached);
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.saveData).not.toHaveBeenCalled();
  });
});
