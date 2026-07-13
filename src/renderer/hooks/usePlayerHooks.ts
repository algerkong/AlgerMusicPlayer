import {
  attachTranslationLrc,
  cacheLyricTranslations,
  msGetLyric,
  msLyricToILyric,
  msLyricToLrc,
  msResolve,
  pickMsTranslationLrc,
  takeCachedLyricTranslations
} from '@/api/musicSource';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import type { ILyric, ILyricText, IWordData, SongResult } from '@/types/music';
import { getSetData, isElectron } from '@/utils';
import { isPreviewStreamUrl, restorePreviewStreamFlags } from '@/utils/previewStream';
import { parseLyrics as parseYrcLyrics } from '@/utils/yrcParser';

type DiskCacheResolveResult = {
  url?: string;
  cached?: boolean;
  queued?: boolean;
};

const getSongArtistText = (songData: SongResult): string => {
  if (songData?.ar?.length) {
    return songData.ar.map((artist) => artist.name).join(' / ');
  }

  if (songData?.song?.artists?.length) {
    return songData.song.artists.map((artist) => artist.name).join(' / ');
  }

  return '';
};

const resolveCachedPlaybackUrl = async (
  url: string | null | undefined,
  songData: SongResult
): Promise<string | null | undefined> => {
  if (!url || !isElectron || !/^https?:\/\//i.test(url)) {
    return url;
  }

  try {
    const result = (await window.api.resolveCachedMusicUrl({
      songId: Number(songData.id),
      source: songData.source,
      url,
      title: songData.name,
      artist: getSongArtistText(songData)
    })) as DiskCacheResolveResult;

    if (result?.url) {
      return result.url;
    }
  } catch (error) {
    console.warn('解析缓存播放地址失败，回退到在线地址:', error);
  }

  return url;
};

/**
 * 获取歌曲播放 URL。
 * 本地 / 已有 playMusicUrl 优先；在线曲经 ly-music-source（主进程）resolve。
 */
export const getSongUrl = async (
  id: string | number,
  songData: SongResult,
  isDownloaded: boolean = false,
  requestId?: string
) => {
  if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
    console.log(`[getSongUrl] 请求已失效: ${requestId}`);
    throw new Error('Request cancelled');
  }

  if (songData.playMusicUrl) {
    // 复用缓存 URL 时也要恢复试听标记（否则切回第一首 isPreviewStream 丢失 → 歌词错位）
    restorePreviewStreamFlags(songData);
    // 有试听文件路径却丢了 startMs：必须重 resolve，否则歌词 base=0
    const needPreviewMeta =
      (songData.isPreviewStream || isPreviewStreamUrl(songData.playMusicUrl)) &&
      !(Number(songData.preview?.startMs) > 0);
    if (!needPreviewMeta) {
      if (isDownloaded) return songData.playMusicUrl;
      if (songData.playMusicUrl.startsWith('local://')) {
        return songData.playMusicUrl;
      }
      return await resolveCachedPlaybackUrl(songData.playMusicUrl, songData);
    }
    console.warn(`[getSongUrl] 试听 URL 缺少 startMs，重新 resolve id=${id}`);
    songData.playMusicUrl = undefined;
  }

  if (!isElectron) {
    console.warn(`[getSongUrl] 非 Electron 环境无法在线取链 (id=${id})`);
    return null;
  }

  try {
    const setData = getSetData();
    const quality = setData?.musicQuality || 'higher';
    const artists =
      songData.ar?.map((a) => a.name).filter(Boolean) ||
      songData.artists?.map((a) => a.name).filter(Boolean) ||
      [];

    const ids: Record<string, string> = {};
    const source = songData.source || 'qishui';
    if (source === 'qishui' || source === 'local') {
      // 搜索结果默认 qishui id
      ids.qishui = String(id);
    } else {
      ids[source] = String(id);
      ids.qishui = String(id);
    }

    const result = await msResolve({
      ids,
      title: songData.name,
      artists,
      durationMs: songData.dt || songData.duration,
      quality
    });

    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      throw new Error('Request cancelled');
    }

    if (!result.playMusicUrl) {
      console.warn(`[getSongUrl] resolve 无 URL (id=${id})`);
      return null;
    }

    // 试听片段：写入 song，供歌词时钟加 preview.start 偏移
    if (result.isPreview) {
      console.warn(
        `[getSongUrl] 试听流 id=${id} startMs=${result.previewStartMs ?? 0} durMs=${result.previewDurationMs ?? '?'}`
      );
      songData.isPreviewStream = true;
      songData.preview = {
        startMs: Number(result.previewStartMs) || songData.preview?.startMs || 0,
        durationMs: Number(result.previewDurationMs) || songData.preview?.durationMs || 0,
        vid: songData.preview?.vid
      };
    } else {
      songData.isPreviewStream = false;
    }

    // resolve 顺带的译文，给后续 loadLrc 合并
    if (result.lyricTranslations && Object.keys(result.lyricTranslations).length) {
      cacheLyricTranslations(id, result.lyricTranslations);
      console.log(
        `[getSongUrl] cached lyricTranslations id=${id} keys=${Object.keys(result.lyricTranslations).join(',')}`
      );
    }

    if (result.playMusicUrl.startsWith('local://') || isDownloaded) {
      return result.playMusicUrl;
    }
    return await resolveCachedPlaybackUrl(result.playMusicUrl, songData);
  } catch (error) {
    if ((error as Error).message === 'Request cancelled') throw error;
    console.error(`[getSongUrl] ly-music-source resolve 失败 (id=${id}):`, error);
    return null;
  }
};

/**
 * useSongUrl hook（兼容旧代码）
 */
export const useSongUrl = () => {
  return { getSongUrl };
};

/**
 * 使用新的yrcParser解析歌词（独立函数）
 */
const parseLyrics = (lyricsString: string): { lyrics: ILyricText[]; times: number[] } => {
  if (!lyricsString || typeof lyricsString !== 'string') {
    return { lyrics: [], times: [] };
  }

  try {
    const parseResult = parseYrcLyrics(lyricsString);

    if (!parseResult.success) {
      console.error('歌词解析失败:', parseResult.error.message);
      return { lyrics: [], times: [] };
    }

    const { lyrics: parsedLyrics } = parseResult.data;
    const lyrics: ILyricText[] = [];
    const times: number[] = [];

    for (const line of parsedLyrics) {
      // 作词/作曲等元信息不走逐字
      const credit =
        /^(作词|作曲|编曲|制作人|制作|混音|录音|出品|原唱|翻唱|演唱|监制|和声|by|composer|lyricist)[:：\s]/i.test(
          (line.fullText || '').trim()
        );
      const hasWords = !credit && !!(line.words && line.words.length > 0);

      lyrics.push({
        text: line.fullText,
        trText: '', // 翻译文本稍后处理
        words: hasWords ? (line.words as IWordData[]) : undefined,
        hasWordByWord: hasWords,
        startTime: line.startTime,
        duration: line.duration
      });

      // 时间数组使用秒为单位（与原有逻辑保持一致）
      times.push(line.startTime / 1000);
    }

    return { lyrics, times };
  } catch (error) {
    console.error('解析歌词时发生错误:', error);
    return { lyrics: [], times: [] };
  }
};

/**
 * 加载歌词（独立函数）
 */
export const loadLrc = async (id: string | number): Promise<ILyric> => {
  try {
    // 汽水 track id 常为 19 位雪花，超过 Number.MAX_SAFE_INTEGER。
    // 绝不能 parseInt 当缓存 key，否则多首歌撞同一错误 key、歌词/译文串台。
    const cacheKey = id != null && String(id).trim() !== '' ? String(id) : '';
    let lyricData: any;

    if (isElectron && cacheKey) {
      try {
        lyricData = await window.api.getCachedLyric(cacheKey);
      } catch (error) {
        console.warn('读取磁盘歌词缓存失败:', error);
      }
    }

    // 在线：ly-music-source（字级时间 + 译文）
    // ver5：译文对齐放宽；强制刷掉旧缓存（IPC 曾丢 translations）
    const needMsLyric = !lyricData?._playerLyric?.lrcArray?.length || lyricData?._msLyricVer !== 5;
    if (isElectron && needMsLyric) {
      try {
        const msLyric = await msGetLyric(String(id));
        if (msLyric?.lines?.length) {
          const converted = msLyricToILyric(msLyric);
          const lrcText = msLyric.raw || msLyricToLrc(msLyric.lines);
          const tLrc = pickMsTranslationLrc(msLyric.translations);
          const trCount = converted.lrcArray.filter((l) => l.trText).length;
          console.log(
            `[loadLrc] id=${id} lines=${converted.lrcArray.length} trLines=${trCount} tlyricLen=${tLrc.length} keys=${Object.keys(msLyric.translations || {}).join(',') || '-'}`
          );
          const payload = {
            lrc: { lyric: typeof lrcText === 'string' ? lrcText : msLyricToLrc(msLyric.lines) },
            tlyric: tLrc ? { lyric: tLrc } : undefined,
            _playerLyric: converted,
            _msLyricVer: 5
          };
          if (cacheKey) {
            void window.api
              .cacheLyric(cacheKey, payload)
              .catch((error) => console.warn('写入磁盘歌词缓存失败:', error));
          }
          lyricData = payload;
        }
      } catch (error) {
        console.warn('ly-music-source 歌词获取失败:', error);
      }
    }

    if (!lyricData) {
      return {
        lrcTimeArray: [],
        lrcArray: [],
        hasWordByWord: false
      };
    }

    const data = lyricData ?? {};

    // 已转换好的播放器歌词（含真实逐字 + 可能已贴 trText）
    if (data._playerLyric?.lrcArray?.length) {
      const converted = data._playerLyric as ILyric;
      let alreadyHasTr = converted.lrcArray.some((l) => l.trText);
      // resolve 后到的译文缓存（与 get-lyric 竞态时用）
      if (!alreadyHasTr) {
        const cachedTr = takeCachedLyricTranslations(id);
        const tFromCache = pickMsTranslationLrc(cachedTr);
        const tFromFile = data.tlyric?.lyric ? String(data.tlyric.lyric) : '';
        const tLrc = tFromCache || tFromFile;
        if (tLrc) {
          attachTranslationLrc(converted.lrcArray, converted.lrcTimeArray, tLrc);
          alreadyHasTr = converted.lrcArray.some((l) => l.trText);
          if (alreadyHasTr && cacheKey && isElectron) {
            void window.api
              .cacheLyric(cacheKey, {
                ...data,
                tlyric: { lyric: tLrc },
                _playerLyric: converted,
                _msLyricVer: 5
              })
              .catch(() => undefined);
          }
        }
      }
      return {
        lrcTimeArray: converted.lrcTimeArray,
        lrcArray: converted.lrcArray,
        hasWordByWord: !!converted.hasWordByWord
      };
    }

    const { lyrics, times } = parseLyrics(data?.yrc?.lyric || data?.lrc?.lyric);

    // 检查是否有逐字歌词
    let hasWordByWord = false;
    for (const lyric of lyrics) {
      if (lyric.hasWordByWord) {
        hasWordByWord = true;
        break;
      }
    }

    if (data.tlyric && data.tlyric.lyric) {
      const { lyrics: tLyrics } = parseLyrics(data.tlyric.lyric);

      // 按索引顺序一一对应翻译歌词
      if (tLyrics.length === lyrics.length) {
        // 数量相同，直接按索引对应
        lyrics.forEach((item, index) => {
          item.trText = item.text && tLyrics[index] ? tLyrics[index].text : '';
        });
      } else {
        // 数量不同，构建时间戳映射并尝试匹配
        const tLyricMap = new Map<number, string>();
        tLyrics.forEach((lyric) => {
          if (lyric.text && lyric.startTime !== undefined) {
            const timeInSeconds = lyric.startTime / 1000;
            tLyricMap.set(timeInSeconds, lyric.text);
          }
        });

        // 为每句歌词查找最接近的翻译
        lyrics.forEach((item, index) => {
          if (!item.text) {
            item.trText = '';
            return;
          }

          const currentTime = times[index];
          let closestTime = -1;
          let minDiff = 2.0; // 最大允许差异2秒

          // 查找最接近的时间戳
          for (const [tTime] of tLyricMap.entries()) {
            const diff = Math.abs(tTime - currentTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestTime = tTime;
            }
          }

          item.trText = closestTime !== -1 ? tLyricMap.get(closestTime) || '' : '';
        });
      }
    } else {
      // 没有翻译歌词，清空 trText
      lyrics.forEach((item) => {
        item.trText = '';
      });
    }

    return {
      lrcTimeArray: times,
      lrcArray: lyrics,
      hasWordByWord
    };
  } catch (err) {
    console.error('Error loading lyrics:', err);
    return {
      lrcTimeArray: [],
      lrcArray: [],
      hasWordByWord: false
    };
  }
};

/**
 * useLyrics hook（兼容旧代码）
 */
export const useLyrics = () => {
  return { loadLrc, parseLyrics };
};

/**
 * 获取歌曲详情（优化版 - 只获取URL，背景色在播放后异步获取）
 */
export const useSongDetail = () => {
  const getSongDetail = async (playMusic: SongResult, requestId?: string) => {
    // 验证请求
    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      console.log(`[getSongDetail] 请求已失效: ${requestId}`);
      throw new Error('Request cancelled');
    }

    if (playMusic.expiredAt && playMusic.expiredAt < Date.now()) {
      // 本地音乐（local:// 协议）不会过期，跳过清除
      if (!playMusic.playMusicUrl?.startsWith('local://')) {
        console.info(`歌曲已过期，重新获取: ${playMusic.name}`);
        playMusic.playMusicUrl = undefined;
      }
    }

    try {
      // 始终走 getSongUrl：内部会处理「有 URL 复用 / 试听缺 startMs 重拉」
      const playMusicUrl =
        (await getSongUrl(playMusic.id, playMusic, false, requestId)) || playMusic.playMusicUrl;
      restorePreviewStreamFlags(playMusic);

      // 验证请求
      if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
        console.log(`[getSongDetail] URL获取后请求已失效: ${requestId}`);
        throw new Error('Request cancelled');
      }

      playMusic.createdAt = Date.now();
      // 半小时后过期
      playMusic.expiredAt = playMusic.createdAt + 1800000;

      playMusic.playLoading = false;
      // 返回歌曲信息，背景色和歌词将在播放后异步加载
      return { ...playMusic, playMusicUrl } as SongResult;
    } catch (error) {
      if ((error as Error).message === 'Request cancelled') {
        throw error;
      }
      console.error('获取音频URL失败:', error);
      playMusic.playLoading = false;
      throw error;
    }
  };

  return { getSongDetail };
};
