// 持久化歌曲对象的精简工具（P5：v2 Track 对齐字段）
// 三处 store 共用：playlist、playerCore、playHistory
//
// 为什么需要：localStorage 仅 5MB 配额。SongResult 直接持久化时，picUrl 可能是
// 几百 KB 的 base64 Data URL（旧版本本地音乐扫描会注入），lyric/song/expiredAt 等
// 字段也是只在运行时有意义的派生数据。
//
// v2 字段对齐 Track（id/title/artists/album/durationMs/coverUrl/platform），
// 仍附带少量会话恢复字段（local playMusicUrl、音质、播客标记）。
// inflateSong 同时接受 v1（name/ar/al/dt）与 v2，恢复为可播放的 SongResult。

import type { SongResult } from '../types/music';
import type { DjProgram } from '../types/podcast';
import { getSongAlbum, getSongArtists, getSongDurationMs } from './songFields';
import { normalizeSongResult } from './trackBridge';

/** 持久化条目版本：2 = Track 对齐字段 */
export const PERSIST_SONG_VERSION = 2 as const;

/**
 * 播客 program 持久化保留的最小字段集合
 */
export type MinifiedDjProgram = Pick<
  DjProgram,
  | 'id'
  | 'name'
  | 'mainSong'
  | 'radio'
  | 'coverUrl'
  | 'description'
  | 'createTime'
  | 'listenerCount'
  | 'commentCount'
  | 'liked'
  | 'likedCount'
>;

export type MinifiedArtist = { id: string; name: string };

export type MinifiedAlbum = {
  id?: string;
  name: string;
  coverUrl?: string;
};

/**
 * v2 落盘形状（Track 对齐 + 少量恢复字段）
 */
export type MinifiedSong = {
  v: typeof PERSIST_SONG_VERSION;
  id: string;
  title: string;
  platform?: string;
  coverUrl?: string;
  artists: MinifiedArtist[];
  album?: MinifiedAlbum;
  durationMs?: number;
  /** 仅 local:// */
  playMusicUrl?: string;
  availableQualities?: string[];
  streamQuality?: string;
  streamBitrate?: number;
  likedCount?: number;
  commentCount?: number;
  shareCount?: number;
  isPodcast?: boolean;
  program?: MinifiedDjProgram;
  isVip?: boolean;
  isOriginal?: boolean;
  isLimitedFree?: boolean;
  isDigital?: boolean;
  /** 作词（song_maker_team） */
  lyricists?: string[];
  /** 作曲 */
  composers?: string[];
};

/** v1 遗留形状（无 v 字段）——仅 inflate 用 */
export type MinifiedSongV1 = {
  id: string | number;
  name?: string;
  picUrl?: string;
  ar?: Array<{ id?: string | number; name?: string }>;
  al?: { id?: string | number; name?: string; picUrl?: string };
  source?: string;
  dt?: number;
  duration?: number;
  playMusicUrl?: string;
  availableQualities?: string[];
  streamQuality?: string;
  streamBitrate?: number;
  likedCount?: number;
  commentCount?: number;
  shareCount?: number;
  isPodcast?: boolean;
  program?: MinifiedDjProgram;
  artists?: Array<{ id?: string | number; name?: string }>;
  album?: { id?: string | number; name?: string; picUrl?: string; coverUrl?: string };
  title?: string;
  coverUrl?: string;
  platform?: string;
  durationMs?: number;
  v?: number;
};

/** 历史记录：运行时为可展示的 SongResult + 计数（deserialize 后 inflate） */
export type MusicHistoryItem = SongResult & {
  count: number;
  lastPlayTime?: number;
};

/** 历史落盘条目 */
export type MinifiedHistoryEntry = MinifiedSong & {
  count: number;
  lastPlayTime?: number;
};

const stripDataUrl = (url: string | undefined): string =>
  !url || url.startsWith('data:') ? '' : url;

const minifyProgram = (p: any): MinifiedDjProgram | undefined => {
  if (!p?.id) return undefined;
  return {
    id: p.id,
    name: p.name,
    mainSong: p.mainSong,
    radio: p.radio,
    coverUrl: stripDataUrl(p.coverUrl),
    description: p.description,
    createTime: p.createTime,
    listenerCount: p.listenerCount,
    commentCount: p.commentCount,
    liked: p.liked,
    likedCount: p.likedCount
  };
};

/**
 * SongResult → v2 落盘形状
 */
export const minifySong = (s: SongResult): MinifiedSong => {
  const n = normalizeSongResult(s);
  const artistList = getSongArtists(n);
  const album = getSongAlbum(n);
  const durationMs = getSongDurationMs(n) || undefined;

  return {
    v: PERSIST_SONG_VERSION,
    id: String(n.id),
    title: n.name || '',
    platform: n.source,
    coverUrl: stripDataUrl(n.picUrl) || undefined,
    artists: artistList.map((a, i) => ({
      id: a.id != null && String(a.id) !== '' ? String(a.id) : String(i),
      name: a.name || ''
    })),
    album:
      album?.name || album?.id != null
        ? {
            id: album.id != null ? String(album.id) : undefined,
            name: album.name || '',
            coverUrl: stripDataUrl(album.picUrl) || undefined
          }
        : undefined,
    durationMs,
    playMusicUrl: n.playMusicUrl?.startsWith('local://') ? n.playMusicUrl : undefined,
    availableQualities: Array.isArray(n.availableQualities)
      ? n.availableQualities.map(String).slice(0, 12)
      : undefined,
    streamQuality: n.streamQuality ? String(n.streamQuality) : undefined,
    streamBitrate: typeof n.streamBitrate === 'number' ? n.streamBitrate : undefined,
    likedCount:
      typeof n.likedCount === 'number' && Number.isFinite(n.likedCount) ? n.likedCount : undefined,
    commentCount:
      typeof n.commentCount === 'number' && Number.isFinite(n.commentCount)
        ? n.commentCount
        : undefined,
    shareCount:
      typeof n.shareCount === 'number' && Number.isFinite(n.shareCount) ? n.shareCount : undefined,
    isPodcast: n.isPodcast,
    program: minifyProgram(n.program),
    isVip: n.isVip,
    isOriginal: n.isOriginal,
    isLimitedFree: n.isLimitedFree,
    isDigital: n.isDigital,
    lyricists: Array.isArray(n.lyricists)
      ? n.lyricists
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12)
      : undefined,
    composers: Array.isArray(n.composers)
      ? n.composers
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12)
      : undefined
  };
};

function isV2Persisted(s: MinifiedSongV1 | MinifiedSong): s is MinifiedSong {
  return (
    (s as MinifiedSong).v === PERSIST_SONG_VERSION ||
    // 无 name、有 title+artists 也当 v2 容错
    ((s as MinifiedSongV1).name == null &&
      typeof (s as MinifiedSong).title === 'string' &&
      Array.isArray((s as MinifiedSong).artists))
  );
}

/**
 * 从 v1/v2/半残对象恢复为可播放 SongResult（补齐镜像字段）
 */
export const inflateSong = (
  s: Partial<SongResult> | MinifiedSong | MinifiedSongV1 | null | undefined
): SongResult => {
  if (!s) return {} as SongResult;
  const any = s as MinifiedSongV1 & MinifiedSong & Partial<SongResult>;
  if (any.id == null && any.title == null && any.name == null) {
    return s as SongResult;
  }

  if (isV2Persisted(any as MinifiedSong)) {
    const v2 = any as MinifiedSong;
    return normalizeSongResult({
      id: v2.id,
      name: v2.title,
      picUrl: v2.coverUrl || '',
      artists: (v2.artists || []).map((a) => ({
        id: a.id as any,
        name: a.name
      })) as SongResult['artists'],
      album: v2.album
        ? ({
            id: v2.album.id as any,
            name: v2.album.name,
            picUrl: v2.album.coverUrl || ''
          } as SongResult['album'])
        : undefined,
      duration: v2.durationMs,
      source: v2.platform,
      count: 0,
      playMusicUrl: v2.playMusicUrl,
      availableQualities: v2.availableQualities,
      streamQuality: v2.streamQuality,
      streamBitrate: v2.streamBitrate,
      likedCount: v2.likedCount,
      commentCount: v2.commentCount,
      shareCount: v2.shareCount,
      isPodcast: v2.isPodcast,
      program: v2.program as any,
      isVip: v2.isVip,
      isOriginal: v2.isOriginal,
      isLimitedFree: v2.isLimitedFree,
      isDigital: v2.isDigital,
      lyricists: v2.lyricists,
      composers: v2.composers
    } as SongResult);
  }

  // v1 / 运行时 SongResult 半残（ar/al/dt 仅在此处读入再转 artists/album/duration）
  const v1 = any as MinifiedSongV1 & Partial<SongResult>;
  const legacyArtists = (v1.artists?.length ? v1.artists : v1.ar) || [];
  const legacyAlbum = v1.album || v1.al;
  return normalizeSongResult({
    id: v1.id,
    name: v1.name || v1.title || '',
    picUrl: v1.picUrl || v1.coverUrl || '',
    artists: legacyArtists as SongResult['artists'],
    album: legacyAlbum
      ? ({
          id: (legacyAlbum as any).id,
          name: (legacyAlbum as any).name || '',
          picUrl: (legacyAlbum as any).picUrl || (legacyAlbum as any).coverUrl || ''
        } as SongResult['album'])
      : undefined,
    duration: v1.duration ?? v1.durationMs ?? v1.dt,
    source: v1.source || v1.platform,
    count: (v1 as any).count ?? 0,
    playMusicUrl: v1.playMusicUrl,
    availableQualities: v1.availableQualities,
    streamQuality: v1.streamQuality,
    streamBitrate: v1.streamBitrate,
    likedCount: v1.likedCount,
    commentCount: v1.commentCount,
    shareCount: v1.shareCount,
    isPodcast: v1.isPodcast,
    program: v1.program as any
  } as SongResult);
};

export const minifySongList = (list: SongResult[] | undefined): MinifiedSong[] =>
  list?.map(minifySong) ?? [];

export const inflateSongList = (
  list: Array<Partial<SongResult> | MinifiedSong | MinifiedSongV1> | undefined
): SongResult[] => list?.map((s) => inflateSong(s)) ?? [];

/** 历史落盘 */
export const minifyHistoryEntry = (
  s: SongResult & { count?: number; lastPlayTime?: number }
): MinifiedHistoryEntry => ({
  ...minifySong(s),
  count: s.count ?? 1,
  lastPlayTime: s.lastPlayTime
});

export const minifyHistoryList = (
  list: (SongResult & { count?: number; lastPlayTime?: number })[] | undefined
): MinifiedHistoryEntry[] => list?.map(minifyHistoryEntry) ?? [];

/** 历史恢复为可展示 SongResult + count */
export const inflateHistoryEntry = (
  s: MinifiedHistoryEntry | (MinifiedSongV1 & { count?: number; lastPlayTime?: number })
): MusicHistoryItem => {
  const song = inflateSong(s as any);
  return {
    ...song,
    count: (s as any).count ?? 1,
    lastPlayTime: (s as any).lastPlayTime
  };
};

export const inflateHistoryList = (list: unknown[] | undefined): MusicHistoryItem[] =>
  (list || []).map((s) => inflateHistoryEntry(s as any));

const PIC_KEYS = ['picUrl', 'coverImgUrl', 'coverUrl'] as const;

export const stripBase64Covers = <T extends Record<string, any>>(item: T): T => {
  const result: Record<string, any> = { ...item };
  for (const key of PIC_KEYS) {
    const value = result[key];
    if (typeof value === 'string' && value.startsWith('data:')) {
      result[key] = '';
    }
  }
  return result as T;
};

export const stripBase64CoversList = <T extends Record<string, any>>(list: T[] | undefined): T[] =>
  list?.map(stripBase64Covers) ?? [];
