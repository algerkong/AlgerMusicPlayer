import match from '@unblockneteasemusic/server';

type Platform = 'qq' | 'migu' | 'kugou' | 'pyncmd' | 'joox' | 'kuwo' | 'bilibili' | 'youtube';

interface SongData {
  name: string;
  artists: Array<{ name: string }>;
  album?: { name: string };
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

/**
 * 音乐解析函数
 * @param id 歌曲ID
 * @param songData 歌曲信息
 * @param retryCount 重试次数
 * @returns Promise<UnblockResult>
 */
const unblockMusic = async (
  id: number | string,
  songData: SongData,
  retryCount = 3
): Promise<UnblockResult> => {
  // 所有可用平台
  const platforms: Platform[] = ['migu', 'kugou', 'pyncmd', 'joox', 'kuwo', 'bilibili', 'youtube'];

  const retry = async (attempt: number): Promise<UnblockResult> => {
    try {
      const data = await match(parseInt(String(id), 10), platforms, songData);
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
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
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
