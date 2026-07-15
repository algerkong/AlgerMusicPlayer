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
import { audioService } from '@/services/audioService';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import { usePlayerCoreStore } from '@/store/modules/playerCore';
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

/** 音质 key 归一 */
export const normalizeQualityKey = (q?: string) => {
  const s = String(q || '')
    .toLowerCase()
    .trim();
  if (s === 'standard' || s === '128') return 'medium';
  if (s === 'exhigh' || s === '320') return 'higher';
  if (s === 'hires' || s === 'hi-res') return 'hi_res';
  if (s === 'atmos') return 'spatial';
  if (s.includes('flac') && !s.includes('hi')) return 'lossless';
  return s;
};

const qualityRank = (q?: string) => {
  const k = normalizeQualityKey(q);
  if (k === 'lossless') return 100;
  if (k === 'hi_res') return 95;
  if (k === 'spatial') return 90;
  if (k === 'highest') return 85;
  if (k === 'higher') return 80;
  if (k === 'medium') return 40;
  return 20;
};

/** 本曲已有可用档时，把偏好压到「本曲实际有的最高且不超过偏好」 */
export const clampQualityToAvailable = (wanted: string, available?: string[]) => {
  const want = normalizeQualityKey(wanted) || 'higher';
  if (!available?.length) return want;
  const avail = available.map(normalizeQualityKey).filter(Boolean);
  if (avail.includes(want)) return want;
  const wantR = qualityRank(want);
  const below = avail
    .filter((k) => qualityRank(k) <= wantR)
    .sort((a, b) => qualityRank(b) - qualityRank(a));
  if (below[0]) return below[0];
  return [...avail].sort((a, b) => qualityRank(b) - qualityRank(a))[0] || want;
};

const HI_TIERS = new Set(['lossless', 'hi_res', 'spatial']);

/**
 * 当前流是否已达到「全局偏好 ∩ 本曲可用」目标。
 * 预取用 higher/highest 起播后，快路径必须据此拒绝复用，否则有无损也一直卡在较高。
 */
export const streamMatchesPreference = (song?: SongResult | null): boolean => {
  if (!song?.playMusicUrl) return false;
  const pref = normalizeQualityKey(
    (song as SongResult).preferredQuality || getSetData()?.musicQuality || 'higher'
  );
  const target = clampQualityToAvailable(pref, song.availableQualities);
  const stream = normalizeQualityKey(song.streamQuality);
  if (!stream) return false;
  return stream === target;
};

/**
 * 磁盘缓存解析：首播关键路径上不能干等 IPC。
 * - 短超时内命中 local 缓存 → 用缓存
 * - 超时/未命中 → 立刻用远端 URL 出声，后台继续写缓存
 */
const resolveCachedPlaybackUrl = async (
  url: string | null | undefined,
  songData: SongResult
): Promise<string | null | undefined> => {
  if (!url || !isElectron || !/^https?:\/\//i.test(url)) {
    return url;
  }

  const payload = {
    songId: Number(songData.id),
    source: songData.source,
    url,
    title: songData.name,
    artist: getSongArtistText(songData)
  };

  const cacheWork = window.api
    .resolveCachedMusicUrl(payload)
    .then((result) => result as DiskCacheResolveResult)
    .catch((error) => {
      console.warn('解析缓存播放地址失败，回退到在线地址:', error);
      return null;
    });

  const timeoutMs = 120;
  try {
    const raced = await Promise.race([
      cacheWork,
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
    if (raced?.url) return raced.url;
  } catch {
    /* fallthrough */
  }

  // 后台继续：命中后下次同曲走 local://，本次不挡出声
  void cacheWork.then((result) => {
    if (result?.url && result.url !== url) {
      console.info('[getSongUrl] cache ready later, next play may use local', songData.id);
    }
  });

  return url;
};

/**
 * 解析并返回可播放的歌曲 URL。
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

  // 切音质 / 后台升质：强制丢弃旧 URL（先记下 force，后面选档还要用）
  const forceResolve = !!songData.forceQualityResolve;
  if (forceResolve) {
    const url = String(songData.playMusicUrl || '');
    const isUserLocalFile =
      url.startsWith('local://') && !url.includes('ly-music-cache') && songData.source === 'local';
    console.info(`[getSongUrl] forceQualityResolve id=${id} userLocal=${isUserLocalFile}`);
    if (!isUserLocalFile) {
      songData.playMusicUrl = undefined;
      songData.streamQuality = undefined;
    }
    songData.forceQualityResolve = false;
  }

  if (songData.playMusicUrl) {
    // 复用缓存 URL 时也要恢复试听标记（否则切回第一首 isPreviewStream 丢失 → 歌词错位）
    restorePreviewStreamFlags(songData);
    // 偏好音质与当前流不一致 → 必须重取（切换音质）
    // 先按本曲 availableQualities 钳制全局偏好，避免「全局无损 + 本曲仅较高」被当成 mismatch 死循环
    const prefQ = clampQualityToAvailable(
      songData.preferredQuality || getSetData()?.musicQuality || 'higher',
      songData.availableQualities
    );
    const streamQ = normalizeQualityKey(songData.streamQuality);
    const qualityMismatch =
      !!streamQ && !!prefQ && streamQ !== prefQ && !songData.playMusicUrl.startsWith('local://');
    // 有试听文件路径却丢了 startMs：必须重 resolve，否则歌词 base=0
    const needPreviewMeta =
      (songData.isPreviewStream || isPreviewStreamUrl(songData.playMusicUrl)) &&
      !(Number(songData.preview?.startMs) > 0);
    // local:// 在线缓存：若 URL 里不带当前音质标记，也重取
    const localQualityStale =
      songData.playMusicUrl.startsWith('local://') &&
      !!prefQ &&
      !songData.playMusicUrl.includes(`.${prefQ}.`) &&
      // 真正的用户本地文件（非 ly-music-cache）不重取
      songData.playMusicUrl.includes('ly-music-cache');

    if (!needPreviewMeta && !qualityMismatch && !localQualityStale) {
      // 热更/持久化丢 availableQualities 时：至少塞免费三档 + 当前流档，避免菜单空
      if (!songData.availableQualities?.length) {
        const fallback = new Set(['medium', 'higher', 'highest']);
        if (streamQ) fallback.add(streamQ);
        songData.availableQualities = [...fallback];
      }
      if (isDownloaded) return songData.playMusicUrl;
      if (songData.playMusicUrl.startsWith('local://') && !localQualityStale) {
        return songData.playMusicUrl;
      }
      if (!localQualityStale) {
        return await resolveCachedPlaybackUrl(songData.playMusicUrl, songData);
      }
    }
    if (qualityMismatch || localQualityStale) {
      console.info(
        `[getSongUrl] 音质需重取 stream=${streamQ || '-'} pref=${prefQ} localStale=${localQualityStale} id=${id}`
      );
    } else {
      console.warn(`[getSongUrl] 试听 URL 缺少 startMs，重新 resolve id=${id}`);
    }
    songData.playMusicUrl = undefined;
  }

  if (!isElectron) {
    console.warn(`[getSongUrl] 非 Electron 环境无法在线取链 (id=${id})`);
    return null;
  }

  try {
    const setData = getSetData();
    // 全局偏好 ∩ 本曲可用 = 目标档；force 时用 preferredQuality
    const rawPref = songData.preferredQuality || setData?.musicQuality || 'higher';
    const globalPref = normalizeQualityKey(String(rawPref)) || 'higher';
    const availKnown =
      Array.isArray(songData.availableQualities) && songData.availableQualities.length > 0;
    let quality: string;
    let upgradeTo: string | undefined;

    if (forceResolve) {
      // 用户点选 / 后台升质：直接打目标档
      quality = clampQualityToAvailable(globalPref, songData.availableQualities);
    } else if (availKnown) {
      // 已知本曲能力：直接 resolve 正确目标（有无损→无损；无→极高/较高…）
      quality = clampQualityToAvailable(globalPref, songData.availableQualities);
    } else if (HI_TIERS.has(globalPref)) {
      // 未知能力且偏好会员档：先极高出声，返回 available 后再决定是否升无损
      quality = 'highest';
      upgradeTo = globalPref;
      console.info(`[getSongUrl] boot quality=highest, maybe upgrade→${upgradeTo}`);
    } else {
      quality = globalPref;
    }
    songData.preferredQuality = undefined;
    (songData as SongResult & { _streamUpgradeTo?: string })._streamUpgradeTo = upgradeTo;
    // 会员档传给库；优先同步读 pinia，避免首播多等一轮动态 import
    let vipLevel = 'none';
    try {
      // 运行时 pinia 已 active 时直接用；失败再懒加载
       
      const mod = (await import('@/store/modules/user')) as {
        useUserStore: () => { vipLevel?: string };
      };
      vipLevel = mod.useUserStore().vipLevel || 'none';
    } catch {
      /* pinia 未就绪 */
    }
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

    console.info(
      `[getSongUrl] resolve id=${id} quality=${quality} (pref=${rawPref}) vip=${vipLevel}`
    );
    const result = await msResolve({
      ids,
      title: songData.name,
      artists,
      durationMs: songData.dt || songData.duration,
      quality,
      vipLevel
    });

    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      throw new Error('Request cancelled');
    }

    if (!result.playMusicUrl) {
      console.warn(`[getSongUrl] resolve 无 URL (id=${id})`);
      return null;
    }

    // 本曲可用档 + 实际流档，供播放条按曲展示
    if (Array.isArray(result.availableQualities)) {
      songData.availableQualities = result.availableQualities.map(String);
    }
    // 以真实取到的流档为准；effective 仅作候选
    // 禁止把「全局无损偏好」写进 streamQuality（本曲可能只有标准/较高/极高）
    const actualQ = normalizeQualityKey(result.quality);
    const effectiveQ = normalizeQualityKey(result.effectiveQuality);
    const availNow = (songData.availableQualities || []).map(normalizeQualityKey);
    if (actualQ && (!availNow.length || availNow.includes(actualQ))) {
      songData.streamQuality = actualQ;
    } else if (effectiveQ) {
      songData.streamQuality = clampQualityToAvailable(effectiveQ, songData.availableQualities);
    } else {
      songData.streamQuality = clampQualityToAvailable(quality, songData.availableQualities);
    }
    // 若 API 未给 availableQualities：只暴露免费三档，避免把全局/误报的无损塞进菜单
    if (!songData.availableQualities?.length) {
      songData.availableQualities = ['medium', 'higher', 'highest'];
      songData.streamQuality = clampQualityToAvailable(
        songData.streamQuality || quality,
        songData.availableQualities
      );
    }
    if (result.bitrate) songData.streamBitrate = Number(result.bitrate);

    // 纠正升质目标：全局偏好 ∩ 真实 available；已达目标则不再升
    {
      const pref = normalizeQualityKey(getSetData()?.musicQuality || 'higher') || 'higher';
      const target = clampQualityToAvailable(pref, songData.availableQualities);
      const stream = normalizeQualityKey(songData.streamQuality);
      if (stream === target) {
        (songData as SongResult & { _streamUpgradeTo?: string })._streamUpgradeTo = undefined;
      } else if (qualityRank(target) > qualityRank(stream)) {
        (songData as SongResult & { _streamUpgradeTo?: string })._streamUpgradeTo = target;
        console.info(`[getSongUrl] schedule upgrade stream=${stream} → target=${target} id=${id}`);
      } else {
        (songData as SongResult & { _streamUpgradeTo?: string })._streamUpgradeTo = undefined;
      }
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
 * 网络 resolve 在途去重：prefetch / playTrack / 列表预热 共享同一 Promise，
 * 禁止同曲同音质双打 msResolve（大厂 P0：点击时 URL 往往已在飞或已在手）。
 */
const detailInflight = new Map<string, Promise<SongResult>>();

/**
 * 预热 standby：只给「下一首候选」，禁止当前正在 playTrack 的曲占槽。
 * resolve 当前曲时若 warm，会冲掉已预热的 next（日志里 standby 被当前 id 覆盖）。
 */
const warmAudioByUrl = (url?: string | null, song?: SongResult) => {
  if (!url) return;
  if (url.startsWith('local://') && !url.includes('ly-music-cache')) return;
  if (!song?.id) return;
  try {
    const playing = audioService.getCurrentTrack();
    if (playing && String(playing.id) === String(song.id)) {
      return;
    }
    // playMusic 已切到本曲但 audio 尚未换（resolve 中）也不要占 standby
    try {
      const core = usePlayerCoreStore();
      if (core?.playMusic?.id != null && String(core.playMusic.id) === String(song.id)) {
        return;
      }
    } catch {
      /* pinia 未就绪则仅靠 getCurrentTrack */
    }
    audioService.preload(url, song);
  } catch {
    /* ignore */
  }
};

export const isSongUrlFresh = (song?: SongResult | null): boolean => {
  if (!song?.playMusicUrl) return false;
  if (song.forceQualityResolve) return false;
  if (song.expiredAt != null && song.expiredAt < Date.now()) {
    // local 用户文件不过期
    if (!song.playMusicUrl.startsWith('local://')) return false;
  }
  return true;
};

/** URL 未过期且音质已对齐全局偏好，才允许 playTrack 跳过 resolve */
export const canReuseSongUrl = (song?: SongResult | null): boolean => {
  return isSongUrlFresh(song) && streamMatchesPreference(song);
};

const detailKeyOf = (song: SongResult): string => {
  const pref = String(song.preferredQuality || getSetData()?.musicQuality || 'higher');
  const force = song.forceQualityResolve ? '1' : '0';
  return `${String(song.id)}|${song.source || 'qishui'}|${pref}|${force}`;
};

/**
 * 实际取链（无 inflight）。requestId 仅用于调用方取消检测时由外层处理；
 * 共享 inflight 路径不传 requestId，避免 A 取消拖死 B。
 */
const resolveSongDetail = async (playMusic: SongResult): Promise<SongResult> => {
  if (playMusic.expiredAt && playMusic.expiredAt < Date.now()) {
    if (!playMusic.playMusicUrl?.startsWith('local://')) {
      console.info(`歌曲已过期，重新获取: ${playMusic.name}`);
      playMusic.playMusicUrl = undefined;
    }
  }

  try {
    const playMusicUrl =
      (await getSongUrl(playMusic.id, playMusic, false)) || playMusic.playMusicUrl;
    restorePreviewStreamFlags(playMusic);

    playMusic.createdAt = Date.now();
    playMusic.expiredAt = playMusic.createdAt + 1800000;

    // 不在 resolve 里 warm standby：当前曲 resolve 会冲掉 next 预热。
    // standby 仅由 prefetchSongUrl / playlist 下一首 / triggerPreload 写入。
    return { ...playMusic, playMusicUrl } as SongResult;
  } catch (error) {
    console.error('获取音频URL失败:', error);
    playMusic.playLoading = false;
    throw error;
  }
};

/**
 * 获取歌曲详情（只解析 URL；歌词/取色另并行）。
 * 同 key 并发调用会 join 同一 Promise。
 */
export const getSongDetail = async (
  playMusic: SongResult,
  requestId?: string
): Promise<SongResult> => {
  if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
    console.log(`[getSongDetail] 请求已失效: ${requestId}`);
    throw new Error('Request cancelled');
  }

  // 已有新鲜 URL：不占 inflight，快路径直接返回（仍走 getSongUrl 做 quality/试听校验）
  if (isSongUrlFresh(playMusic) && !playMusic.forceQualityResolve) {
    const fast = await resolveSongDetail({ ...playMusic });
    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      throw new Error('Request cancelled');
    }
    return fast;
  }

  const key = detailKeyOf(playMusic);
  let p = detailInflight.get(key);
  if (!p) {
    // seed 副本：避免并发调用互相改同一对象
    const seed = { ...playMusic, forceQualityResolve: playMusic.forceQualityResolve };
    p = resolveSongDetail(seed).finally(() => {
      if (detailInflight.get(key) === p) detailInflight.delete(key);
    });
    detailInflight.set(key, p);
    console.info(`[getSongDetail] start inflight ${key}`);
  } else {
    console.info(`[getSongDetail] join inflight ${key}`);
  }

  const detailed = await p;
  if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
    console.log(`[getSongDetail] URL获取后请求已失效: ${requestId}`);
    throw new Error('Request cancelled');
  }

  // 合并到调用方视角的字段（保留调用方 lyric/封面等 + 升质标记）
  return {
    ...playMusic,
    playMusicUrl: detailed.playMusicUrl,
    streamQuality: detailed.streamQuality,
    streamBitrate: detailed.streamBitrate,
    availableQualities: detailed.availableQualities || playMusic.availableQualities,
    expiredAt: detailed.expiredAt,
    createdAt: detailed.createdAt,
    isPreviewStream: detailed.isPreviewStream,
    preview: detailed.preview || playMusic.preview,
    forceQualityResolve: false,
    _streamUpgradeTo: (detailed as SongResult & { _streamUpgradeTo?: string })._streamUpgradeTo
  } as SongResult;
};

/**
 * 预取 URL（不阻塞播放）：feed/列表在可见时调用，play 时命中 inflight 或缓存。
 */
export const prefetchSongUrl = (song: SongResult): Promise<SongResult | null> => {
  if (!song?.id) return Promise.resolve(null);
  if (isSongUrlFresh(song)) {
    if (song.playMusicUrl) warmAudioByUrl(song.playMusicUrl, song);
    return Promise.resolve(song);
  }
  return getSongDetail({ ...song })
    .then((d) => {
      if (d?.playMusicUrl) warmAudioByUrl(d.playMusicUrl, d);
      return d;
    })
    .catch((e) => {
      console.warn('[prefetchSongUrl] failed', song.name, e);
      return null;
    });
};

export const useSongDetail = () => {
  return { getSongDetail };
};
