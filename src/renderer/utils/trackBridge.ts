/**
 * Track ↔ SongResult 桥接（兼容层）。
 * 新代码优先持有 Track + PlaybackRuntime；UI/旧 store 仍吃 SongResult。
 */

import type { SongResult } from '@/types/music';

import type { ArtistRef,PlayableTrack, PlaybackRuntime, Track } from '../../shared/domain/track';

export function trackToSongResult(track: Track): SongResult {
  const artists = track.artists.map((a, i) => ({
    id: Number(a.id) || i,
    name: a.name,
    picUrl: a.avatarUrl || ''
  }));
  const album = {
    id: track.album?.id ? Number(track.album.id) || 0 : 0,
    name: track.album?.name || '',
    picUrl: track.album?.coverUrl || track.coverUrl || '',
    pic: 0,
    picId: 0
  };

  return {
    id: track.id,
    name: track.title,
    picUrl: track.coverUrl || '',
    ar: artists as SongResult['ar'],
    artists: artists as SongResult['artists'],
    al: album as SongResult['al'],
    album: album as SongResult['album'],
    song: {
      id: track.id,
      name: track.title,
      artists: artists as any,
      album: album as any
    },
    duration: track.durationMs,
    dt: track.durationMs,
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
    composers: track.composers
  };
}

export function attachRuntime(song: SongResult, runtime?: PlaybackRuntime): SongResult {
  if (!runtime) return song;
  return {
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
  };
}

export function playableToSongResult(playable: PlayableTrack): SongResult {
  return attachRuntime(trackToSongResult(playable.track), playable.runtime);
}

export function songResultToTrack(song: SongResult): Track {
  const artists: ArtistRef[] = (song.ar || song.artists || []).map((a: any, i: number) => ({
    id: a?.id != null ? String(a.id) : String(i),
    name: a?.name || '',
    avatarUrl: a?.picUrl || a?.avatarUrl
  }));
  const al = song.al || song.album;
  return {
    platform: song.source || 'unknown',
    id: String(song.id),
    title: song.name,
    artists,
    album: al
      ? { id: al.id != null ? String(al.id) : undefined, name: al.name || '', coverUrl: al.picUrl }
      : undefined,
    coverUrl: song.picUrl || al?.picUrl,
    durationMs: song.duration ?? song.dt,
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
