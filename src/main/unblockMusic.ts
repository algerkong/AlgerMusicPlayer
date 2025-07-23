import match from '@unblockneteasemusic/server';

type Platform = 'qq' | 'migu' | 'kugou' | 'pyncmd' | 'joox' | 'bilibili';

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
export const ALL_PLATFORMS: Platform[] = ['migu', 'kugou', 'pyncmd', 'bilibili'];

/**
 * 确保对象数据结构完整，处理null或undefined的情况
 * @param data 需要处理的数据对象
 */
function ensureDataStructure(data: any): any {
  // 如果数据本身为空，则返回一个基本结构
  if (!data) {
    return {
      name: '',
      artists: [],
      album: { name: '' }
    };
  }

  // 确保name字段存在
  if (data.name === undefined || data.name === null) {
    data.name = '';
  }

  // 确保artists字段存在且为数组
  if (!data.artists || !Array.isArray(data.artists)) {
    data.artists = data.ar && Array.isArray(data.ar) ? data.ar : [];
  }

  // 确保artists中的每个元素都有name属性
  if (data.artists.length > 0) {
    data.artists = data.artists.map((artist) => {
      return artist ? { name: artist.name || '' } : { name: '' };
    });
  }

  // 确保album对象存在并有name属性
  if (!data.album || typeof data.album !== 'object') {
    data.album = data.al && typeof data.al === 'object' ? data.al : { name: '' };
  }

  if (!data.album.name) {
    data.album.name = '';
  }

  return data;
}

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
    ? enabledPlatforms.filter((platform) => ALL_PLATFORMS.includes(platform))
    : ALL_PLATFORMS;

  // 处理歌曲数据，确保数据结构完整
  const processedSongData = ensureDataStructure(songData);

  const retry = async (attempt: number): Promise<UnblockResult> => {
    try {
      const data = await match(parseInt(String(id), 10), filteredPlatforms, processedSongData);
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
