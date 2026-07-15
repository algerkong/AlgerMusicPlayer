import type { ILyric, ILyricText, IWordData, SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import { trackToSongResult } from '@/utils/trackBridge';

import { msSongToTrack } from '../../shared/domain/trackAdapter';

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
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
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
  /** 本曲真实存在的档（规范 key） */
  availableQualities?: string[];
  /** 会员 + 本曲可用 后的实际取流档 */
  effectiveQuality?: string;
  bitrate?: number;
  size?: number;
  isPreview: boolean;
  /** 试听流：音频 t=0 对应全曲该毫秒；歌词需加偏移 */
  previewStartMs?: number;
  previewDurationMs?: number;
  /** resolve 顺带带回的译文 LRC */
  lyricTranslations?: Record<string, string>;
  expireAt?: number;
}

/** resolve 时缓存的译文，供 loadLrc 合并（避免 get-lyric 丢 translations） */
const lyricTranslationCache = new Map<string, Record<string, string>>();

export function cacheLyricTranslations(
  songId: string | number,
  translations?: Record<string, string> | null
): void {
  if (!songId || !translations || !Object.keys(translations).length) return;
  lyricTranslationCache.set(String(songId), translations);
}

export function takeCachedLyricTranslations(
  songId: string | number
): Record<string, string> | undefined {
  return lyricTranslationCache.get(String(songId));
}

export interface MsLyricLine {
  timeMs: number;
  text: string;
  words?: { timeMs: number; text: string; durationMs?: number }[];
}

export interface MsLyricResult {
  platform: string;
  songId: string;
  type: 'lrc' | 'word';
  lines: MsLyricLine[];
  raw?: string;
  /** 抓包 lyric.translations，如 cn → LRC 文本 */
  translations?: Record<string, string>;
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
  /** none | vip | svip */
  vipLevel: string;
}

/** commerce 会员（区分 VIP / SVIP） */
export interface MsMembership {
  isVip: boolean;
  vipLevel: string;
  vipStage?: string;
  expireAt?: number;
  membershipType?: string;
}

async function invokeMs<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (!isElectron) {
    throw new Error('Online music source requires Electron');
  }
  let res: MusicSourceIpcResult<T>;
  try {
    res = (await window.api.musicSourceInvoke(channel, ...args)) as MusicSourceIpcResult<T>;
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

/** Map library Song → Track（领域）→ 兼容 SongResult */
export function mapMsSongToSongResult(song: MsSong): SongResult {
  return trackToSongResult(msSongToTrack(song));
}

export { msSongToTrack };

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

/** 扫码登录：创建二维码会话（token + 图/链接，无 cookie） */
export interface MsQrLoginSession {
  platform: string;
  token: string;
  qrcode?: string;
  qrcodeIndexUrl?: string;
  expireTime?: number;
}

export type MsQrLoginStatus = 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'failed';

export interface MsQrLoginMfa {
  needSms: boolean;
  encryptUid?: string;
  verifyParams?: string;
  mobile?: string;
  upSmsMobile?: string;
  upSmsContent?: string;
  smsMode?: 'sms' | 'up' | '';
}

export interface MsQrLoginPollResult {
  status: MsQrLoginStatus;
  message?: string;
  mfa?: MsQrLoginMfa;
  /** 限流/节流：下次 poll 前应等待的秒数 */
  retryAfterSec?: number;
  throttled?: boolean;
  auth?: MsAuthState;
}

export async function msCreateQrLogin(): Promise<MsQrLoginSession> {
  return invokeMs('music-source:create-qr-login');
}

export async function msPollQrLogin(token: string): Promise<MsQrLoginPollResult> {
  return invokeMs('music-source:poll-qr-login', token);
}

export async function msQrSendMfaSms(token: string): Promise<{
  ok: boolean;
  message: string;
  mobile?: string;
  retryTime?: number;
}> {
  return invokeMs('music-source:qr-send-mfa-sms', token);
}

export async function msQrValidateMfaSms(
  token: string,
  code: string
): Promise<{
  ok: boolean;
  message: string;
  status?: MsQrLoginStatus;
  auth?: MsAuthState;
}> {
  return invokeMs('music-source:qr-validate-mfa-sms', token, code);
}

export async function msLogout() {
  return invokeMs('music-source:logout');
}

export async function msGetProfile(): Promise<MsUserProfile> {
  return invokeMs('music-source:get-profile');
}

export async function msGetMembership(): Promise<MsMembership> {
  return invokeMs('music-source:get-membership');
}

/**
 * 登录后拉档位：优先 commerce（SVIP），失败再退回 /me 的 vipLevel。
 */
export async function msResolveVipLevel(profileLevel?: string): Promise<'none' | 'vip' | 'svip'> {
  const normalize = (raw?: string): 'none' | 'vip' | 'svip' => {
    const s = String(raw || '')
      .trim()
      .toLowerCase();
    if (s.includes('svip') || s.includes('super')) return 'svip';
    if (s.includes('vip')) return 'vip';
    if (s === 'none' || !s) return 'none';
    return 'none';
  };
  try {
    const m = await msGetMembership();
    const fromCommerce = normalize(m.vipLevel || m.vipStage || m.membershipType);
    if (fromCommerce !== 'none') return fromCommerce;
  } catch {
    /* commerce 失败时用 profile */
  }
  return normalize(profileLevel);
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

export async function msCreatePlaylist(options: {
  name: string;
  isPrivate?: boolean;
  trackIds?: string[];
}): Promise<MsPlaylist> {
  return invokeMs('music-source:create-playlist', options);
}

export async function msUpdatePlaylist(
  playlistId: string,
  options: { name?: string; isPrivate?: boolean }
): Promise<MsPlaylist> {
  return invokeMs('music-source:update-playlist', playlistId, options);
}

export async function msDeletePlaylist(playlistId: string | string[]): Promise<string[]> {
  return invokeMs('music-source:delete-playlist', playlistId);
}

export async function msAppendPlaylistTracks(
  playlistId: string,
  trackIds: string[]
): Promise<MsPlaylist> {
  return invokeMs('music-source:append-playlist-tracks', playlistId, trackIds);
}

export async function msRemovePlaylistTracks(
  playlistId: string,
  trackIds: string[]
): Promise<MsPlaylist> {
  return invokeMs('music-source:remove-playlist-tracks', playlistId, trackIds);
}

export async function msResolve(query: {
  title?: string;
  artists?: string[];
  durationMs?: number;
  ids?: Record<string, string>;
  quality?: string;
  /** none | vip | svip — 库侧拦截会员档 */
  vipLevel?: string;
}): Promise<MsResolveResult> {
  return invokeMs('music-source:resolve', query);
}

export async function msGetLyric(songId: string): Promise<MsLyricResult> {
  return invokeMs('music-source:get-lyric', songId);
}

export interface MsPageResult<T> {
  items: T[];
  hasMore?: boolean;
  nextCursor?: string;
}

export async function msGetSongFeed(options?: {
  isFirst?: boolean;
  playedMedia?: { id: string; type?: string }[];
  mixSessionCount?: number;
  sceneModeId?: number;
}): Promise<MsPageResult<MsSong>> {
  return invokeMs('music-source:get-song-feed', options);
}

export async function msGetRelatedSongs(
  songId: string,
  options?: {
    artistIds?: string[];
    sceneName?: string;
    searchQuery?: string;
    playedMedia?: { id: string; type?: string }[];
    limit?: number;
  }
): Promise<MsPageResult<MsSong>> {
  return invokeMs('music-source:get-related-songs', songId, options);
}

export async function msDislikeTrack(
  songId: string,
  options?: { artistIds?: string[] }
): Promise<boolean> {
  return invokeMs('music-source:dislike-track', songId, options);
}

export async function msLikeTrack(songId: string): Promise<boolean> {
  return invokeMs('music-source:like-track', songId);
}

export async function msUnlikeTrack(songId: string): Promise<boolean> {
  return invokeMs('music-source:unlike-track', songId);
}

/** 带时间戳的歌词行转 LRC 文本（仅行级，无逐字） */
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

/** 优先 cn，否则取 translations 里第一段非空 LRC */
export function pickMsTranslationLrc(translations?: Record<string, string>): string {
  if (!translations) return '';
  if (typeof translations.cn === 'string' && translations.cn.trim()) return translations.cn;
  for (const v of Object.values(translations)) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

/**
 * 把 ly-music-source 的 lines（含真实 word 时间）转成播放器 ILyric。
 * 元信息行过滤只在库里做；这里只做格式映射，不二次发明业务规则。
 * 不要再 msLyricToLrc → 解析，否则字级时间全丢，只能整行假高亮。
 * 译文：result.translations（LRC）按时间贴到 trText。
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

    let words: IWordData[] | undefined;
    if (line.words && line.words.length > 0) {
      words = mapMsWordsToPlayer(line.words, startMs, nextMs);
      // 假逐字：整句一个词 → 降级行级
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

  // get-lyric 的 translations + resolve 缓存 二选一
  const mergedTr = {
    ...(takeCachedLyricTranslations(result.songId) || {}),
    ...(result.translations || {})
  };
  const tLrc = pickMsTranslationLrc(Object.keys(mergedTr).length ? mergedTr : result.translations);
  attachTranslationLrc(lrcArray, lrcTimeArray, tLrc);

  return { lrcArray, lrcTimeArray, hasWordByWord };
}

/**
 * 解析 LRC 译文并贴到 trText。
 * 汽水常：原文 KRC 从间奏后起跳，译文 LRC 从 0 起，±2s 对不齐 → 优先按行序，再放宽时间窗。
 */
export function attachTranslationLrc(
  lyrics: ILyricText[],
  timesSec: number[],
  tlyric: string
): void {
  if (!tlyric.trim() || !lyrics.length) return;

  const tLines: { sec: number; text: string }[] = [];
  for (const raw of tlyric.split(/\r?\n/)) {
    // 兼容 [00:00.00] / [0:00.00] / [00:00.000]
    const m = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)/.exec(raw);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const msRaw = m[3] ?? '0';
    const ms = Number(msRaw.padEnd(3, '0').slice(0, 3));
    const text = (m[4] ?? '').trim();
    if (!text) continue;
    tLines.push({ sec: min * 60 + sec + ms / 1000, text });
  }
  if (!tLines.length) return;

  // 1) 行数相同或接近：按索引对齐（抓包里最稳）
  if (Math.abs(tLines.length - lyrics.length) <= 3) {
    const n = Math.min(tLines.length, lyrics.length);
    for (let i = 0; i < n; i++) {
      if (lyrics[i].text) lyrics[i].trText = tLines[i].text;
    }
    return;
  }

  // 2) 估计全局时间偏移（首句最近邻），再逐行匹配
  let globalOffset = 0;
  {
    const firstLyric = timesSec.find((_, i) => lyrics[i]?.text) ?? timesSec[0] ?? 0;
    let bestDiff = Infinity;
    for (const t of tLines) {
      const d = Math.abs(t.sec - firstLyric);
      if (d < bestDiff) {
        bestDiff = d;
        globalOffset = firstLyric - t.sec;
      }
    }
    // 首句差太大时用中位句再估一次
    if (bestDiff > 30 && tLines.length > 2 && timesSec.length > 2) {
      const mid = Math.floor(timesSec.length / 3);
      const midT = timesSec[mid] ?? firstLyric;
      let bd = Infinity;
      for (const t of tLines) {
        const d = Math.abs(t.sec + globalOffset - midT);
        if (d < bd) {
          bd = d;
          globalOffset = midT - t.sec;
        }
      }
    }
  }

  const used = new Set<number>();
  for (let i = 0; i < lyrics.length; i++) {
    const item = lyrics[i];
    if (!item.text) {
      item.trText = '';
      continue;
    }
    const current = (timesSec[i] ?? (item.startTime || 0) / 1000) - globalOffset;
    let bestIdx = -1;
    let minDiff = 20; // 放宽到 20s
    for (let j = 0; j < tLines.length; j++) {
      if (used.has(j)) continue;
      const diff = Math.abs(tLines[j].sec - current);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx);
      item.trText = tLines[bestIdx].text;
    }
  }

  // 3) 仍大量空：按顺序填剩余
  const emptyIdx = lyrics.map((l, i) => (!l.trText && l.text ? i : -1)).filter((i) => i >= 0);
  if (emptyIdx.length > lyrics.length * 0.5) {
    const n = Math.min(emptyIdx.length, tLines.length);
    for (let k = 0; k < n; k++) {
      lyrics[emptyIdx[k]].trText = tLines[k].text;
    }
  }
}

/**
 * 汽水 KRC 英文词自带尾空格（抓包：`Walk ` / `in ` / `the `）。
 * 时长优先用源 durationMs（气口不并进高亮）；否则才撑到下一词起点。
 */
function mapMsWordsToPlayer(
  words: { timeMs: number; text: string; durationMs?: number }[],
  lineStartMs: number,
  lineEndMs: number
): IWordData[] {
  const cleaned = words
    .map((w) => {
      const raw = String(w.text ?? '');
      const trailingSpace = /\s$/.test(raw);
      const text = raw.replace(/\s+/g, ' ').trim();
      const durationMs = Number(w.durationMs);
      return {
        timeMs: Number(w.timeMs),
        text,
        trailingSpace,
        durationMs: Number.isFinite(durationMs) && durationMs > 0 ? durationMs : undefined
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
    sourceDuration: w.durationMs as number | undefined,
    space: w.trailingSpace || undefined
  }));

  absolute.sort((a, b) => a.startTime - b.startTime);
  for (let i = 0; i < absolute.length; i++) {
    const nextStart = i < absolute.length - 1 ? absolute[i + 1].startTime : lineEndMs;
    const gap = Math.max(40, nextStart - absolute[i].startTime);
    const src = absolute[i].sourceDuration;
    // 有源时长：不超过到下一词的间隔（避免重叠），气口不再被硬撑满
    absolute[i].duration = src != null ? Math.max(40, Math.min(src, gap)) : gap;
  }

  return absolute.map(({ text, startTime, duration, space }) => ({
    text,
    startTime,
    duration,
    space
  }));
}
