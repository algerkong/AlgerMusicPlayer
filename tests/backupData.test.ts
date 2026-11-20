import { describe, expect, it } from 'vitest';

import {
  type BackupCategory,
  createBackupFile,
  hashBackupData,
  mergeHistory,
  parseBackupFile,
  pickPluginSet,
  pickSettingsSet,
  planCategorySync,
  type SyncMode
} from '@/utils/backupData';

const plan = (
  localHash: string,
  remoteHash: string | undefined,
  baseHash: string | undefined,
  mode: SyncMode = 'sync',
  category: BackupCategory = 'settings'
) => planCategorySync({ category, mode, localHash, remoteHash, baseHash });

describe('planCategorySync', () => {
  it('uploads when only the local side changed since the last sync', () => {
    expect(plan('local2', 'base', 'base')).toBe('upload');
  });

  it('downloads when only the remote side changed since the last sync', () => {
    expect(plan('base', 'remote2', 'base')).toBe('download');
  });

  it('reports a conflict when both sides changed, instead of picking a winner', () => {
    expect(plan('local2', 'remote2', 'base')).toBe('conflict');
  });

  it('treats a first sync against a different remote as a conflict, not an overwrite', () => {
    expect(plan('local', 'remote', undefined)).toBe('conflict');
  });

  it('merges history when both sides changed', () => {
    expect(plan('local2', 'remote2', 'base', 'sync', 'history')).toBe('merge');
  });

  it('uploads when the remote has no data for the category yet', () => {
    expect(plan('local', undefined, undefined)).toBe('upload');
  });

  it('does nothing when both sides already match', () => {
    expect(plan('same', 'same', 'old')).toBe('none');
  });

  it('forces the direction in upload and restore modes', () => {
    expect(plan('local2', 'remote2', 'base', 'upload')).toBe('upload');
    expect(plan('local2', 'remote2', 'base', 'restore')).toBe('download');
  });

  it('never wipes local data when restoring a category the remote does not have', () => {
    expect(plan('local', undefined, 'base', 'restore')).toBe('none');
  });
});

describe('settings split', () => {
  const set = {
    language: 'en-US',
    downloadPath: '/Users/a/Music',
    proxyConfig: { enable: true },
    diskCacheDir: '/tmp/cache',
    musicApiPort: 30488,
    enableGpuAcceleration: false,
    musicSourcePlugins: [{ id: 'p1' }],
    enabledMusicSources: ['migu']
  };

  it('keeps device-bound and plugin keys out of the settings category', () => {
    expect(pickSettingsSet(set)).toEqual({ language: 'en-US' });
  });

  it('puts only source and plugin keys into the plugins category', () => {
    expect(pickPluginSet(set)).toEqual({
      musicSourcePlugins: [{ id: 'p1' }],
      enabledMusicSources: ['migu']
    });
  });
});

describe('hashBackupData', () => {
  it('ignores key order but not content', () => {
    expect(hashBackupData({ a: 1, b: [1, 2] })).toBe(hashBackupData({ b: [1, 2], a: 1 }));
    expect(hashBackupData({ a: 1, b: [1, 2] })).not.toBe(hashBackupData({ a: 1, b: [2, 1] }));
  });
});

describe('mergeHistory', () => {
  const empty = {
    musicHistory: [],
    podcastHistory: [],
    playlistHistory: [],
    albumHistory: [],
    podcastRadioHistory: []
  };

  it('keeps the newer entry per id, the larger play count, and orders by last play time', () => {
    const merged = mergeHistory(
      {
        ...empty,
        musicHistory: [
          { id: 1, count: 5, lastPlayTime: 100 },
          { id: 2, count: 1, lastPlayTime: 50 }
        ]
      },
      {
        musicHistory: [
          { id: 3, count: 1, lastPlayTime: 300 },
          { id: 1, count: 2, lastPlayTime: 200 }
        ]
      }
    );

    expect(merged.musicHistory).toEqual([
      { id: 3, count: 1, lastPlayTime: 300 },
      { id: 1, count: 5, lastPlayTime: 200 },
      { id: 2, count: 1, lastPlayTime: 50 }
    ]);
  });

  it('caps each list at 500 entries, dropping the oldest', () => {
    const local = Array.from({ length: 400 }, (_, i) => ({ id: i, lastPlayTime: 1000 + i }));
    const remote = Array.from({ length: 400 }, (_, i) => ({ id: 1000 + i, lastPlayTime: i }));
    const merged = mergeHistory({ ...empty, musicHistory: local }, { musicHistory: remote });

    expect(merged.musicHistory).toHaveLength(500);
    expect(merged.musicHistory.some((item) => item.id === 1000)).toBe(false);
    expect(merged.musicHistory.some((item) => item.id === 0)).toBe(true);
  });
});

describe('parseBackupFile', () => {
  it('round-trips a file created by this version', () => {
    const file = createBackupFile(
      { favorites: { hash: 'h', updatedAt: 1, data: { favoriteList: [1], dislikeList: [] } } },
      '5.1.0',
      1
    );
    expect(parseBackupFile(JSON.stringify(file))).toEqual(file);
  });

  it('rejects files from other apps and from newer format versions', () => {
    expect(() =>
      parseBackupFile(JSON.stringify({ app: 'Other', version: 1, categories: {} }))
    ).toThrow();
    expect(() =>
      parseBackupFile(JSON.stringify({ app: 'AlgerMusicPlayer', version: 99, categories: {} }))
    ).toThrow();
  });
});
