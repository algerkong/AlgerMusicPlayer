import match from '@unblockneteasemusic/server';
import Store from 'electron-store';

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

interface CacheData extends UnblockResult {
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheData;
}

// 初始化缓存存储
const store = new Store<CacheStore>({
  name: 'unblock-cache'
});

// 缓存过期时间（24小时）
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * 检查缓存是否有效
 * @param cacheData 缓存数据
 * @returns boolean
 */
const isCacheValid = (cacheData: CacheData | null): boolean => {
  if (!cacheData) return false;
  const now = Date.now();
  return now - cacheData.timestamp < CACHE_EXPIRY;
};

/**
 * 从缓存中获取数据
 * @param id 歌曲ID
 * @returns CacheData | null
 */
const getFromCache = (id: string | number): CacheData | null => {
  const cacheData = store.get(String(id)) as CacheData | null;
  if (isCacheValid(cacheData)) {
    return cacheData;
  }
  // 清除过期缓存
  store.delete(String(id));
  return null;
};

/**
 * 将数据存入缓存
 * @param id 歌曲ID
 * @param data 解析结果
 */
const saveToCache = (id: string | number, data: UnblockResult): void => {
  const cacheData: CacheData = {
    ...data,
    timestamp: Date.now()
  };
  store.set(String(id), cacheData);
};

/**
 * 清理过期缓存
 */
const cleanExpiredCache = (): void => {
  const allData = store.store;
  Object.entries(allData).forEach(([id, data]) => {
    if (!isCacheValid(data)) {
      store.delete(id);
    }
  });
};

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
  // 检查缓存
  const cachedData = getFromCache(id);
  if (cachedData) {
    return cachedData;
  }

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

      // 保存到缓存
      saveToCache(id, result);
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

// 定期清理过期缓存（每小时执行一次）
setInterval(cleanExpiredCache, 60 * 60 * 1000);

export {
  cleanExpiredCache, // 导出清理缓存函数，以便手动调用
  type Platform,
  type ResponseData,
  type SongData,
  unblockMusic,
  type UnblockResult
};
