import type { ArtistRef, Track } from './track';

/** 音源 MsSong 最小形状（避免 shared 依赖 renderer） */
export interface MsSongLike {
  platform: string;
  id: string;
  title: string;
  artists?: Array<{ id?: string; name: string; avatarUrl?: string }>;
  album?: string;
  coverUrl?: string;
  durationMs?: number;
  isVip?: boolean;
  isOriginal?: boolean;
  isLimitedFree?: boolean;
  limitedFreeExpireAt?: number;
  hasPreview?: boolean;
  preview?: Track['preview'];
  isDigital?: boolean;
  digital?: Track['digital'];
  genreTags?: string[];
  lyricists?: string[];
  composers?: string[];
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
}

export function msSongToTrack(song: MsSongLike): Track {
  const artists: ArtistRef[] = (song.artists || []).map((a, i) => ({
    id: a.id != null && String(a.id) !== '' ? String(a.id) : String(i),
    name: a.name,
    avatarUrl: a.avatarUrl
  }));

  return {
    platform: song.platform || 'qishui',
    id: String(song.id),
    title: song.title,
    artists,
    album: song.album ? { name: song.album, coverUrl: song.coverUrl } : undefined,
    coverUrl: song.coverUrl,
    durationMs: song.durationMs,
    isVip: Boolean(song.isVip),
    isOriginal: song.isOriginal,
    isLimitedFree: Boolean(song.isLimitedFree),
    limitedFreeExpireAt: song.limitedFreeExpireAt,
    hasPreview: Boolean(song.hasPreview),
    preview: song.preview,
    isDigital: Boolean(song.isDigital),
    digital: song.digital,
    genreTags: song.genreTags,
    lyricists: song.lyricists,
    composers: song.composers,
    likeCount: song.likeCount,
    commentCount: song.commentCount,
    shareCount: song.shareCount
  };
}
