import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SongResult } from '../src/renderer/types/music';

const mocks = vi.hoisted(() => ({
  electron: false,
  post: vi.fn(),
  settings: vi.fn(),
  cached: vi.fn()
}));

vi.mock('axios', () => ({
  default: {
    post: mocks.post,
    isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError)
  }
}));
vi.mock('@/utils', () => ({
  get isElectron() {
    return mocks.electron;
  }
}));
vi.mock('@/store', () => ({ useSettingsStore: mocks.settings }));
vi.mock('@/services/SongSourceConfigManager', () => ({
  SongSourceConfigManager: { getConfig: () => undefined }
}));
vi.mock('@/services/musicSource/registry', () => ({
  useMusicSourceRegistry: () => ({ orderedProviders: () => [] })
}));
vi.mock('@/services/musicSource/cache', () => ({
  MusicResolveCache: { getCachedMusicUrl: mocks.cached }
}));

import { resolveSong } from '../src/renderer/services/musicSource/resolver';

const song = {
  id: '123',
  name: ' Example song ',
  alia: [' Alternate title ', ''],
  dt: 123456.7,
  al: { id: 4, name: ' Example album ' },
  ar: [{ id: 5, name: ' Example artist ' }]
} as SongResult;

describe('container music after the provider refactor', () => {
  beforeEach(() => {
    mocks.electron = false;
    mocks.post.mockReset();
    mocks.settings.mockReset();
    mocks.settings.mockReturnValue({ setData: { enabledMusicSources: [] } });
    mocks.cached.mockReset();
    vi.stubEnv('VITE_CONTAINER_MUSIC_API', '/music');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('routes Web playback to the container with normalized song metadata', async () => {
    mocks.post.mockResolvedValue({
      data: {
        code: 200,
        message: 'success',
        data: { url: 'https://example.com/song.mp3', type: 'mp3', br: 128000 }
      }
    });

    await expect(resolveSong(song)).resolves.toMatchObject({
      media: { url: 'https://example.com/song.mp3', format: 'mp3', br: 128000 },
      providerKey: 'container',
      attempts: [{ providerKey: 'container', ok: true }]
    });
    expect(mocks.post).toHaveBeenCalledWith(
      '/music',
      {
        id: 123,
        song: {
          name: 'Example song',
          alias: ['Alternate title'],
          duration: 123457,
          album: { id: 4, name: 'Example album' },
          artists: [{ id: 5, name: 'Example artist' }]
        }
      },
      { timeout: 17000 }
    );
    expect(mocks.settings).not.toHaveBeenCalled();
  });

  it('accepts the older album, artists, alias and duration fields', async () => {
    const legacySong = {
      id: 123,
      name: 'Example song',
      alias: ['Alias'],
      duration: 1000,
      album: { id: 4, name: 'Album' },
      artists: [{ id: 5, name: 'Artist' }]
    } as unknown as SongResult;
    mocks.post.mockResolvedValue({ data: { code: 404 } });

    await resolveSong(legacySong);
    expect(mocks.post.mock.calls[0][1].song).toEqual({
      name: 'Example song',
      alias: ['Alias'],
      duration: 1000,
      album: { id: 4, name: 'Album' },
      artists: [{ id: 5, name: 'Artist' }]
    });
  });

  it.each(['', '   '])('leaves ordinary Web builds unchanged with endpoint %j', async (apiUrl) => {
    vi.stubEnv('VITE_CONTAINER_MUSIC_API', apiUrl);
    await expect(resolveSong(song)).resolves.toBeNull();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.settings).not.toHaveBeenCalled();
  });

  it.each([
    { code: 404, message: 'Not found' },
    { code: 200, message: 'success', data: { url: 'file:///private/song.mp3' } },
    { code: 200, message: 'success', data: {} }
  ])('returns no result for an invalid response: %j', async (data) => {
    mocks.post.mockResolvedValue({ data });
    await expect(resolveSong(song)).resolves.toBeNull();
  });

  it('handles transport failure without leaking request details', async () => {
    mocks.post.mockRejectedValue({
      isAxiosError: true,
      code: 'ECONNABORTED',
      config: { cookie: 'synthetic-private-value' }
    });
    await expect(resolveSong(song)).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalledWith('Container music request failed', {
      code: 'ECONNABORTED'
    });
  });

  it('keeps Electron on the upstream resolver even when the endpoint is set', async () => {
    mocks.electron = true;
    mocks.cached.mockResolvedValue({
      url: 'https://example.com/cached.mp3',
      providerKey: 'netease',
      providerName: 'Netease'
    });
    await expect(resolveSong(song)).resolves.toMatchObject({
      providerKey: 'netease',
      media: { url: 'https://example.com/cached.mp3' }
    });
    expect(mocks.settings).toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
