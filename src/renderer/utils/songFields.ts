/**
 * SongResult 字段读口：adapter 双字段（ar/artists、duration/dt）只在这里 fallback。
 * 调用方禁止再写 `song.ar || song.artists`。
 */
import type { Artist, SongResult } from '@/types/music';

type SongLike = Pick<
  SongResult,
  'ar' | 'artists' | 'duration' | 'dt' | 'song' | 'al' | 'album' | 'picUrl'
>;

/** 艺人列表：ar → artists → song.artists */
export function getSongArtists(song: SongLike | null | undefined): Artist[] {
  if (!song) return [];
  const list = song.ar || song.artists || song.song?.artists;
  return (list as Artist[] | undefined) || [];
}

/** 时长毫秒：duration → dt → song.duration */
export function getSongDurationMs(song: SongLike | null | undefined): number {
  if (!song) return 0;
  if (typeof song.duration === 'number' && !Number.isNaN(song.duration)) return song.duration;
  if (typeof song.dt === 'number' && !Number.isNaN(song.dt)) return song.dt;
  const nested = song.song?.duration;
  if (typeof nested === 'number' && !Number.isNaN(nested)) return nested;
  return 0;
}

/** 专辑封面：picUrl → al/album.picUrl */
export function getSongCoverUrl(song: SongLike | null | undefined): string {
  if (!song) return '';
  return song.picUrl || song.al?.picUrl || song.album?.picUrl || '';
}

/** 专辑对象：al → album */
export function getSongAlbum(
  song: SongLike | null | undefined
): SongResult['al'] | SongResult['album'] | undefined {
  if (!song) return undefined;
  return song.al || song.album;
}

/** mm:ss，毫秒入参；0/无效 → --:-- */
export function formatDurationMs(ms: number): string {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
