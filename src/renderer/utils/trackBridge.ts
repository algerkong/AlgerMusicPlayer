/**
 * Track ↔ SongResult 桥接（兼容层）。
 * 新代码优先持有 Track + PlaybackRuntime；UI/旧 store 仍吃 SongResult。
 *
 * SongResult 双字段策略（半迁移期）：
 * - 读：只用 songFields（getSongArtists / getSongDurationMs …）
 * - 写：adapter / 归一化保证 ar≡artists、al≡album、duration≡dt
 */

import type { SongResult } from '@/types/music';

import type { ArtistRef, PlayableTrack, PlaybackRuntime, Track } from '../../shared/domain/track';
import { getSongAlbum, getSongArtists, getSongCoverUrl, getSongDurationMs } from './songFields';

/** 仅 UI 兼容用：SAFE 整数才转 number，否则 0（真实 id 以 string 字段为准） */
function toCompatNumberId(raw?: string | null, fallback = 0): number {
  if (raw == null || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) return fallback;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : fallback;
}

/**
 * 对齐 SongResult 镜像字段，使「只写了一边」的对象也能被旧代码读到。
 * 幂等；入口（API map、列表恢复、formatSong）应调用。
 */
export function normalizeSongResult(song: SongResult): SongResult {
  if (!song || typeof song !== 'object') return song;

  const artists = getSongArtists(song) as SongResult['ar'];
  const albumRef = getSongAlbum(song);
  const durationMs = getSongDurationMs(song);
  const cover = getSongCoverUrl(song) || song.picUrl || '';

  const album = (
    albumRef
      ? {
          ...albumRef,
          picUrl: albumRef.picUrl || cover || ''
        }
      : song.al ||
        song.album || {
          id: 0,
          name: '',
          picUrl: cover,
          pic: 0,
          picId: 0
        }
  ) as SongResult['al'];

  const duration = durationMs > 0 ? durationMs : (song.duration ?? song.dt);

  return {
    ...song,
    picUrl: cover || song.picUrl,
    ar: artists,
    artists: artists as SongResult['artists'],
    al: album,
    album: album as SongResult['album'],
    duration,
    dt: duration,
    song: {
      ...song.song,
      id: song.song?.id ?? song.id,
      name: song.song?.name ?? song.name,
      artists: artists as any,
      album: album as any
    }
  };
}

export function trackToSongResult(track: Track): SongResult {
  const artists = track.artists.map((a, i) => ({
    // 路由/展示仍吃 number 型 Artist.id；超大雪花勿 Number 以免精度崩
    id: toCompatNumberId(a.id, i),
    name: a.name,
    picUrl: a.avatarUrl || '',
    /** 保留原始字符串 id，后续歌手页可改用 */
    idStr: a.id
  }));
  const album = {
    id: toCompatNumberId(track.album?.id, 0),
    name: track.album?.name || '',
    picUrl: track.album?.coverUrl || track.coverUrl || '',
    pic: 0,
    picId: 0,
    idStr: track.album?.id
  };

  // 只写「规范侧」+ 必要字段；镜像由 normalize 填齐
  return normalizeSongResult({
    id: track.id,
    name: track.title,
    picUrl: track.coverUrl || '',
    artists: artists as unknown as SongResult['artists'],
    album: album as unknown as SongResult['album'],
    // ar/al 暂用空壳，normalize 会从 artists/album 回填
    ar: [] as unknown as SongResult['ar'],
    al: { id: 0, name: '', picUrl: '', pic: 0, picId: 0 } as unknown as SongResult['al'],
    duration: track.durationMs,
    source: track.platform,
    count: 0,
    isVip: track.isVip,
    isOriginal: track.isOriginal,
    isLimitedFree: track.isLimitedFree,
    limitedFreeExpireAt: track.limitedFreeExpireAt,
    hasPreview: track.hasPreview,
    preview: track.preview,
    isDigital: track.isDigital,
    digital: track.digital,
    genreTags: track.genreTags,
    lyricists: track.lyricists,
    composers: track.composers,
    likedCount: track.likeCount,
    commentCount: track.commentCount,
    shareCount: track.shareCount
  } as SongResult);
}

export function attachRuntime(song: SongResult, runtime?: PlaybackRuntime): SongResult {
  if (!runtime) return normalizeSongResult(song);
  return normalizeSongResult({
    ...song,
    playMusicUrl: runtime.source?.url ?? song.playMusicUrl,
    playLoading: runtime.playLoading ?? song.playLoading,
    isFirstPlay: runtime.isFirstPlay ?? song.isFirstPlay,
    isPreviewStream: runtime.source?.isPreviewStream ?? song.isPreviewStream,
    expiredAt: runtime.source?.expiresAt ?? song.expiredAt,
    createdAt: runtime.source?.createdAt ?? song.createdAt,
    lyric: (runtime.lyric as SongResult['lyric']) ?? song.lyric,
    backgroundColor: runtime.backgroundColor ?? song.backgroundColor,
    primaryColor: runtime.primaryColor ?? song.primaryColor
  });
}

export function playableToSongResult(playable: PlayableTrack): SongResult {
  return attachRuntime(trackToSongResult(playable.track), playable.runtime);
}

export function songResultToTrack(song: SongResult): Track {
  const artists: ArtistRef[] = getSongArtists(song).map((a: any, i: number) => ({
    id: a?.id != null ? String(a.id) : String(i),
    name: a?.name || '',
    avatarUrl: a?.picUrl || a?.avatarUrl
  }));
  const al = getSongAlbum(song);
  return {
    platform: song.source || 'unknown',
    id: String(song.id),
    title: song.name,
    artists,
    album: al
      ? { id: al.id != null ? String(al.id) : undefined, name: al.name || '', coverUrl: al.picUrl }
      : undefined,
    coverUrl: song.picUrl || al?.picUrl,
    durationMs: getSongDurationMs(song) || undefined,
    isVip: song.isVip,
    isOriginal: song.isOriginal,
    isLimitedFree: song.isLimitedFree,
    limitedFreeExpireAt: song.limitedFreeExpireAt,
    hasPreview: song.hasPreview,
    preview: song.preview,
    isDigital: song.isDigital,
    digital: song.digital,
    genreTags: song.genreTags,
    lyricists: song.lyricists,
    composers: song.composers
  };
}

export function songResultToRuntime(song: SongResult): PlaybackRuntime {
  return {
    source: {
      url: song.playMusicUrl,
      isPreviewStream: song.isPreviewStream,
      expiresAt: song.expiredAt,
      createdAt: song.createdAt
    },
    playLoading: song.playLoading,
    isFirstPlay: song.isFirstPlay,
    lyric: song.lyric,
    backgroundColor: song.backgroundColor,
    primaryColor: song.primaryColor
  };
}
