/**
 * 解析缓存（从旧 musicParser.ts 迁移，键语义升级为 provider 粒度）
 *
 * - URL 缓存：IndexedDB music_url_cache，30 分钟 TTL；缓存键包含参与音源
 *   集合，配置变化自动失效
 * - 失败缓存：内存 Map，1 分钟；键 `${songId}:${providerKey}`，单个 provider
 *   短时间内不重试（切歌场景避免重复等待同一坏源）
 */
import { cloneDeep } from 'lodash';

import { musicDB } from '@/hooks/MusicHook';

const { saveData, getData, deleteData } = musicDB;

export type CachedUrlEntry = {
  url: string;
  format?: string;
  br?: number;
  providerKey: string;
  providerName: string;
};

const CACHE_CONFIG = {
  MUSIC_URL_CACHE_TIME: 30 * 60 * 1000,
  FAILED_CACHE_TIME: 60 * 1000
};

const failedCacheMap = new Map<string, number>();

export const MusicResolveCache = {
  async getCachedMusicUrl(songId: number, sourceKeys?: string[]): Promise<CachedUrlEntry | null> {
    try {
      const cached = await getData('music_url_cache', songId);
      if (
        cached?.createTime &&
        Date.now() - cached.createTime < CACHE_CONFIG.MUSIC_URL_CACHE_TIME
      ) {
        const cachedKeys: string[] = cached.sourceKeys || [];
        const currentKeys = [...(sourceKeys || [])].sort();
        if (JSON.stringify([...cachedKeys].sort()) !== JSON.stringify(currentKeys)) {
          await deleteData('music_url_cache', songId);
          return null;
        }
        return cached.entry as CachedUrlEntry;
      }
      if (cached) {
        await deleteData('music_url_cache', songId);
      }
    } catch (error) {
      console.warn('获取解析缓存失败:', error);
    }
    return null;
  },

  async setCachedMusicUrl(
    songId: number,
    entry: CachedUrlEntry,
    sourceKeys?: string[]
  ): Promise<void> {
    try {
      await saveData('music_url_cache', {
        id: songId,
        entry: cloneDeep(entry),
        sourceKeys: cloneDeep(sourceKeys || []),
        createTime: Date.now()
      });
    } catch (error) {
      console.error('缓存解析结果失败:', error);
    }
  },

  isInFailedCache(songId: number, providerKey: string): boolean {
    const cachedTime = failedCacheMap.get(`${songId}:${providerKey}`);
    if (cachedTime && Date.now() - cachedTime < CACHE_CONFIG.FAILED_CACHE_TIME) {
      return true;
    }
    if (cachedTime) failedCacheMap.delete(`${songId}:${providerKey}`);
    return false;
  },

  addFailedCache(songId: number, providerKey: string): void {
    failedCacheMap.set(`${songId}:${providerKey}`, Date.now());
  },

  clearFailedCache(songId: number): void {
    const prefix = `${songId}:`;
    for (const key of failedCacheMap.keys()) {
      if (key.startsWith(prefix)) failedCacheMap.delete(key);
    }
  },

  async clearMusicCache(songId: number): Promise<void> {
    try {
      await deleteData('music_url_cache', songId);
    } catch (error) {
      console.error('清除解析缓存失败:', error);
    }
    this.clearFailedCache(songId);
  }
};
