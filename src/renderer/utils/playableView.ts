/**
 * UI 只读视图：从 SongResult / Track 抽出展示字段（P1/P4）。
 * 组件展示优先用 PlayableView；播放/收藏过渡期仍用 raw。
 */
import type { Track } from '../../shared/domain/track';
import type { SongResult } from '../types/music';
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
  /** tns / alia 首项，用于副标题括号 */
  subtitle: string;
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
  isOriginal?: boolean;
  isLimitedFree?: boolean;
  isDigital?: boolean;
  /** 播放加载中 */
  isLoading?: boolean;
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
  const subtitle = (n.tns?.[0] || n.alia?.[0] || '').trim();
  return {
    id: n.id,
    title: n.name || '',
    subtitle,
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
    isOriginal: n.isOriginal,
    isLimitedFree: n.isLimitedFree,
    isDigital: n.isDigital,
    isLoading: !!n.playLoading,
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
      subtitle: '',
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
      isOriginal: track.isOriginal,
      isLimitedFree: track.isLimitedFree,
      isDigital: track.isDigital,
      raw: trackToSongResult(track)
    };
  }
  return view;
}

export function artistTextOf(song: SongResult | null | undefined, fallback = ''): string {
  return toPlayableView(song)?.artistText || fallback;
}

export function titleOf(song: SongResult | null | undefined, fallback = ''): string {
  return toPlayableView(song)?.title || fallback;
}

export function coverUrlOf(song: SongResult | null | undefined, fallback = ''): string {
  return toPlayableView(song)?.coverUrl || fallback;
}
