import { app, ipcMain, safeStorage } from 'electron';
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

/** 旧明文 session（迁移后删除） */
const SESSION_KEY_PLAIN = 'musicSourceSession';
/** safeStorage 加密后的 base64 */
const SESSION_KEY_ENC = 'musicSourceSessionEnc';

let client: MusicSourceClient | null = null;
let initialized = false;

/** 汽水 6 档 + standard≡medium；未知回落 higher */
function mapQuality(raw?: string): Quality {
  const q = String(raw || '')
    .toLowerCase()
    .trim();
  if (q === 'standard' || q === 'medium') return q === 'standard' ? 'standard' : 'medium';
  if (q === 'higher' || q === 'exhigh' || q === '320') return 'higher';
  if (q === 'highest') return 'highest';
  if (q === 'lossless' || q === 'flac') return 'lossless';
  if (q === 'spatial' || q === 'atmos') return 'spatial';
  if (q === 'hi_res' || q === 'hires' || q === 'hi-res') return 'hi_res';
  return 'higher';
}

function isSessionBundle(value: unknown): value is SessionBundle {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as SessionBundle).version === 1 &&
    !!(value as SessionBundle).platforms
  );
}

/** 读取并迁移 session；加密不可用时不落盘明文 */
function loadPersistedSession(): SessionBundle | undefined {
  const store = getSharedStore();

  // 1) 密文
  const encB64 = store.get(SESSION_KEY_ENC) as string | undefined;
  if (encB64 && typeof encB64 === 'string' && safeStorage.isEncryptionAvailable()) {
    try {
      const plain = safeStorage.decryptString(Buffer.from(encB64, 'base64'));
      const parsed = JSON.parse(plain) as unknown;
      if (isSessionBundle(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn('[musicSource] decrypt session failed:', error);
    }
  }

  // 2) 旧明文 → 迁移到密文后删除
  const legacy = store.get(SESSION_KEY_PLAIN) as unknown;
  if (isSessionBundle(legacy)) {
    try {
      store.delete(SESSION_KEY_PLAIN);
    } catch {
      // 忽略
    }
    writePersistedSession(legacy);
    return legacy;
  }

  // 清理无效明文残留
  if (legacy !== undefined) {
    try {
      store.delete(SESSION_KEY_PLAIN);
    } catch {
      // 忽略
    }
  }

  return undefined;
}

function writePersistedSession(bundle: SessionBundle): void {
  const store = getSharedStore();
  try {
    store.delete(SESSION_KEY_PLAIN);
  } catch {
    // 忽略
  }

  if (!safeStorage.isEncryptionAvailable()) {
    // 不落盘明文：仅内存会话，重启需重新登录
    try {
      store.delete(SESSION_KEY_ENC);
    } catch {
      // 忽略
    }
    console.warn('[musicSource] safeStorage unavailable; session not persisted to disk');
    return;
  }

  try {
    const encrypted = safeStorage.encryptString(JSON.stringify(bundle));
    store.set(SESSION_KEY_ENC, encrypted.toString('base64'));
  } catch (error) {
    console.error('[musicSource] encrypt session failed:', error);
  }
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

    const saved = loadPersistedSession();
    if (saved) {
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
    writePersistedSession(bundle);
  } catch (error) {
    console.error('[musicSource] persist session failed:', error);
  }
}

function clearPersistedSession(): void {
  try {
    const store = getSharedStore();
    store.delete(SESSION_KEY_PLAIN);
    store.delete(SESSION_KEY_ENC);
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
 * 初始化 ly-music-source 桥接（幂等）
 * 客户端仅跑在主进程；渲染进程走 IPC
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
      // cookie 只进主进程；IPC 仅回传 auth 状态，绝不回传 PlatformSession
      getClient().importCookie('qishui', cookie.trim());
      persistSession();
      return wrapOk(getClient().getAuthState());
    } catch (error) {
      return toIpcError(error);
    }
  });

  /** 扫码登录：创建二维码（token 仅用于后续 poll，session 不回传渲染进程） */
  ipcMain.handle('music-source:create-qr-login', async () => {
    try {
      const session = await getClient().createQrLogin('qishui');
      return wrapOk({
        platform: session.platform,
        token: session.token,
        qrcode: session.qrcode,
        qrcodeIndexUrl: session.qrcodeIndexUrl,
        expireTime: session.expireTime
      });
    } catch (error) {
      return toIpcError(error);
    }
  });

  /**
   * 扫码登录：轮询状态。
   * confirmed 时在主进程落盘 session；IPC 只回 status/message/auth，不回 cookie。
   */
  ipcMain.handle('music-source:poll-qr-login', async (_e, token: string) => {
    try {
      if (!token || typeof token !== 'string') {
        return { ok: false, code: 'INVALID', message: 'QR token is empty' };
      }
      const result = await getClient().pollQrLogin('qishui', token.trim());
      if (result.status === 'confirmed') {
        persistSession();
      }
      return wrapOk({
        status: result.status,
        message: result.message,
        mfa: result.mfa,
        retryAfterSec: result.retryAfterSec,
        throttled: result.throttled,
        auth: result.status === 'confirmed' ? getClient().getAuthState() : undefined
      });
    } catch (error) {
      return toIpcError(error);
    }
  });

  /** 扫码 MFA：下发短信验证码（不回传 cookie） */
  ipcMain.handle('music-source:qr-send-mfa-sms', async (_e, token: string) => {
    try {
      if (!token || typeof token !== 'string') {
        return { ok: false, code: 'INVALID', message: 'QR token is empty' };
      }
      const result = await getClient().sendQrMfaSms('qishui', token.trim());
      return wrapOk(result);
    } catch (error) {
      return toIpcError(error);
    }
  });

  /** 扫码 MFA：校验短信验证码 */
  ipcMain.handle('music-source:qr-validate-mfa-sms', async (_e, token: string, code: string) => {
    try {
      if (!token || typeof token !== 'string') {
        return { ok: false, code: 'INVALID', message: 'QR token is empty' };
      }
      if (!code || typeof code !== 'string') {
        return { ok: false, code: 'INVALID', message: 'SMS code is empty' };
      }
      const result = await getClient().validateQrMfaSms('qishui', token.trim(), code.trim());
      if (result.ok && result.poll?.status === 'confirmed') {
        persistSession();
      }
      return wrapOk({
        ok: result.ok,
        message: result.message,
        status: result.poll?.status,
        auth:
          result.ok && result.poll?.status === 'confirmed' ? getClient().getAuthState() : undefined
      });
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

  /** 会员档位（commerce，含 SVIP）；/me 往往只有 is_vip */
  ipcMain.handle('music-source:get-membership', async () => {
    try {
      const membership = await getClient().getMembership('qishui');
      return wrapOk(membership);
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

  ipcMain.handle(
    'music-source:get-playlist',
    async (
      _e,
      playlistId: string,
      options?: { limit?: number; cursor?: number | string; fetchAll?: boolean }
    ) => {
      try {
        const detail = await getClient().getPlaylist(String(playlistId), options);
        return wrapOk(detail);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle(
    'music-source:create-playlist',
    async (_e, options: { name: string; isPrivate?: boolean; trackIds?: string[] }) => {
      try {
        const pl = await getClient().createPlaylist({
          name: String(options?.name || '').trim(),
          isPrivate: options?.isPrivate,
          trackIds: options?.trackIds
        });
        return wrapOk(pl);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle(
    'music-source:update-playlist',
    async (_e, playlistId: string, options: { name?: string; isPrivate?: boolean }) => {
      try {
        const pl = await getClient().updatePlaylist(String(playlistId), options || {});
        return wrapOk(pl);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle('music-source:delete-playlist', async (_e, playlistId: string | string[]) => {
    try {
      const deleted = await getClient().deletePlaylist(playlistId);
      return wrapOk(deleted);
    } catch (error) {
      return toIpcError(error);
    }
  });

  ipcMain.handle(
    'music-source:append-playlist-tracks',
    async (_e, playlistId: string, trackIds: string[]) => {
      try {
        const pl = await getClient().appendPlaylistTracks(
          String(playlistId),
          (trackIds || []).map(String)
        );
        return wrapOk(pl);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle(
    'music-source:remove-playlist-tracks',
    async (_e, playlistId: string, trackIds: string[]) => {
      try {
        const pl = await getClient().removePlaylistTracks(
          String(playlistId),
          (trackIds || []).map(String)
        );
        return wrapOk(pl);
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle(
    'music-source:resolve',
    async (_e, query: ResolveQuery & { quality?: string; vipLevel?: string }) => {
      try {
        const store = getSharedStore();
        const quality = mapQuality(
          query.quality || (store.get('set') as { musicQuality?: string } | undefined)?.musicQuality
        );
        const result = await getClient().resolve({
          ...query,
          quality,
          vipLevel: query.vipLevel || 'none'
        });

        // IPC 不传 Buffer，仅 file/local 或远程 URL
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
          availableQualities: result.availableQualities,
          effectiveQuality: result.effectiveQuality,
          bitrate: result.bitrate,
          size: result.size,
          isPreview: result.isPreview,
          previewStartMs: result.previewStartMs,
          previewDurationMs: result.previewDurationMs,
          lyricTranslations: result.lyricTranslations,
          expireAt: result.expireAt
        });
      } catch (error) {
        return toIpcError(error);
      }
    }
  );

  ipcMain.handle('music-source:get-lyric', async (_e, songId: string) => {
    try {
      const lyric = await getClient().getLyric(String(songId));
      // 序列化可 JSON 字段（无 Buffer）；translations 必须带回，否则译文永远空
      return wrapOk({
        platform: lyric.platform,
        songId: lyric.songId,
        type: lyric.type,
        lines: lyric.lines,
        raw: lyric.raw,
        translations: lyric.translations
      });
    } catch (error) {
      return toIpcError(error);
    }
  });

  console.log('[musicSource] IPC handlers registered');
}
