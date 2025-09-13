import { cloneDeep } from 'lodash';

import { musicDB } from '@/hooks/MusicHook';
import { useSettingsStore } from '@/store';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import requestMusic from '@/utils/request_music';

import { searchAndGetBilibiliAudioUrl } from './bilibili';
import type { ParsedMusicResult } from './gdmusic';
import { parseFromGDMusic } from './gdmusic';
import { parseFromCustomApi } from './parseFromCustomApi';

const { saveData, getData, deleteData } = musicDB;

/**
 * 音乐解析结果接口
 */
export interface MusicParseResult {
  data: {
    code: number;
    message: string;
    data?: {
      url: string;
      [key: string]: any;
    };
  };
}

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  // 音乐URL缓存时间：30分钟
  MUSIC_URL_CACHE_TIME: 30 * 60 * 1000,
  // 失败缓存时间：5分钟
  FAILED_CACHE_TIME: 5 * 60 * 1000,
  // 重试配置
  MAX_RETRY_COUNT: 2,
  RETRY_DELAY: 1000
};

/**
 * 缓存管理器
 */
class CacheManager {
  /**
   * 获取缓存的音乐URL
   */
  static async getCachedMusicUrl(id: number): Promise<MusicParseResult | null> {
    try {
      const cached = await getData('music_url_cache', id);
      if (
        cached?.createTime &&
        Date.now() - cached.createTime < CACHE_CONFIG.MUSIC_URL_CACHE_TIME
      ) {
        console.log(`使用缓存的音乐URL: ${id}`);
        return cached.data;
      }
      // 清理过期缓存
      if (cached) {
        await deleteData('music_url_cache', id);
      }
    } catch (error) {
      console.warn('获取缓存失败:', error);
    }
    return null;
  }

  /**
   * 缓存音乐URL
   */
  static async setCachedMusicUrl(id: number, result: MusicParseResult): Promise<void> {
    try {
      await saveData('music_url_cache', {
        id,
        data: result,
        createTime: Date.now()
      });
      console.log(`缓存音乐URL成功: ${id}`);
    } catch (error) {
      console.error('缓存音乐URL失败:', error);
    }
  }

  /**
   * 检查是否在失败缓存期内
   */
  static async isInFailedCache(id: number, strategyName: string): Promise<boolean> {
    try {
      const cacheKey = `${id}_${strategyName}`;
      const cached = await getData('music_failed_cache', cacheKey);
      if (cached?.createTime && Date.now() - cached.createTime < CACHE_CONFIG.FAILED_CACHE_TIME) {
        console.log(`策略 ${strategyName} 在失败缓存期内，跳过`);
        return true;
      }
      // 清理过期缓存
      if (cached) {
        await deleteData('music_failed_cache', cacheKey);
      }
    } catch (error) {
      console.warn('检查失败缓存失败:', error);
    }
    return false;
  }

  /**
   * 添加失败缓存
   */
  static async addFailedCache(id: number, strategyName: string): Promise<void> {
    try {
      const cacheKey = `${id}_${strategyName}`;
      await saveData('music_failed_cache', {
        id: cacheKey,
        createTime: Date.now()
      });
      console.log(`添加失败缓存成功: ${strategyName}`);
    } catch (error) {
      console.error('添加失败缓存失败:', error);
    }
  }
}

/**
 * 重试工具
 */
class RetryHelper {
  /**
   * 带重试的异步执行
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = CACHE_CONFIG.MAX_RETRY_COUNT,
    delay = CACHE_CONFIG.RETRY_DELAY
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          console.log(`重试第 ${i + 1} 次，延迟 ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // 指数退避
        }
      }
    }

    throw lastError!;
  }
}

/**
 * 从Bilibili获取音频URL
 * @param data 歌曲数据
 * @returns 解析结果
 */
const getBilibiliAudio = async (data: SongResult) => {
  const songName = data?.name || '';
  const artistName =
    Array.isArray(data?.ar) && data.ar.length > 0 && data.ar[0]?.name ? data.ar[0].name : '';
  const albumName = data?.al && typeof data.al === 'object' && data.al?.name ? data.al.name : '';

  const searchQuery = [songName, artistName, albumName].filter(Boolean).join(' ').trim();
  console.log('开始搜索bilibili音频:', searchQuery);

  const url = await searchAndGetBilibiliAudioUrl(searchQuery);
  return {
    data: {
      code: 200,
      message: 'success',
      data: { url }
    }
  };
};

/**
 * 从GD音乐台获取音频URL
 * @param id 歌曲ID
 * @param data 歌曲数据
 * @returns 解析结果，失败时返回null
 */
const getGDMusicAudio = async (id: number, data: SongResult): Promise<ParsedMusicResult | null> => {
  try {
    const gdResult = await parseFromGDMusic(id, data, '999');
    if (gdResult) {
      return gdResult;
    }
  } catch (error) {
    console.error('GD音乐台解析失败:', error);
  }
  return null;
};

/**
 * 使用unblockMusic解析音频URL
 * @param id 歌曲ID
 * @param data 歌曲数据
 * @param sources 音源列表
 * @returns 解析结果
 */
const getUnblockMusicAudio = (id: number, data: SongResult, sources: any[]) => {
  const filteredSources = sources.filter((source) => source !== 'gdmusic');
  console.log(`使用unblockMusic解析，音源:`, filteredSources);
  return window.api.unblockMusic(id, cloneDeep(data), cloneDeep(filteredSources));
};

/**
 * 统一的解析结果适配器
 */
const adaptParseResult = (result: any): MusicParseResult | null => {
  if (!result) return null;

  // 如果已经是标准格式
  if (result.data?.code !== undefined && result.data?.message !== undefined) {
    return result;
  }

  // 适配GD音乐台的返回格式
  if (result.data?.data?.url) {
    return {
      data: {
        code: 200,
        message: 'success',
        data: {
          url: result.data.data.url,
          ...result.data.data
        }
      }
    };
  }

  // 适配其他格式
  if (result.url) {
    return {
      data: {
        code: 200,
        message: 'success',
        data: {
          url: result.url,
          ...result
        }
      }
    };
  }

  return null;
};

/**
 * 音源解析策略接口
 */
interface MusicSourceStrategy {
  name: string;
  priority: number;
  canHandle: (sources: string[], settingsStore?: any) => boolean;
  parse: (
    id: number,
    data: SongResult,
    quality?: string,
    sources?: string[]
  ) => Promise<MusicParseResult | null>;
}

/**
 * 自定义API解析策略
 */
class CustomApiStrategy implements MusicSourceStrategy {
  name = 'custom';
  priority = 1;

  canHandle(sources: string[], settingsStore?: any): boolean {
    return sources.includes('custom') && Boolean(settingsStore?.setData?.customApiPlugin);
  }

  async parse(id: number, data: SongResult, quality = 'higher'): Promise<MusicParseResult | null> {
    // 检查失败缓存
    if (await CacheManager.isInFailedCache(id, this.name)) {
      return null;
    }

    try {
      console.log('尝试使用自定义API解析...');
      const result = await RetryHelper.withRetry(async () => {
        return await parseFromCustomApi(id, data, quality);
      });

      const adaptedResult = adaptParseResult(result);
      if (adaptedResult?.data?.data?.url) {
        console.log('自定义API解析成功');
        return adaptedResult;
      }

      // 解析失败，添加失败缓存
      await CacheManager.addFailedCache(id, this.name);
      return null;
    } catch (error) {
      console.error('自定义API解析失败:', error);
      await CacheManager.addFailedCache(id, this.name);
      return null;
    }
  }
}

/**
 * Bilibili解析策略
 */
class BilibiliStrategy implements MusicSourceStrategy {
  name = 'bilibili';
  priority = 2;

  canHandle(sources: string[]): boolean {
    return sources.includes('bilibili');
  }

  async parse(id: number, data: SongResult): Promise<MusicParseResult | null> {
    // 检查失败缓存
    if (await CacheManager.isInFailedCache(id, this.name)) {
      return null;
    }

    try {
      console.log('尝试使用Bilibili解析...');
      const result = await RetryHelper.withRetry(async () => {
        return await getBilibiliAudio(data);
      });

      const adaptedResult = adaptParseResult(result);
      if (adaptedResult?.data?.data?.url) {
        console.log('Bilibili解析成功');
        return adaptedResult;
      }

      // 解析失败，添加失败缓存
      await CacheManager.addFailedCache(id, this.name);
      return null;
    } catch (error) {
      console.error('Bilibili解析失败:', error);
      await CacheManager.addFailedCache(id, this.name);
      return null;
    }
  }
}

/**
 * GD音乐台解析策略
 */
class GDMusicStrategy implements MusicSourceStrategy {
  name = 'gdmusic';
  priority = 3;

  canHandle(sources: string[]): boolean {
    return sources.includes('gdmusic');
  }

  async parse(id: number, data: SongResult): Promise<MusicParseResult | null> {
    // 检查失败缓存
    if (await CacheManager.isInFailedCache(id, this.name)) {
      return null;
    }

    try {
      console.log('尝试使用GD音乐台解析...');
      const result = await RetryHelper.withRetry(async () => {
        return await getGDMusicAudio(id, data);
      });

      const adaptedResult = adaptParseResult(result);
      if (adaptedResult?.data?.data?.url) {
        console.log('GD音乐台解析成功');
        return adaptedResult;
      }

      // 解析失败，添加失败缓存
      await CacheManager.addFailedCache(id, this.name);
      return null;
    } catch (error) {
      console.error('GD音乐台解析失败:', error);
      await CacheManager.addFailedCache(id, this.name);
      return null;
    }
  }
}

/**
 * UnblockMusic解析策略
 */
class UnblockMusicStrategy implements MusicSourceStrategy {
  name = 'unblockMusic';
  priority = 4;

  canHandle(sources: string[]): boolean {
    const unblockSources = sources.filter(
      (source) => !['custom', 'bilibili', 'gdmusic'].includes(source)
    );
    return unblockSources.length > 0;
  }

  async parse(
    id: number,
    data: SongResult,
    _quality?: string,
    sources?: string[]
  ): Promise<MusicParseResult | null> {
    // 检查失败缓存
    if (await CacheManager.isInFailedCache(id, this.name)) {
      return null;
    }

    try {
      const unblockSources = (sources || []).filter(
        (source) => !['custom', 'bilibili', 'gdmusic'].includes(source)
      );
      console.log('尝试使用UnblockMusic解析:', unblockSources);

      const result = await RetryHelper.withRetry(async () => {
        return await getUnblockMusicAudio(id, data, unblockSources);
      });

      const adaptedResult = adaptParseResult(result);
      if (adaptedResult?.data?.data?.url) {
        console.log('UnblockMusic解析成功');
        return adaptedResult;
      }

      // 解析失败，添加失败缓存
      await CacheManager.addFailedCache(id, this.name);
      return null;
    } catch (error) {
      console.error('UnblockMusic解析失败:', error);
      await CacheManager.addFailedCache(id, this.name);
      return null;
    }
  }
}

/**
 * 音源策略工厂
 */
class MusicSourceStrategyFactory {
  private static strategies: MusicSourceStrategy[] = [
    new CustomApiStrategy(),
    new BilibiliStrategy(),
    new GDMusicStrategy(),
    new UnblockMusicStrategy()
  ];

  /**
   * 获取可用的解析策略
   * @param sources 音源列表
   * @param settingsStore 设置存储
   * @returns 排序后的可用策略列表
   */
  static getAvailableStrategies(sources: string[], settingsStore?: any): MusicSourceStrategy[] {
    return this.strategies
      .filter((strategy) => strategy.canHandle(sources, settingsStore))
      .sort((a, b) => a.priority - b.priority);
  }
}

/**
 * 获取音源配置
 * @param id 歌曲ID
 * @param settingsStore 设置存储
 * @returns 音源列表和音质设置
 */
const getMusicConfig = (id: number, settingsStore?: any) => {
  const songId = String(id);
  let musicSources: string[] = [];
  let quality = 'higher';

  try {
    // 尝试获取歌曲自定义音源
    const savedSourceStr = localStorage.getItem(`song_source_${songId}`);
    if (savedSourceStr) {
      try {
        const customSources = JSON.parse(savedSourceStr);
        if (Array.isArray(customSources)) {
          musicSources = customSources;
          console.log(`使用歌曲 ${id} 自定义音源:`, musicSources);
        }
      } catch (error) {
        console.error('解析自定义音源设置失败:', error);
      }
    }

    // 如果没有自定义音源，使用全局设置
    if (musicSources.length === 0) {
      musicSources = settingsStore?.setData?.enabledMusicSources || [];
      console.log('使用全局音源设置:', musicSources);
    }

    quality = settingsStore?.setData?.musicQuality || 'higher';
  } catch (error) {
    console.error('读取音源配置失败，使用默认配置:', error);
    musicSources = [];
    quality = 'higher';
  }

  return { musicSources, quality };
};

/**
 * 音乐解析器主类
 */
export class MusicParser {
  /**
   * 解析音乐URL
   * @param id 歌曲ID
   * @param data 歌曲数据
   * @returns 解析结果
   */
  static async parseMusic(id: number, data: SongResult): Promise<MusicParseResult> {
    const startTime = performance.now();

    try {
      // 非Electron环境直接使用API请求
      if (!isElectron) {
        console.log('非Electron环境，使用API请求');
        return await requestMusic.get<any>('/music', { params: { id } });
      }

      // 检查缓存
      console.log(`检查歌曲 ${id} 的缓存...`);
      const cachedResult = await CacheManager.getCachedMusicUrl(id);
      if (cachedResult) {
        const endTime = performance.now();
        console.log(`✅ 命中缓存，歌曲 ${id}，耗时: ${(endTime - startTime).toFixed(2)}ms`);
        return cachedResult;
      }
      console.log(`❌ 未命中缓存，歌曲 ${id}，开始解析...`);

      // 获取设置存储
      let settingsStore: any;
      try {
        settingsStore = useSettingsStore();
      } catch (error) {
        console.error('无法获取设置存储，使用后备方案:', error);
        return await requestMusic.get<any>('/music', { params: { id } });
      }

      // 检查音乐解析功能是否启用
      if (!settingsStore?.setData?.enableMusicUnblock) {
        console.log('音乐解析功能已禁用');
        return {
          data: {
            code: 404,
            message: '音乐解析功能已禁用',
            data: undefined
          }
        };
      }

      // 获取音源配置
      const { musicSources, quality } = getMusicConfig(id, settingsStore);

      if (musicSources.length === 0) {
        console.warn('没有配置可用的音源，使用后备方案');
        return await requestMusic.get<any>('/music', { params: { id } });
      }

      // 获取可用的解析策略
      const availableStrategies = MusicSourceStrategyFactory.getAvailableStrategies(
        musicSources,
        settingsStore
      );

      if (availableStrategies.length === 0) {
        console.warn('没有可用的解析策略，使用后备方案');
        return await requestMusic.get<any>('/music', { params: { id } });
      }

      console.log(
        `开始解析歌曲 ${id}，可用策略:`,
        availableStrategies.map((s) => s.name)
      );

      // 按优先级依次尝试解析策略
      for (const strategy of availableStrategies) {
        try {
          const result = await strategy.parse(id, data, quality, musicSources);
          if (result?.data?.data?.url) {
            const endTime = performance.now();
            console.log(
              `解析成功，使用策略: ${strategy.name}，耗时: ${(endTime - startTime).toFixed(2)}ms`
            );

            // 缓存成功结果
            await CacheManager.setCachedMusicUrl(id, result);

            return result;
          }
          console.log(`策略 ${strategy.name} 解析失败，继续尝试下一个策略`);
        } catch (error) {
          console.error(`策略 ${strategy.name} 解析异常:`, error);
          // 继续尝试下一个策略
        }
      }

      console.warn('所有解析策略都失败了，使用后备方案');
    } catch (error) {
      console.error('MusicParser.parseMusic 执行异常，使用后备方案:', error);
    }

    // 后备方案：使用API请求
    try {
      console.log('使用后备方案：API请求');
      const result = await requestMusic.get<any>('/music', { params: { id } });

      // 如果后备方案成功，也进行缓存
      if (result?.data?.data?.url) {
        console.log('后备方案成功，缓存结果');
        await CacheManager.setCachedMusicUrl(id, result);
      }

      return result;
    } catch (apiError) {
      console.error('API请求也失败了:', apiError);
      const endTime = performance.now();
      console.log(`总耗时: ${(endTime - startTime).toFixed(2)}ms`);
      return {
        data: {
          code: 500,
          message: '所有解析方式都失败了',
          data: undefined
        }
      };
    }
  }
}
