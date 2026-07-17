/**
 * UI 只读视图（P1）：从 SongResult / Track 抽出展示字段。
 * 组件应优先吃 PlayableView，避免直接读 ar/dt 镜像。
 * 换曲/收藏仍用 raw SongResult，直到 P4 脱钩。
 */
import type { SongResult } from '../types/music';
import type { Track } from '../../shared/domain/track';
import {
  formatDurationMs,
  getSongAlbum,
  getSongArtists,
  getSongCoverUrl,
  getSongDurationMs
} from './songFields';
import { normalizeSongResult, trackToSongResult } from './trackBridge';

export type PlayableArtistView = {
  id: string | number;
  name: string;
  /** 雪花原始 id（若有） */
  idStr?: string;
};

export type PlayableView = {
  id: string | number;
  title: string;
  coverUrl: string;
  artists: PlayableArtistView[];
  /** "A / B" */
  artistText: string;
  albumName: string;
  durationMs: number;
  /** mm:ss；无效为 --:-- */
  durationText: string;
  platform?: string;
  isVip?: boolean;
  isPlayingHintId?: string | number;
  /** 过渡期：播放/收藏仍走 SongResult */
  raw: SongResult;
};

function artistsFromSong(song: SongResult): PlayableArtistView[] {
  return getSongArtists(song).map((a, i) => ({
    id: a.id != null && a.id !== '' ? a.id : i,
    name: a.name || '',
    idStr: typeof a.id === 'string' ? a.id : a.id != null ? String(a.id) : undefined
  }));
}

/** SongResult → 展示视图（先 normalize 再读） */
export function toPlayableView(song: SongResult | null | undefined): PlayableView | null {
  if (!song || song.id == null) return null;
  const n = normalizeSongResult(song);
  const artists = artistsFromSong(n);
  const durationMs = getSongDurationMs(n);
  const album = getSongAlbum(n);
  return {
    id: n.id,
    title: n.name || '',
    coverUrl: getSongCoverUrl(n) || n.picUrl || '',
    artists,
    artistText:
      artists
        .map((a) => a.name)
        .filter(Boolean)
        .join(' / ') || '',
    albumName: album?.name || '',
    durationMs,
    durationText: formatDurationMs(durationMs),
    platform: n.source,
    isVip: n.isVip,
    raw: n
  };
}

/** Track → 展示视图（经 bridge，保证与列表 DTO 一致） */
export function trackToPlayableView(track: Track): PlayableView {
  const view = toPlayableView(trackToSongResult(track));
  if (!view) {
    return {
      id: track.id,
      title: track.title,
      coverUrl: track.coverUrl || '',
      artists: track.artists.map((a, i) => ({
        id: a.id || i,
        name: a.name,
        idStr: a.id
      })),
      artistText: track.artists.map((a) => a.name).join(' / '),
      albumName: track.album?.name || '',
      durationMs: track.durationMs || 0,
      durationText: formatDurationMs(track.durationMs || 0),
      platform: track.platform,
      isVip: track.isVip,
      raw: trackToSongResult(track)
    };
  }
  return view;
}

export function artistTextOf(song: SongResult | null | undefined, fallback = ''): string {
  return toPlayableView(song)?.artistText || fallback;
}
