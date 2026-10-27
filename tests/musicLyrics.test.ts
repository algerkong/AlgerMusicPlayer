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
