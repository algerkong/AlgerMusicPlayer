import { app, ipcMain } from 'electron';
import {
  createMusicSource,
  isMusicSourceError,
  type MusicSourceClient,
  type Quality,
  type ResolveQuery,
  type SessionBundle
} from 'ly-music-source';
import path from 'path';

import { filePathToLocalUrl } from '../../shared/localUrl';
import { getSharedStore } from './config';

const SESSION_KEY = 'musicSourceSession';

let client: MusicSourceClient | null = null;
let initialized = false;

function mapQuality(raw?: string): Quality {
  if (raw === 'standard' || raw === 'lossless') return raw;
  // higher / exhigh / anything else → higher
  return 'higher';
}

function getClient(): MusicSourceClient {
  if (!client) {
    const cacheDir = path.join(app.getPath('userData'), 'ly-music-cache');
    const store = getSharedStore();
    const quality = mapQuality(
      (store.get('set') as { musicQuality?: string } | undefined)?.musicQuality
    );
    client = createMusicSource({
      defaultQuality: quality,
      cacheDir,
      timeoutMs: 45_000
    });

    const saved = store.get(SESSION_KEY) as SessionBundle | undefined;
    if (saved?.version === 1 && saved.platforms) {
      try {
        client.importSession(saved);
        console.log('[musicSource] restored session');
      } catch (error) {
        console.warn('[musicSource] failed to restore session:', error);
      }
    }
  }
  return client;
}

function persistSession(): void {
  if (!client) return;
  try {
    const bundle = client.exportSession();
    getSharedStore().set(SESSION_KEY, bundle);
  } catch (error) {
    console.error('[musicSource] persist session failed:', error);
  }
}

function clearPersistedSession(): void {
  try {
    getSharedStore().delete(SESSION_KEY);
  } catch (error) {
    console.error('[musicSource] clear session failed:', error);
  }
}

function toIpcError(error: unknown): { ok: false; code: string; message: string } {
  if (isMusicSourceError(error)) {
    return { ok: false, code: error.code, message: error.message };
  }
  return {
    ok: false,
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : String(error)
  };
}

function wrapOk<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

/**
 * Initialize ly-music-source bridge (idempotent).
 * Client runs only in the main process; renderer talks via IPC.
 */
export function initializeMusicSource(): void {
  if (initialized) return;

  try {
    // Warm client + restore session（失败也不能阻断 IPC 注册）
    getClient();
  } catch (error) {
    console.error('[musicSource] client init failed (handlers still registered):', error);
  }

  initialized = true;

  ipcMain.handle('music-source:get-auth-state', () => {
    try {
      return wrapOk(getClient().getAuthState());
    } catch (error) {
      return toIpcError(error);
    }
  });

  ipcMain.handle('music-source:import-cookie', (_e, cookie: string) => {
    try {
      if (!cookie || typeof cookie !== 'string' || !cookie.trim()) {
        return { ok: false, code: 'INVALID', message: 'Cookie is empty' };
      }
      const session = getClient().importCookie('qishui', cookie.trim());
      persistSession();
      return wrapOk(session);
    } catch (error) {
      return toIpcError(error);
    }
  });

  ipcMain.handle('music-source:logout', () => {
    try {
      getClient().logout();
      clearPersistedSession();
      return wrapOk(true);
    } catch (error) {
      return toIpcError(error);
    }
  });

  ipcMain.handle('music-source:get-profile', async () => {
    try {
      const profile = await getClient().getProfile('qishui');
      return wrapOk(profile);
    } catch (error) {
      return toIpcError(error);
    }
  });

  ipcMain.handle(
    'music-source:search-songs',
    async (_e, keyword: string, options?: { limit?: number; cursor?: number | string }) => {
      try {
        const songs = await getClient().searchSongs(keyword, options);
        return wrapOk(songs);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle(
    'music-source:search-playlists',
    async (_e, keyword: string, options?: { limit?: number; cursor?: number | string }) => {
      try {
        const playlists = await getClient().searchPlaylists(keyword, options);
        return wrapOk(playlists);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle(
    'music-source:search-albums',
    async (_e, keyword: string, options?: { limit?: number; cursor?: number | string }) => {
      try {
        const albums = await getClient().searchAlbums(keyword, options);
        return wrapOk(albums);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle(
    'music-source:search-artists',
    async (_e, keyword: string, options?: { limit?: number; cursor?: number | string }) => {
      try {
        const artists = await getClient().searchArtists(keyword, options);
        return wrapOk(artists);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle('music-source:search-suggestions', async (_e, keyword: string) => {
    try {
      const items = await getClient().searchSuggestions(keyword, { limit: 10 });
      return wrapOk(items);
    } catch (error) {
      return toIpcError(error);
    }
  });

  ipcMain.handle(
    'music-source:list-user-playlists',
    async (_e, options?: { limit?: number; cursor?: number | string }) => {
      try {
        const playlists = await getClient().listUserPlaylists(options);
        return wrapOk(playlists);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle('music-source:get-playlist', async (_e, playlistId: string) => {
    try {
      const detail = await getClient().getPlaylist(String(playlistId));
      return wrapOk(detail);
    } catch (error) {
      return toIpcError(error);
    }
  });

  ipcMain.handle('music-source:resolve', async (_e, query: ResolveQuery & { quality?: string }) => {
    try {
      const store = getSharedStore();
      const quality = mapQuality(
        query.quality || (store.get('set') as { musicQuality?: string } | undefined)?.musicQuality
      );
      const result = await getClient().resolve({
        ...query,
        quality
      });

      // Never ship Buffer over IPC — only file/local URL or remote URL
      let playMusicUrl: string | undefined = result.url;
      if (result.filePath) {
        playMusicUrl = filePathToLocalUrl(result.filePath);
      }

      return wrapOk({
        platform: result.platform,
        songId: result.songId,
        playMusicUrl,
        mimeType: result.mimeType,
        ext: result.ext,
        quality: result.quality,
        bitrate: result.bitrate,
        size: result.size,
        isPreview: result.isPreview,
        expireAt: result.expireAt
      });
    } catch (error) {
      return toIpcError(error);
    }
  });

  ipcMain.handle('music-source:get-lyric', async (_e, songId: string) => {
    try {
      const lyric = await getClient().getLyric(String(songId));
      // Serialize lines only (no Buffer)
      return wrapOk({
        platform: lyric.platform,
        songId: lyric.songId,
        type: lyric.type,
        lines: lyric.lines,
        raw: lyric.raw
      });
    } catch (error) {
      return toIpcError(error);
    }
  });

  console.log('[musicSource] IPC handlers registered');
}
