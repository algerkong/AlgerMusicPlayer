import { cloneDeep } from 'lodash';
import { createDiscreteApi } from 'naive-ui';

import i18n from '@/../i18n/renderer';
import { getMusicLrc, getMusicUrl, getParsingMusicUrl } from '@/api/music';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import { SongSourceConfigManager } from '@/services/SongSourceConfigManager';
import type { ILyric, ILyricText, IWordData, SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';
import { parseLyrics as parseYrcLyrics } from '@/utils/yrcParser';

const { message } = createDiscreteApi(['message']);

/**
 * 获取歌曲播放URL（独立函数）
 */
export const getSongUrl = async (
  id: string | number,
  songData: SongResult,
  isDownloaded: boolean = false,
  requestId?: string
) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

  // 动态导入 settingsStore
  const { useSettingsStore } = await import('@/store/modules/settings');
  const settingsStore = useSettingsStore();

  try {
    // 在开始处理前验证请求
    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      console.log(`[getSongUrl] 请求已失效: ${requestId}`);
      throw new Error('Request cancelled');
    }

    if (songData.playMusicUrl) {
      return songData.playMusicUrl;
    }

    // ==================== 自定义API最优先 ====================
    const globalSources = settingsStore.setData.enabledMusicSources || [];
    const useCustomApiGlobally = globalSources.includes('custom');

    const songConfig = SongSourceConfigManager.getConfig(id);
    const useCustomApiForSong = songConfig?.sources.includes('custom' as any) ?? false;

    // 如果全局或歌曲专属设置中启用了自定义API，则最优先尝试
    if ((useCustomApiGlobally || useCustomApiForSong) && settingsStore.setData.customApiPlugin) {
      console.log(`优先级 1: 尝试使用自定义API解析歌曲 ${id}...`);
      try {
        const { parseFromCustomApi } = await import('@/api/parseFromCustomApi');
        const customResult = await parseFromCustomApi(
          numericId,
          cloneDeep(songData),
          settingsStore.setData.musicQuality || 'higher'
        );

        // 验证请求
        if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
          console.log(`[getSongUrl] 自定义API解析后请求已失效: ${requestId}`);
          throw new Error('Request cancelled');
        }

        if (
          customResult &&
          customResult.data &&
          customResult.data.data &&
          customResult.data.data.url
        ) {
          console.log('自定义API解析成功！');
          if (isDownloaded) return customResult.data.data as any;
          return customResult.data.data.url;
        } else {
          console.log('自定义API解析失败，将使用默认降级流程...');
          message.warning(i18n.global.t('player.reparse.customApiFailed'));
        }
      } catch (error) {
        console.error('调用自定义API时发生错误:', error);
        if ((error as Error).message === 'Request cancelled') {
          throw error;
        }
        message.error(i18n.global.t('player.reparse.customApiError'));
      }
    }

    // 如果有自定义音源设置，直接使用getParsingMusicUrl获取URL
    if (songConfig) {
      try {
        console.log(`使用自定义音源解析歌曲 ID: ${id}`);
        const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
        console.log('res', res);

        // 验证请求
        if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
          console.log(`[getSongUrl] 自定义音源解析后请求已失效: ${requestId}`);
          throw new Error('Request cancelled');
        }

        if (res && res.data && res.data.data && res.data.data.url) {
          return res.data.data.url;
        }
        console.warn('自定义音源解析失败，使用默认音源');
      } catch (error) {
        console.error('error', error);
        if ((error as Error).message === 'Request cancelled') {
          throw error;
        }
        console.error('自定义音源解析出错:', error);
      }
    }

    // 正常获取URL流程
    const { data } = await getMusicUrl(numericId, isDownloaded);

    // 验证请求
    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      console.log(`[getSongUrl] 获取官方URL后请求已失效: ${requestId}`);
      throw new Error('Request cancelled');
    }

    if (data && data.data && data.data[0]) {
      const songDetail = data.data[0];
      const hasNoUrl = !songDetail.url;
      const isTrial = !!songDetail.freeTrialInfo;

      if (hasNoUrl || isTrial) {
        console.log(`官方URL无效 (无URL: ${hasNoUrl}, 试听: ${isTrial})，进入内置备用解析...`);
        const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
        // 验证请求
        if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
          console.log(`[getSongUrl] 备用解析后请求已失效: ${requestId}`);
          throw new Error('Request cancelled');
        }
        if (isDownloaded) return res?.data?.data as any;
        return res?.data?.data?.url || null;
      }

      console.log('官方API解析成功！');
      if (isDownloaded) return songDetail as any;
      return songDetail.url;
    }

    console.log('官方API返回数据结构异常，进入内置备用解析...');
    const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
    // 验证请求
    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      console.log(`[getSongUrl] 备用解析后请求已失效: ${requestId}`);
      throw new Error('Request cancelled');
    }
    if (isDownloaded) return res?.data?.data as any;
    return res?.data?.data?.url || null;
  } catch (error) {
    if ((error as Error).message === 'Request cancelled') {
      throw error;
    }
    console.error('官方API请求失败，进入内置备用解析流程:', error);
    const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
    if (isDownloaded) return res?.data?.data as any;
    return res?.data?.data?.url || null;
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
      // 检查是否有逐字歌词
      const hasWords = line.words && line.words.length > 0;

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
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const { data } = await getMusicLrc(numericId);
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
 * 获取歌曲详情
 */
export const useSongDetail = () => {
  const { getSongUrl } = useSongUrl();

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
      const playMusicUrl =
        playMusic.playMusicUrl || (await getSongUrl(playMusic.id, playMusic, false, requestId));

      // 验证请求
      if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
        console.log(`[getSongDetail] URL获取后请求已失效: ${requestId}`);
        throw new Error('Request cancelled');
      }

      playMusic.createdAt = Date.now();
      // 半小时后过期
      playMusic.expiredAt = playMusic.createdAt + 1800000;
      const { backgroundColor, primaryColor } =
        playMusic.backgroundColor && playMusic.primaryColor
          ? playMusic
          : await getImageLinearBackground(getImgUrl(playMusic?.picUrl, '30y30'));

      // 验证请求
      if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
        console.log(`[getSongDetail] 背景色获取后请求已失效: ${requestId}`);
        throw new Error('Request cancelled');
      }

      playMusic.playLoading = false;
      return { ...playMusic, playMusicUrl, backgroundColor, primaryColor } as SongResult;
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
