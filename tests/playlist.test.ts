import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayerCoreStore } from '@/store/modules/playerCore';
import { usePlaylistStore } from '@/store/modules/playlist';
import type { SongResult } from '@/types/music';

const mocks = vi.hoisted(() => ({
  settings: { setData: { singleSongPlayMode: 'replace' } },
  intelligence: { isIntelligenceMode: false, clearIntelligenceMode: vi.fn() },
  getSongDetail: vi.fn(),
  preload: vi.fn()
}));

vi.mock('naive-ui', () => ({ createDiscreteApi: () => ({ message: {} }) }));
vi.mock('@/../i18n/renderer', () => ({ default: { global: { t: (key: string) => key } } }));
vi.mock('@/hooks/usePlayerHooks', () => ({
  useSongDetail: () => ({ getSongDetail: mocks.getSongDetail })
}));
vi.mock('@/services/audioService', () => ({ audioService: {} }));
vi.mock('@/services/preloadService', () => ({ preloadService: { load: mocks.preload } }));
vi.mock('@/store/modules/settings', () => ({ useSettingsStore: () => mocks.settings }));
vi.mock('@/store/modules/intelligenceMode', () => ({
  useIntelligenceModeStore: () => mocks.intelligence
}));
vi.mock('@/store/modules/sleepTimer', () => ({ useSleepTimerStore: () => ({}) }));
vi.mock('@/utils', () => ({ getImgUrl: (url: string) => url }));

const makeSong = (id: number): SongResult =>
  ({
    id,
    name: String(id),
    source: 'netease',
    picUrl: '',
    lyric: { lrcArray: [{ text: 'Test' }], lrcTimeArray: [0] }
  }) as SongResult;

describe('single-song queue preference (#766)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    vi.stubGlobal('window', {});
    setActivePinia(createPinia());
    mocks.settings.setData.singleSongPlayMode = 'replace';
    mocks.preload.mockResolvedValue('');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('replaces the queue with the song context and selects the clicked song', () => {
    const queue = usePlaylistStore();
    const songs = [makeSong(1), makeSong(2), makeSong(3)];
    queue.setPlayList([makeSong(99)]);

    queue.prepareSongPlayback(songs[1], songs);

    expect(queue.playList.map((song) => song.id)).toEqual([1, 2, 3]);
    expect(queue.playListIndex).toBe(1);
    expect(queue.playList).not.toBe(songs);
  });

  it('adds only the selected song when the add option is selected', () => {
    mocks.settings.setData.singleSongPlayMode = 'add';
    const queue = usePlaylistStore();
    const current = makeSong(99);
    queue.setPlayList([current, makeSong(100)]);
    usePlayerCoreStore().playMusic = current;
    const songs = [makeSong(1), makeSong(2), makeSong(3)];

    queue.prepareSongPlayback(songs[1], songs);

    expect(queue.playList.map((song) => song.id)).toEqual([99, 2, 100]);
    expect(queue.playListIndex).toBe(1);
  });

  it('selects an existing song without duplicating or moving it in add mode', () => {
    mocks.settings.setData.singleSongPlayMode = 'add';
    const queue = usePlaylistStore();
    const songs = [makeSong(1), makeSong(2), makeSong(3)];
    queue.setPlayList(songs);
    usePlayerCoreStore().playMusic = songs[0];

    queue.prepareSongPlayback(songs[2], songs);

    expect(queue.playList.map((song) => song.id)).toEqual([1, 2, 3]);
    expect(queue.playListIndex).toBe(2);
  });

  it('does not discard next-play edits when toggling the current song', () => {
    const queue = usePlaylistStore();
    const songs = [makeSong(1), makeSong(2), makeSong(3)];
    queue.setPlayList(songs);
    usePlayerCoreStore().playMusic = songs[0];
    queue.addToNextPlay(makeSong(99));
    const editedQueue = queue.playList;

    queue.prepareSongPlayback(songs[0], songs);

    expect(queue.playList).toBe(editedQueue);
    expect(queue.playList.map((song) => song.id)).toEqual([1, 99, 2, 3]);
  });

  it('selects the correct index in shuffle mode and preserves the original order', () => {
    const queue = usePlaylistStore();
    queue.playMode = 2;
    const songs = [makeSong(1), makeSong(2), makeSong(3)];

    queue.prepareSongPlayback(songs[1], songs);
    expect(queue.playList[queue.playListIndex].id).toBe(2);
    expect(queue.originalPlayList.map((song) => song.id)).toEqual([1, 2, 3]);

    usePlayerCoreStore().playMusic = songs[1];
    queue.restoreOriginalOrder();
    expect(queue.playList.map((song) => song.id)).toEqual([1, 2, 3]);
    expect(queue.playListIndex).toBe(1);
  });

  it('falls back to adding the song when there is no valid list context', () => {
    const queue = usePlaylistStore();
    queue.setPlayList([makeSong(99)]);

    queue.prepareSongPlayback(makeSong(1), []);
    expect(queue.playList.map((song) => song.id)).toEqual([99, 1]);
    expect(queue.playListIndex).toBe(1);
  });

  it('leaves FM mode even when the new context contains only one local song', () => {
    const core = usePlayerCoreStore();
    core.isFmPlaying = true;
    const queue = usePlaylistStore();
    const song = { ...makeSong(1), playMusicUrl: 'local:////Music/one.mp3' };

    queue.prepareSongPlayback(song, [song]);
    expect(core.isFmPlaying).toBe(false);
  });

  it('ignores old preloads after the user replaces the queue', async () => {
    const queue = usePlaylistStore();
    const oldSong = makeSong(1);
    let resolve!: (song: SongResult) => void;
    mocks.getSongDetail.mockReturnValueOnce(
      new Promise<SongResult>((done) => {
        resolve = done;
      })
    );
    queue.setPlayList([oldSong]);
    const fetching = queue.fetchSongs(0, 1);
    queue.setPlayList([makeSong(2)]);
    resolve({ ...oldSong, playMusicUrl: 'https://example.com/old.mp3' });
    await fetching;

    expect(queue.playList.map((song) => song.id)).toEqual([2]);
    expect(mocks.preload).not.toHaveBeenCalled();
  });

  it('still enriches the queue when a preload belongs to the current list', async () => {
    const queue = usePlaylistStore();
    const song = makeSong(1);
    mocks.getSongDetail.mockResolvedValueOnce({
      ...song,
      playMusicUrl: 'https://example.com/one.mp3'
    });
    queue.setPlayList([song]);
    await queue.fetchSongs(0, 1);

    expect(queue.playList[0].playMusicUrl).toBe('https://example.com/one.mp3');
    expect(mocks.preload).toHaveBeenCalledTimes(1);
  });
});
