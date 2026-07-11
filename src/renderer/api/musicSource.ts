import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';

export type MusicSourceIpcResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string };

export interface MsArtist {
  platform: string;
  id?: string;
  name: string;
  avatarUrl?: string;
}

export interface MsSong {
  platform: string;
  id: string;
  title: string;
  artists: MsArtist[];
  album?: string;
  coverUrl?: string;
  durationMs?: number;
  isVip?: boolean;
}

export interface MsPlaylist {
  platform: string;
  id: string;
  name: string;
  coverUrl?: string;
  trackCount?: number;
  creator?: string;
  description?: string;
  kind?: string;
}

export interface MsAlbum {
  platform: string;
  id: string;
  name: string;
  coverUrl?: string;
  artists?: MsArtist[];
  trackCount?: number;
}

export interface MsPlaylistDetail {
  playlist: MsPlaylist;
  songs: MsSong[];
}

export interface MsResolveResult {
  platform: string;
  songId: string;
  playMusicUrl?: string;
  mimeType?: string;
  ext?: string;
  quality?: string;
  bitrate?: number;
  size?: number;
  isPreview: boolean;
  expireAt?: number;
}

export interface MsLyricLine {
  timeMs: number;
  text: string;
  words?: { timeMs: number; text: string }[];
}

export interface MsLyricResult {
  platform: string;
  songId: string;
  type: 'lrc' | 'word';
  lines: MsLyricLine[];
  raw?: string;
}

export interface MsAuthState {
  authenticated: boolean;
  platforms: string[];
}

export interface MsUserProfile {
  platform: string;
  id: string;
  nickname: string;
  avatarUrl?: string;
  isVip: boolean;
  vipLevel: string;
}

async function invokeMs<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (!isElectron) {
    throw new Error('Online music source requires Electron');
  }
  let res: MusicSourceIpcResult<T>;
  try {
    res = (await window.electron.ipcRenderer.invoke(channel, ...args)) as MusicSourceIpcResult<T>;
  } catch (error: any) {
    const msg = String(error?.message || error || '');
    // 主进程未注册 handler（旧构建 / 库加载失败）
    if (msg.includes('No handler registered') || msg.includes('Invalid channel')) {
      const err = new Error(
        '音源服务未就绪：请重启应用（主进程需加载 ly-music-source）'
      ) as Error & { code?: string };
      err.code = 'NO_HANDLER';
      throw err;
    }
    throw error;
  }
  if (!res || typeof res !== 'object' || !('ok' in res)) {
    throw new Error(`Invalid music-source response on ${channel}`);
  }
  if (!res.ok) {
    const err = new Error(res.message || channel) as Error & { code?: string };
    err.code = res.code;
    throw err;
  }
  return res.data;
}

export function isMusicSourceAvailable(): boolean {
  return isElectron;
}

/** Map library Song → player SongResult */
export function mapMsSongToSongResult(song: MsSong): SongResult {
  const artists = (song.artists || []).map((a, i) => ({
    id: a.id ? Number(a.id) || i : i,
    name: a.name,
    picUrl: a.avatarUrl || ''
  }));
  const album = {
    id: 0,
    name: song.album || '',
    picUrl: song.coverUrl || '',
    pic: 0,
    picId: 0
  };

  return {
    id: song.id,
    name: song.title,
    picUrl: song.coverUrl || '',
    ar: artists as any,
    artists: artists as any,
    al: album as any,
    album: album as any,
    song: {
      id: song.id,
      name: song.title,
      artists: artists as any,
      album: album as any
    },
    duration: song.durationMs,
    dt: song.durationMs,
    source: song.platform || 'qishui',
    count: 0
  };
}

export function mapMsPlaylistToItem(p: MsPlaylist) {
  return {
    id: p.id,
    name: p.name,
    picUrl: p.coverUrl || '',
    coverImgUrl: p.coverUrl || '',
    trackCount: p.trackCount,
    desc: p.creator || p.description || '',
    type: 'playlist',
    source: p.platform || 'qishui'
  };
}

export function mapMsAlbumToItem(a: MsAlbum) {
  return {
    id: a.id,
    name: a.name,
    picUrl: a.coverUrl || '',
    desc: (a.artists || []).map((x) => x.name).join(' / '),
    type: '专辑',
    source: a.platform || 'qishui',
    size: a.trackCount
  };
}

export async function msGetAuthState(): Promise<MsAuthState> {
  return invokeMs('music-source:get-auth-state');
}

export async function msImportCookie(cookie: string) {
  return invokeMs('music-source:import-cookie', cookie);
}

export async function msLogout() {
  return invokeMs('music-source:logout');
}

export async function msGetProfile(): Promise<MsUserProfile> {
  return invokeMs('music-source:get-profile');
}

export async function msSearchSongs(
  keyword: string,
  options?: { limit?: number; cursor?: number | string }
): Promise<MsSong[]> {
  return invokeMs('music-source:search-songs', keyword, options);
}

export async function msSearchPlaylists(
  keyword: string,
  options?: { limit?: number; cursor?: number | string }
): Promise<MsPlaylist[]> {
  return invokeMs('music-source:search-playlists', keyword, options);
}

export async function msSearchAlbums(
  keyword: string,
  options?: { limit?: number; cursor?: number | string }
): Promise<MsAlbum[]> {
  return invokeMs('music-source:search-albums', keyword, options);
}

export async function msSearchArtists(
  keyword: string,
  options?: { limit?: number; cursor?: number | string }
): Promise<MsArtist[]> {
  return invokeMs('music-source:search-artists', keyword, options);
}

export async function msSearchSuggestions(keyword: string): Promise<{ text: string }[]> {
  return invokeMs('music-source:search-suggestions', keyword);
}

export async function msListUserPlaylists(options?: {
  limit?: number;
  cursor?: number | string;
}): Promise<MsPlaylist[]> {
  return invokeMs('music-source:list-user-playlists', options);
}

export async function msGetPlaylist(playlistId: string): Promise<MsPlaylistDetail> {
  return invokeMs('music-source:get-playlist', playlistId);
}

export async function msResolve(query: {
  title?: string;
  artists?: string[];
  durationMs?: number;
  ids?: Record<string, string>;
  quality?: string;
}): Promise<MsResolveResult> {
  return invokeMs('music-source:resolve', query);
}

export async function msGetLyric(songId: string): Promise<MsLyricResult> {
  return invokeMs('music-source:get-lyric', songId);
}

/** Convert timed lyric lines to LRC text for existing parseLyrics */
export function msLyricToLrc(lines: MsLyricLine[]): string {
  return lines
    .map((line) => {
      const totalMs = Math.max(0, line.timeMs || 0);
      const m = Math.floor(totalMs / 60000);
      const s = Math.floor((totalMs % 60000) / 1000);
      const cs = Math.floor((totalMs % 1000) / 10);
      const tag = `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`;
      return `${tag}${line.text || ''}`;
    })
    .join('\n');
}
