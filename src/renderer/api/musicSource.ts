import type { ILyric, ILyricText, IWordData, SongResult } from '@/types/music';
import { isElectron } from '@/utils';

export type MusicSourceIpcResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string };

export interface MsArtist {
  platform: string;
  id?: string;
  name: string;
  avatarUrl?: string;
}

export interface MsSongPreview {
  startMs: number;
  durationMs: number;
  vid?: string;
}

export interface MsSongDigital {
  paymentItemId?: string;
  amount?: number;
  paymentItemType?: number;
  onlineDate?: number;
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
  isOriginal?: boolean;
  isLimitedFree?: boolean;
  limitedFreeExpireAt?: number;
  hasPreview?: boolean;
  preview?: MsSongPreview;
  isDigital?: boolean;
  digital?: MsSongDigital;
  genreTags?: string[];
  lyricists?: string[];
  composers?: string[];
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
  nextCursor?: string;
  hasMore?: boolean;
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
    count: 0,
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
    composers: song.composers
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

export async function msGetPlaylist(
  playlistId: string,
  options?: { limit?: number; cursor?: number | string; fetchAll?: boolean }
): Promise<MsPlaylistDetail> {
  return invokeMs('music-source:get-playlist', playlistId, options);
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

/** Convert timed lyric lines to LRC text (line-level only, no word timing) */
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

/**
 * 作词/作曲/编曲等元信息行：只当普通文案，绝不当逐字卡拉 OK。
 * 抓包与汽水分享页里常见「作词 : xxx」「作曲：xxx」带时间戳。
 */
export function isLyricCreditLine(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return true;
  return /^(作词|作曲|编曲|制作人|制作|混音|录音|母带|出品人|出品|原唱|翻唱|演唱|监制|和声|吉他|贝斯|鼓手?|键盘|弦乐|配唱|OP|SP|by|composer|lyricist|arranged|producer|written|lyrics)[:：\s]/i.test(
    t
  );
}

/**
 * 把 ly-music-source 的 lines（含真实 word 时间）转成播放器 ILyric。
 * 不要再 msLyricToLrc → 解析，否则字级时间全丢，只能整行假高亮。
 */
export function msLyricToILyric(result: MsLyricResult): ILyric {
  const lines = result.lines || [];
  const lrcArray: ILyricText[] = [];
  const lrcTimeArray: number[] = [];
  let hasWordByWord = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = (line.text || '').trim();
    if (!text) continue;

    const startMs = Math.max(0, Number(line.timeMs) || 0);
    const nextMs =
      i < lines.length - 1
        ? Math.max(startMs, Number(lines[i + 1].timeMs) || startMs)
        : startMs + 3000;
    const lineDuration = Math.max(0, nextMs - startMs);
    const credit = isLyricCreditLine(text);

    let words: IWordData[] | undefined;
    // 仅非元信息行 + 库明确给了 words 才做逐字
    if (!credit && line.words && line.words.length > 0) {
      words = mapMsWordsToPlayer(line.words, startMs, nextMs);
      // 假逐字：整句一个词 / 时长异常，降级成行级
      if (!words.length || (words.length === 1 && words[0].text === text)) {
        words = undefined;
      } else {
        hasWordByWord = true;
      }
    }

    lrcArray.push({
      text,
      trText: '',
      words,
      hasWordByWord: Boolean(words?.length),
      startTime: startMs,
      duration: lineDuration
    });
    // 与全链路一致：秒
    lrcTimeArray.push(startMs / 1000);
  }

  return { lrcArray, lrcTimeArray, hasWordByWord };
}

function shouldInsertWordSpace(cur: string, nxt: string): boolean {
  if (!cur || !nxt) return false;
  if (/\s$/.test(cur) || /^\s/.test(nxt)) return false;
  // 标点前不插空格
  if (/^[,.;:!?…，。！？、；：'")\]}»」』】]/.test(nxt)) return false;
  if (/['"({[«「『【]$/.test(cur)) return false;
  // 拉丁/数字单词之间
  if (/[A-Za-z0-9]$/.test(cur) && /^[A-Za-z0-9]/.test(nxt)) return true;
  // 中英交界
  if (/[\u4e00-\u9fff]$/.test(cur) && /^[A-Za-z0-9]/.test(nxt)) return true;
  if (/[A-Za-z0-9]$/.test(cur) && /^[\u4e00-\u9fff]/.test(nxt)) return true;
  return false;
}

function mapMsWordsToPlayer(
  words: { timeMs: number; text: string }[],
  lineStartMs: number,
  lineEndMs: number
): IWordData[] {
  const cleaned = words
    .map((w) => {
      const raw = String(w.text ?? '');
      // 源数据里词尾空格 → space 标记，正文 trim
      const trailingSpace = /\s$/.test(raw);
      const text = raw.replace(/\s+/g, ' ').trim();
      return {
        timeMs: Number(w.timeMs),
        text,
        trailingSpace
      };
    })
    .filter((w) => w.text.length > 0 && Number.isFinite(w.timeMs));

  if (!cleaned.length) return [];

  // 相对时间：字时间都远小于行起点（常见 0~行长），需加上行 start
  const maxWordT = Math.max(...cleaned.map((w) => w.timeMs));
  const looksRelative =
    cleaned.every((w) => w.timeMs <= lineStartMs + 5) ||
    (lineStartMs > 1000 && maxWordT < lineStartMs * 0.5 && maxWordT < 120_000);

  const absolute = cleaned.map((w) => ({
    text: w.text,
    startTime: looksRelative ? lineStartMs + Math.max(0, w.timeMs) : w.timeMs,
    duration: 0,
    space: w.trailingSpace as boolean | undefined
  }));

  // 按时间排序，算 duration + 英文词间空格
  absolute.sort((a, b) => a.startTime - b.startTime);
  for (let i = 0; i < absolute.length; i++) {
    const nextStart = i < absolute.length - 1 ? absolute[i + 1].startTime : lineEndMs;
    absolute[i].duration = Math.max(40, nextStart - absolute[i].startTime);
    if (i < absolute.length - 1) {
      absolute[i].space =
        absolute[i].space || shouldInsertWordSpace(absolute[i].text, absolute[i + 1].text);
    }
  }

  return absolute;
}
