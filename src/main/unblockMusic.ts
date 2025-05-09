import match from '@unblockneteasemusic/server';

type Platform = 'qq' | 'migu' | 'kugou' | 'pyncmd' | 'joox' | 'kuwo' | 'bilibili';

interface SongData {
  name: string;
  artists: Array<{ name: string }>;
  album?: { name: string };
  ar?: Array<{ name: string }>;
  al?: { name: string };
}

interface ResponseData {
  url: string;
  br: number;
  size: number;
  md5?: string;
  platform?: Platform;
  gain?: number;
}

interface UnblockResult {
  data: {
    data: ResponseData;
    params: {
      id: number;
      type: 'song';
    };
  };
}

// 所有可用平台
export const ALL_PLATFORMS: Platform[] = ['migu', 'kugou', 'pyncmd', 'kuwo', 'bilibili'];

/**
 * 音乐解析函数
 * @param id 歌曲ID
 * @param songData 歌曲信息
 * @param retryCount 重试次数
 * @param enabledPlatforms 启用的平台列表，默认为所有平台
 * @returns Promise<UnblockResult>
 */
const unblockMusic = async (
  id: number | string,
  songData: SongData,
  retryCount = 1,
  enabledPlatforms?: Platform[]
): Promise<UnblockResult> => {
  // 过滤 enabledPlatforms，确保只包含 ALL_PLATFORMS 中存在的平台
  const filteredPlatforms = enabledPlatforms 
    ? enabledPlatforms.filter(platform => ALL_PLATFORMS.includes(platform))
    : ALL_PLATFORMS;
  
  songData.album = songData.album || songData.al;
  songData.artists = songData.artists || songData.ar;
  const retry = async (attempt: number): Promise<UnblockResult> => {
    try {
      const data = await match(parseInt(String(id), 10), filteredPlatforms, songData);
      const result: UnblockResult = {
        data: {
          data,
          params: {
            id: parseInt(String(id), 10),
            type: 'song'
          }
        }
      };
      return result;
    } catch (err) {
      if (attempt < retryCount) {
        // 延迟重试，每次重试增加延迟时间
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        return retry(attempt + 1);
      }

      // 所有重试都失败后，抛出详细错误
      throw new Error(
        `音乐解析失败 (ID: ${id}): ${err instanceof Error ? err.message : '未知错误'}`
      );
    }
  };

  return retry(1);
};

export { type Platform, type ResponseData, type SongData, unblockMusic, type UnblockResult };
