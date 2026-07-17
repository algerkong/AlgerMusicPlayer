/**
 * 曲目 DTO 字段读口（main / renderer 共用）。
 * ar/artists、duration/dt 双字段只在这里 fallback。
 *
 * 参数刻意用「窄可选字段」结构，避免 index signature 挡住 SongResult.Artist。
 */

export type SongArtistLike = {
  id?: string | number;
  name?: string;
  picUrl?: string;
  avatarUrl?: string;
};

export type SongAlbumLike = {
  id?: string | number;
  name?: string;
  picUrl?: string;
};

export type SongLike = {
  ar?: readonly SongArtistLike[] | null;
  artists?: readonly SongArtistLike[] | null;
  duration?: number | null;
  dt?: number | null;
  picUrl?: string | null;
  al?: SongAlbumLike | null;
  album?: SongAlbumLike | null;
  name?: string | null;
  song?: {
    artists?: readonly SongArtistLike[] | null;
    album?: SongAlbumLike | null;
    duration?: number | null;
    picUrl?: string | null;
    name?: string | null;
  } | null;
};

/** 艺人列表：非空 ar → artists → song.artists（空数组不算有值） */
export function getSongArtists(song: SongLike | null | undefined): SongArtistLike[] {
  if (!song) return [];
  if (song.ar?.length) return [...song.ar];
  if (song.artists?.length) return [...song.artists];
  if (song.song?.artists?.length) return [...song.song.artists];
  return [];
}

/** 艺人名拼接 */
export function getSongArtistNames(
  song: SongLike | null | undefined,
  sep = ' / ',
  fallback = ''
): string {
  const names = getSongArtists(song)
    .map((a) => a?.name)
    .filter((n): n is string => !!n);
  return names.length ? names.join(sep) : fallback;
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

/** 专辑封面：picUrl → al/album.picUrl → song.picUrl */
export function getSongCoverUrl(song: SongLike | null | undefined): string {
  if (!song) return '';
  return song.picUrl || song.al?.picUrl || song.album?.picUrl || song.song?.picUrl || '';
}

/** 专辑对象：有 name 的 al → album → song.album */
export function getSongAlbum(song: SongLike | null | undefined): SongAlbumLike | undefined {
  if (!song) return undefined;
  if (song.al?.name) return song.al;
  if (song.album?.name) return song.album;
  if (song.song?.album?.name) return song.song.album;
  return song.al || song.album || song.song?.album || undefined;
}

/** 专辑名 */
export function getSongAlbumName(song: SongLike | null | undefined, fallback = ''): string {
  return getSongAlbum(song)?.name || song?.name || fallback;
}

/** mm:ss，毫秒入参；0/无效 → --:-- */
export function formatDurationMs(ms: number): string {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
