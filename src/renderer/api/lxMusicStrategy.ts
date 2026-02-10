/**
 * 落雪音乐 (LX Music) 音源解析策略
 *
 * 实现 MusicSourceStrategy 接口，作为落雪音源的解析入口
 */

import { getLxMusicRunner, initLxMusicRunner } from '@/services/LxMusicSourceRunner';
import { useSettingsStore } from '@/store';
import type { LxMusicInfo, LxQuality, LxSourceKey } from '@/types/lxMusic';
import { LX_SOURCE_NAMES, QUALITY_TO_LX } from '@/types/lxMusic';
import type { SongResult } from '@/types/music';

import type { MusicParseResult } from './musicParser';
import { CacheManager } from './musicParser';

/**
 * 解析可能是 API 端点的 URL，获取真实音频 URL
 * 一些音源脚本返回的是 API 端点，需要额外请求才能获取真实音频 URL
 */
const resolveAudioUrl = async (url: string): Promise<string> => {
  try {
    // 检查是否看起来像 API 端点（包含 /api/ 且有查询参数）
    const isApiEndpoint = url.includes('/api/') || (url.includes('?') && url.includes('type=url'));

    if (!isApiEndpoint) {
      // 看起来像直接的音频 URL，直接返回
      return url;
    }

    console.log('[LxMusicStrategy] 检测到 API 端点，尝试解析真实 URL:', url);

    // 尝试获取真实 URL
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual' // 不自动跟随重定向
    });

    // 检查是否是重定向
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        console.log('[LxMusicStrategy] API 返回重定向 URL:', location);
        return location;
      }
    }

    // 如果 HEAD 请求没有重定向，尝试 GET 请求
    const getResponse = await fetch(url, {
      redirect: 'follow'
    });

    // 检查 Content-Type
    const contentType = getResponse.headers.get('Content-Type') || '';

    // 如果是音频类型，返回最终 URL
    if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
      console.log('[LxMusicStrategy] 解析到音频 URL:', getResponse.url);
      return getResponse.url;
    }

    // 如果是 JSON，尝试解析
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      const json = await getResponse.json();
      console.log('[LxMusicStrategy] API 返回 JSON:', json);

      // 尝试从 JSON 中提取 URL（常见字段）
      const audioUrl = json.url || json.data?.url || json.audio_url || json.link || json.src;
      if (audioUrl && typeof audioUrl === 'string') {
        console.log('[LxMusicStrategy] 从 JSON 中提取音频 URL:', audioUrl);
        return audioUrl;
      }
    }

    // 如果都不是，返回原始 URL（可能直接可用）
    console.warn('[LxMusicStrategy] 无法解析 API 端点，返回原始 URL');
    return url;
  } catch (error) {
    console.error('[LxMusicStrategy] URL 解析失败:', error);
    // 解析失败时返回原始 URL
    return url;
  }
};

/**
 * 将 SongResult 转换为 LxMusicInfo 格式
 */
const convertToLxMusicInfo = (songResult: SongResult): LxMusicInfo => {
  const artistName =
    songResult.ar && songResult.ar.length > 0
      ? songResult.ar.map((a) => a.name).join('、')
      : songResult.artists && songResult.artists.length > 0
        ? songResult.artists.map((a) => a.name).join('、')
        : '';

  const albumName = songResult.al?.name || (songResult.album as any)?.name || '';

  const albumId = songResult.al?.id || (songResult.album as any)?.id || '';

  // 计算时长（秒转分钟:秒格式）
  const duration = songResult.dt || songResult.duration || 0;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  const interval = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    songmid: songResult.id,
    name: songResult.name,
    singer: artistName,
    album: albumName,
    albumId,
    source: 'wy',
    interval,
    img: songResult.picUrl || songResult.al?.picUrl || ''
  };
};

/**
 * 获取最佳匹配的落雪音源
 */
const getBestMatchingSource = (
  availableSources: LxSourceKey[],
  _songSource?: string
): LxSourceKey | null => {
  const priority: LxSourceKey[] = ['wy', 'kw', 'mg', 'kg', 'tx'];

  for (const source of priority) {
    if (availableSources.includes(source)) {
      return source;
    }
  }

  return availableSources[0] || null;
};

/**
 * 落雪音乐解析策略
 */
export class LxMusicStrategy {
  name = 'lxMusic';
  priority = 0; // 最高优先级

  /**
   * 检查是否可以处理
   */
  canHandle(sources: string[], settingsStore?: any): boolean {
    // 检查是否启用了落雪音源
    if (!sources.includes('lxMusic')) {
      return false;
    }

    // 检查是否有激活的音源
    const activeLxApiId = settingsStore?.setData?.activeLxMusicApiId;
    if (!activeLxApiId) {
      return false;
    }

    // 检查音源列表中是否存在该 ID
    const lxMusicScripts = settingsStore?.setData?.lxMusicScripts || [];
    const activeScript = lxMusicScripts.find((script: any) => script.id === activeLxApiId);

    return Boolean(activeScript && activeScript.script);
  }

  /**
   * 解析音乐 URL
   */
  async parse(
    id: number,
    data: SongResult,
    quality?: string,
    _sources?: string[]
  ): Promise<MusicParseResult | null> {
    // 检查失败缓存
    if (CacheManager.isInFailedCache(id, this.name)) {
      return null;
    }

    try {
      const settingsStore = useSettingsStore();

      // 获取激活的音源 ID
      const activeLxApiId = settingsStore.setData?.activeLxMusicApiId;
      if (!activeLxApiId) {
        console.log('[LxMusicStrategy] 未选择激活的落雪音源');
        return null;
      }

      // 从音源列表中获取激活的脚本
      const lxMusicScripts = settingsStore.setData?.lxMusicScripts || [];
      const activeScript = lxMusicScripts.find((script: any) => script.id === activeLxApiId);

      if (!activeScript || !activeScript.script) {
        console.log('[LxMusicStrategy] 未找到激活的落雪音源脚本');
        return null;
      }

      console.log(
        `[LxMusicStrategy] 使用激活的音源: ${activeScript.name} (ID: ${activeScript.id})`
      );

      // 获取或初始化执行器
      let runner = getLxMusicRunner();
      if (!runner || !runner.isInitialized()) {
        console.log('[LxMusicStrategy] 初始化落雪音源执行器...');
        runner = await initLxMusicRunner(activeScript.script);
      }

      // 获取可用音源
      const sources = runner.getSources();
      const availableSourceKeys = Object.keys(sources) as LxSourceKey[];

      if (availableSourceKeys.length === 0) {
        console.log('[LxMusicStrategy] 没有可用的落雪音源');
        CacheManager.addFailedCache(id, this.name);
        return null;
      }

      // 选择最佳音源
      const bestSource = getBestMatchingSource(availableSourceKeys);
      if (!bestSource) {
        console.log('[LxMusicStrategy] 无法找到匹配的音源');
        CacheManager.addFailedCache(id, this.name);
        return null;
      }

      console.log(`[LxMusicStrategy] 使用音源: ${LX_SOURCE_NAMES[bestSource]} (${bestSource})`);

      // 转换歌曲信息
      const lxMusicInfo = convertToLxMusicInfo(data);

      // 转换音质
      const lxQuality: LxQuality = QUALITY_TO_LX[quality || 'higher'] || '320k';

      // 获取音乐 URL
      const rawUrl = await runner.getMusicUrl(bestSource, lxMusicInfo, lxQuality);

      if (!rawUrl) {
        console.log('[LxMusicStrategy] 获取 URL 失败');
        CacheManager.addFailedCache(id, this.name);
        return null;
      }

      console.log('[LxMusicStrategy] 脚本返回 URL:', rawUrl.substring(0, 80) + '...');

      // 解析可能是 API 端点的 URL
      const resolvedUrl = await resolveAudioUrl(rawUrl);

      if (!resolvedUrl) {
        console.log('[LxMusicStrategy] URL 解析失败');
        CacheManager.addFailedCache(id, this.name);
        return null;
      }

      console.log('[LxMusicStrategy] 最终音频 URL:', resolvedUrl.substring(0, 80) + '...');

      return {
        data: {
          code: 200,
          message: 'success',
          data: {
            url: resolvedUrl,
            source: `lx-${bestSource}`,
            quality: lxQuality
          }
        }
      };
    } catch (error) {
      console.error('[LxMusicStrategy] 解析失败:', error);
      CacheManager.addFailedCache(id, this.name);
      return null;
    }
  }
}
