import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayerCoreStore } from '@/store/modules/playerCore';
import type { SongResult } from '@/types/music';

const mocks = vi.hoisted(() => ({
  core: null as unknown as ReturnType<typeof usePlayerCoreStore>,
  handlers: new Map<string, (song: SongResult) => Promise<void>>(),
  sound: { currentTime: 42, duration: 180, pause: vi.fn() },
  audio: {
    on: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    setPlaybackRate: vi.fn(),
    getCurrentSound: vi.fn(),
    getCurrentTrack: vi.fn(() => null),
    forceResetOperationLock: vi.fn()
  },
  parse: vi.fn(),
  getSongDetail: vi.fn(),
  clearMusicCache: vi.fn(),
  setConfig: vi.fn(),
  updateSong: vi.fn(),
  dispatchEvent: vi.fn()
}));

vi.mock('@/../i18n/renderer', () => ({ default: { global: { t: (key: string) => key } } }));
vi.mock('naive-ui', () => ({
  createDiscreteApi: () => ({ message: { error: vi.fn() } })
}));
vi.mock('@/api/music', () => ({ getParsingMusicUrl: mocks.parse }));
vi.mock('@/services/musicSource/cache', () => ({
  MusicResolveCache: { clearMusicCache: mocks.clearMusicCache }
}));
vi.mock('@/hooks/usePlayerHooks', () => ({
  useSongDetail: () => ({ getSongDetail: mocks.getSongDetail }),
  loadLrc: async () => ({ lrcArray: [], lrcTimeArray: [] })
}));
vi.mock('@/services/audioService', () => ({ audioService: mocks.audio }));
vi.mock('@/services/SongSourceConfigManager', () => ({
  SongSourceConfigManager: { setConfig: mocks.setConfig, clearTriedSources: vi.fn() }
}));
vi.mock('@/store/modules/playlist', () => ({
  usePlaylistStore: () => ({ playList: [], updateSong: mocks.updateSong })
}));
vi.mock('@/store/modules/playHistory', () => ({
  usePlayHistoryStore: () => ({ addMusic: vi.fn() })
}));
vi.mock('@/utils', () => ({ getImgUrl: (url: string) => url }));
vi.mock('@/utils/linearColor', () => ({
  getImageLinearBackground: async () => ({ backgroundColor: '', primaryColor: '' })
}));

const makeSong = (id: string | number, local = false): SongResult =>
  ({
    id,
    name: String(id),
    source: 'netease',
    playMusicUrl: local ? `local:////Music/${id}.mp3` : `https://example.com/${id}.mp3`
  }) as SongResult;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('playback recovery ownership (#769)', () => {
  let controller: typeof import('@/services/playbackController');

  beforeEach(async () => {
    vi.resetModules();
    mocks.handlers.clear();
    mocks.audio.on.mockImplementation((event, handler) => mocks.handlers.set(event, handler));
    mocks.audio.getCurrentSound.mockReturnValue(mocks.sound);
    mocks.audio.play.mockResolvedValue(mocks.sound);
    mocks.getSongDetail.mockImplementation(async (song) => ({
      ...song,
      playMusicUrl: song.playMusicUrl || `https://example.com/refreshed-${song.id}.mp3`
    }));
    mocks.clearMusicCache.mockResolvedValue(undefined);
    mocks.parse.mockResolvedValue({ data: { data: { url: 'https://example.com/reparsed.mp3' } } });
    vi.stubGlobal('localStorage', { getItem: () => null });
    vi.stubGlobal('document', { title: '', createElement: () => ({}) });
    vi.stubGlobal('window', { dispatchEvent: mocks.dispatchEvent, addEventListener: vi.fn() });
    setActivePinia(createPinia());
    // 必须在 resetModules 之后取 store：playbackController 与其 store 依赖的
    // playbackRequestManager 属于重置后的模块图，用静态 import 的实例取消请求
    // 只会 bump 另一个单例的 generation，取消不到正在进行的播放。
    const { usePlayerCoreStore: useFreshPlayerCoreStore } =
      await import('@/store/modules/playerCore');
    mocks.core = useFreshPlayerCoreStore();
    mocks.core.playMusic = makeSong(1);
    mocks.core.play = true;
    mocks.core.isPlay = true;
    mocks.core.userPlayIntent = true;
    controller = await import('@/services/playbackController');
    controller.setupUrlExpiredHandler();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await vi.dynamicImportSettled();
    vi.unstubAllGlobals();
  });

  it('ignores URL-expired events for local files', async () => {
    const local = makeSong('123abc', true);
    mocks.core.playMusic = local;
    await mocks.handlers.get('url_expired')!(local);

    expect(mocks.getSongDetail).not.toHaveBeenCalled();
    expect(mocks.clearMusicCache).not.toHaveBeenCalled();
    expect(mocks.audio.play).not.toHaveBeenCalled();
    expect(mocks.core.playMusic.playMusicUrl).toBe(local.playMusicUrl);
  });

  it('does not manually reparse local files as online song IDs', async () => {
    mocks.core.playMusic = makeSong('123abc', true);

    expect(await controller.reparseCurrentSong('migu')).toBe(false);
    expect(mocks.parse).not.toHaveBeenCalled();
    expect(mocks.setConfig).not.toHaveBeenCalled();
    expect(mocks.sound.pause).not.toHaveBeenCalled();
  });

  it('still allows explicit source changes for online songs cached on disk', async () => {
    mocks.core.playMusic = makeSong(1, true);

    expect(await controller.reparseCurrentSong('migu')).toBe(true);
    expect(mocks.parse).toHaveBeenCalledTimes(1);
    expect(mocks.parse.mock.calls[0][0]).toBe(1);
  });

  it('does not stop current audio when an obsolete load eventually resolves', async () => {
    const firstLoad = deferred<typeof mocks.sound>();
    mocks.audio.play.mockImplementationOnce(() => firstLoad.promise);
    const first = controller.playTrack(makeSong(1));
    await vi.waitFor(() => expect(mocks.audio.play).toHaveBeenCalledTimes(1));

    const local = makeSong('local-song', true);
    expect(await controller.playTrack(local)).toBe(true);
    const stopCount = mocks.audio.stop.mock.calls.length;
    firstLoad.resolve(mocks.sound);

    expect(await first).toBe(false);
    expect(mocks.audio.stop).toHaveBeenCalledTimes(stopCount);
    expect(mocks.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(mocks.core.playMusic.id).toBe(local.id);
  });

  it('discards a stale request before stopping audio', async () => {
    const results = await Promise.all([
      controller.playTrack(makeSong(1)),
      controller.playTrack(makeSong('local-song', true))
    ]);

    expect(results).toEqual([false, true]);
    expect(mocks.audio.stop).toHaveBeenCalledTimes(1);
  });

  it('discards a reparse result after the user selects another song', async () => {
    const parsing = deferred<{ data: { data: { url: string } } }>();
    mocks.parse.mockReturnValueOnce(parsing.promise);
    const reparsing = controller.reparseCurrentSong('migu');
    await vi.waitFor(() => expect(mocks.parse).toHaveBeenCalledTimes(1));

    const local = makeSong('local-song', true);
    await controller.playTrack(local);
    parsing.resolve({ data: { data: { url: 'https://example.com/stale.mp3' } } });

    expect(await reparsing).toBe(false);
    expect(mocks.audio.play).toHaveBeenCalledTimes(1);
    expect(mocks.updateSong).not.toHaveBeenCalled();
    expect(mocks.core.playMusic.id).toBe(local.id);
  });

  it('keeps the most recently requested source when reparses finish out of order', async () => {
    const first = deferred<{ data: { data: { url: string } } }>();
    const second = deferred<{ data: { data: { url: string } } }>();
    mocks.parse.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const firstReparse = controller.reparseCurrentSong('migu');
    await vi.waitFor(() => expect(mocks.parse).toHaveBeenCalledTimes(1));
    const secondReparse = controller.reparseCurrentSong('kugou');
    await vi.waitFor(() => expect(mocks.parse).toHaveBeenCalledTimes(2));

    first.resolve({ data: { data: { url: 'https://example.com/obsolete.mp3' } } });
    expect(await firstReparse).toBe(false);
    expect(mocks.audio.play).not.toHaveBeenCalled();

    second.resolve({ data: { data: { url: 'https://example.com/latest.mp3' } } });
    expect(await secondReparse).toBe(true);
    expect(mocks.core.playMusic.playMusicUrl).toBe('https://example.com/latest.mp3');
  });

  it('keeps the last source request when both are started in the same turn', async () => {
    expect(
      await Promise.all([
        controller.reparseCurrentSong('migu'),
        controller.reparseCurrentSong('kugou')
      ])
    ).toEqual([false, true]);
    expect(mocks.setConfig).toHaveBeenCalledExactlyOnceWith(1, ['kugou'], 'manual');
  });

  it('checks ownership again after clearing the expired URL cache', async () => {
    const cacheCleared = deferred<void>();
    mocks.clearMusicCache.mockReturnValueOnce(cacheCleared.promise);
    const recovery = mocks.handlers.get('url_expired')!(mocks.core.playMusic);
    await vi.waitFor(() => expect(mocks.clearMusicCache).toHaveBeenCalledTimes(1));

    const local = makeSong('local-song', true);
    await controller.playTrack(local);
    cacheCleared.resolve();
    await recovery;

    expect(mocks.audio.play).toHaveBeenCalledTimes(1);
    expect(mocks.core.playMusic.id).toBe(local.id);
  });

  it('never restores the previous song position into a newly selected song', async () => {
    vi.useFakeTimers();
    await mocks.handlers.get('url_expired')!(mocks.core.playMusic);
    await controller.playTrack(makeSong('local-song', true));
    const seekCount = mocks.audio.seek.mock.calls.length;
    await vi.advanceTimersByTimeAsync(500);

    expect(mocks.audio.seek).toHaveBeenCalledTimes(seekCount);
  });

  it('reports a failed reparse playback as a failure', async () => {
    // playTrack 内部会清缓存并重解析重试一次，所以要否掉所有播放尝试，
    // 只 stub 第一次失败的话第二次会成功，测不到失败传播。
    mocks.audio.play.mockRejectedValue(new Error('Cannot decode audio'));

    expect(await controller.reparseCurrentSong('migu')).toBe(false);
    expect(mocks.updateSong).not.toHaveBeenCalled();
  });

  it('does not start audio after the user pauses during URL resolution', async () => {
    const detail = deferred<SongResult>();
    mocks.getSongDetail.mockReturnValueOnce(detail.promise);
    const playback = controller.playTrack(makeSong(2));
    await vi.waitFor(() => expect(mocks.getSongDetail).toHaveBeenCalledTimes(1));
    await mocks.core.handlePause();
    detail.resolve(makeSong(2));

    expect(await playback).toBe(false);
    expect(mocks.audio.play).not.toHaveBeenCalled();
    expect(mocks.core.userPlayIntent).toBe(false);
    expect(mocks.core.isPlay).toBe(false);
    expect(mocks.core.playMusic.playLoading).toBe(false);
  });

  it('clears playing state and the old URL when source resolution fails', async () => {
    mocks.core.playMusicUrl = 'https://example.com/previous.mp3';
    mocks.getSongDetail.mockRejectedValueOnce(new Error('Source unavailable'));

    expect(await controller.playTrack(makeSong(2))).toBe(false);
    expect(mocks.core.isPlay).toBe(false);
    expect(mocks.core.userPlayIntent).toBe(false);
    expect(mocks.core.playMusicUrl).toBe('');
  });

  it('does not restore the previous progress for a new explicit playback', async () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) =>
        key === 'playProgress' ? JSON.stringify({ songId: 2, progress: 179 }) : null
    });

    await controller.playTrack(makeSong(2));
    expect(mocks.audio.play.mock.calls[0][3]).toBe(0);
  });

  it('does not mark a failed playerCore playback as successful', async () => {
    mocks.getSongDetail.mockRejectedValueOnce(new Error('Source unavailable'));
    await mocks.core.setPlayMusic(makeSong(2));

    expect(mocks.core.isPlay).toBe(false);
    expect(mocks.core.userPlayIntent).toBe(false);
  });
});
