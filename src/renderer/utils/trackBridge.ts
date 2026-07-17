/**
 * Track ↔ SongResult 桥接（兼容层）。
 * P6：SongResult 仅规范字段 artists / album / duration（无 ar/al/dt）。
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
 * 规整 SongResult：封面/艺人/专辑/时长只写规范字段。
 * 幂等；入口（API map、列表恢复）应调用。
 */
export function normalizeSongResult(song: SongResult): SongResult {
  if (!song || typeof song !== 'object') return song;

  const artists = getSongArtists(song) as SongResult['artists'];
  const albumRef = getSongAlbum(song);
  const durationMs = getSongDurationMs(song);
  const cover = getSongCoverUrl(song) || song.picUrl || '';

  const album = (
    albumRef
      ? {
          ...albumRef,
          picUrl: albumRef.picUrl || cover || ''
        }
      : song.album || {
          id: 0,
          name: '',
          picUrl: cover,
          pic: 0,
          picId: 0
        }
  ) as SongResult['album'];

  const duration = durationMs > 0 ? durationMs : song.duration;

  return {
    ...song,
    picUrl: cover || song.picUrl,
    artists: artists as SongResult['artists'],
    album: album as SongResult['album'],
    duration,
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
    id: toCompatNumberId(a.id, i),
    name: a.name,
    picUrl: a.avatarUrl || '',
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

  return normalizeSongResult({
    id: track.id,
    name: track.title,
    picUrl: track.coverUrl || '',
    artists: artists as unknown as SongResult['artists'],
    album: album as unknown as SongResult['album'],
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
    primaryColor: runtime.primaryColor ?? song.primaryColor,
    isPartialStream: runtime.isPartialStream ?? song.isPartialStream,
    pendingFullUrl: runtime.pendingFullUrl ?? song.pendingFullUrl,
    availableQualities: runtime.availableQualities ?? song.availableQualities,
    streamQuality: runtime.streamQuality ?? song.streamQuality,
    streamBitrate: runtime.streamBitrate ?? song.streamBitrate,
    preferredQuality: runtime.preferredQuality ?? song.preferredQuality,
    forceQualityResolve: runtime.forceQualityResolve ?? song.forceQualityResolve
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
    composers: song.composers,
    likeCount: song.likedCount,
    commentCount: song.commentCount,
    shareCount: song.shareCount
  };
}

export function songResultToRuntime(song: SongResult): PlaybackRuntime {
  return {
    source: {
      url: song.playMusicUrl,
      isPreviewStream: song.isPreviewStream,
      previewStartMs: song.preview?.startMs,
      previewDurationMs: song.preview?.durationMs,
      expiresAt: song.expiredAt,
      createdAt: song.createdAt
    },
    playLoading: song.playLoading,
    isFirstPlay: song.isFirstPlay,
    lyric: song.lyric,
    backgroundColor: song.backgroundColor,
    primaryColor: song.primaryColor,
    isPartialStream: song.isPartialStream,
    pendingFullUrl: song.pendingFullUrl,
    availableQualities: song.availableQualities,
    streamQuality: song.streamQuality,
    streamBitrate: song.streamBitrate,
    preferredQuality: song.preferredQuality,
    forceQualityResolve: song.forceQualityResolve
  };
}

/** 从兼容壳拆出 PlayableTrack */
export function songResultToPlayable(song: SongResult): PlayableTrack {
  return {
    track: songResultToTrack(song),
    runtime: songResultToRuntime(song)
  };
}
