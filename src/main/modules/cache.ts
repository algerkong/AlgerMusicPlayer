import { ipcMain } from 'electron';
import Store from 'electron-store';

interface LyricData {
  id: number;
  data: any;
  timestamp: number;
}

interface StoreSchema {
  lyrics: Record<number, LyricData>;
}

class CacheManager {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'lyrics',
      defaults: {
        lyrics: {}
      }
    });
  }

  async cacheLyric(id: number, data: any) {
    try {
      const lyrics = this.store.get('lyrics');
      lyrics[id] = {
        id,
        data,
        timestamp: Date.now()
      };
      this.store.set('lyrics', lyrics);
      return true;
    } catch (error) {
      console.error('Error caching lyric:', error);
      return false;
    }
  }

  async getCachedLyric(id: number) {
    try {
      const lyrics = this.store.get('lyrics');
      const result = lyrics[id];

      if (!result) return undefined;

      // 检查缓存是否过期（24小时）
      if (Date.now() - result.timestamp > 24 * 60 * 60 * 1000) {
        delete lyrics[id];
        this.store.set('lyrics', lyrics);
        return undefined;
      }

      return result.data;
    } catch (error) {
      console.error('Error getting cached lyric:', error);
      return undefined;
    }
  }

  async clearLyricCache() {
    try {
      this.store.set('lyrics', {});
      return true;
    } catch (error) {
      console.error('Error clearing lyric cache:', error);
      return false;
    }
  }
}

export const cacheManager = new CacheManager();

export function initializeCacheManager() {
  // 添加歌词缓存相关的 IPC 处理
  ipcMain.handle('cache-lyric', async (_, id: number, lyricData: any) => {
    return await cacheManager.cacheLyric(id, lyricData);
  });

  ipcMain.handle('get-cached-lyric', async (_, id: number) => {
    return await cacheManager.getCachedLyric(id);
  });

  ipcMain.handle('clear-lyric-cache', async () => {
    return await cacheManager.clearLyricCache();
  });
}
