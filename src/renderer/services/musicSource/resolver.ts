/**
 * 统一音源解析器（重构后的唯一解析管线）
 *
 * resolveSong：按注册表顺序逐 provider 尝试，单步预算 + 整链预算，
 * 失败缓存跳过，统一校验与 API 端点二次解析，返回 attempts 归因。
 * 取代旧的「getSongUrl 内联降级链 + MusicParser 策略工厂」双轨编排。
 */
import { SongSourceConfigManager } from '@/services/SongSourceConfigManager';
import { useSettingsStore } from '@/store';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';

import { buildPluginMediaUrl, validatePluginMediaSource } from '../../../shared/musicSourcePlugin';
import { inferPluginAudioFormat, qualityToBitrate } from '../musicSourcePluginProtocol';
import { MusicResolveCache } from './cache';
import { useMusicSourceRegistry } from './registry';
import type { ResolveAttempt, ResolveSongResult } from './types';

const STAGE_BUDGET_MS = 15_000;
const CHAIN_BUDGET_MS = 30_000;

export type ResolveSongOptions = {
  /** 歌曲级音源覆盖（缺省取全局启用集合） */
  sourceKeys?: string[];
  quality?: string;
  /** 下载场景（netease provider 切换 VIP 下载口，跳过磁盘播放缓存） */
  isDownload?: boolean;
  /** 命中 URL 缓存时仍强制重新解析 */
  force?: boolean;
};

// ─── 命中 URL 轻量验证（生态实测：LX 源近半返回端点/外链/失效链） ─────────

/**
 * 验证 provider 命中的 URL 真的可播，再允许它进入缓存与播放链路。
 *
 * 99 份真实语料实测的命中形态：audio 直链（多数）、PHP/JSON 端点（需二次
 * 请求提取）、163 outer 外链（可能 302 到音频或返回 HTML）、失效端点
 * （403/404）。不验证的话坏 URL 会进缓存，到播放时才炸、且该源被误判成功。
 *
 * 判定（Range 0-8191 轻量探测，经主进程绕过 CORS）：
 *  - 2xx/206 + audio|octet-stream|video|mpeg → 直链可用
 *  - 2xx + JSON → 提取内层 url 字段再验一层（限深 2，防循环）
 *  - 其余（HTML 错误页 / 403 / 404 / 5xx）→ 该源判失败，自动降级
 * 非 Electron 环境（Web 版）无主进程桥，乐观放行。
 */
const verifyMediaUrl = async (
  url: string,
  headers?: Record<string, string>,
  depth = 0
): Promise<string | null> => {
  if (!isElectron || typeof window.api?.lxMusicHttpRequest !== 'function') return url;
  if (depth > 2) return url;

  try {
    const requestId = `verify_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const response = await window.api.lxMusicHttpRequest({
      url,
      options: {
        method: 'GET',
        headers: { ...(headers || {}), Range: 'bytes=0-8191' },
        timeout: 10000
      },
      requestId
    });

    const status = response?.statusCode ?? 0;
    if (status < 200 || status >= 400) return null;

    const contentType = String(response?.headers?.['content-type'] || '');
    if (/audio\/|octet-stream|video\/|mpeg/i.test(contentType)) {
      return url;
    }

    // JSON 端点：提取内层真实 URL 再验一层
    const body = response?.body;
    if (body && typeof body === 'object') {
      const raw = body as Record<string, any>;
      const inner = raw.url || raw.data?.url || raw.audio_url || raw.link || raw.src;
      if (typeof inner === 'string' && /^https?:\/\//i.test(inner) && inner !== url) {
        return verifyMediaUrl(inner, undefined, depth + 1);
      }
    }
    // 2xx 但既不是音频也提取不到 URL（HTML 跳转页/错误页）
    return null;
  } catch {
    return null;
  }
};

// ─── 主入口 ──────────────────────────────────────────────────────────────

/** 参与键：歌曲级覆盖优先，否则全局启用集合 */
const effectiveSourceKeys = (songId: number): string[] | undefined => {
  const songConfig = SongSourceConfigManager.getConfig(songId);
  if (songConfig && songConfig.sources.length > 0) return songConfig.sources;
  return undefined;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);

/**
 * 统一解析入口。返回 null = 全部音源未命中。
 * 成功结果的 url 已按需包装 pluginmedia://（带请求头的直链走主进程代理）。
 */
export const resolveSong = async (
  song: SongResult,
  options: ResolveSongOptions = {}
): Promise<ResolveSongResult | null> => {
  if (!isElectron) return null;

  const settingsStore = useSettingsStore();
  const { orderedProviders } = useMusicSourceRegistry();

  const sourceKeys = options.sourceKeys ?? effectiveSourceKeys(song.id as number);
  const quality = options.quality || settingsStore.setData?.musicQuality || 'higher';
  const globalKeys: string[] = settingsStore.setData?.enabledMusicSources || [];

  const songId = Number(song.id);

  // URL 缓存（键含参与音源集合，配置变化自动失效）
  if (!options.force) {
    const cached = await MusicResolveCache.getCachedMusicUrl(songId, sourceKeys ?? globalKeys);
    if (cached) {
      return {
        media: validatePluginMediaSource({
          url: cached.url,
          format: cached.format,
          br: cached.br
        })!,
        providerKey: cached.providerKey,
        providerName: cached.providerName,
        attempts: [
          { providerKey: cached.providerKey, ok: true, reason: 'no-source', detail: 'cache-hit' }
        ]
      };
    }
  }

  const candidates = orderedProviders(sourceKeys);
  const attempts: ResolveAttempt[] = [];
  const chainStart = Date.now();
  const chainDeadline = chainStart + CHAIN_BUDGET_MS;

  for (const provider of candidates) {
    const stageStart = Date.now();
    if (stageStart >= chainDeadline) {
      attempts.push({
        providerKey: provider.key,
        ok: false,
        reason: 'timeout',
        detail: 'chain-budget'
      });
      continue;
    }

    if (MusicResolveCache.isInFailedCache(songId, provider.key)) {
      attempts.push({ providerKey: provider.key, ok: false, reason: 'skipped' });
      continue;
    }

    try {
      const raw = await withTimeout(
        provider.resolve(song, quality, { isDownload: options.isDownload }),
        STAGE_BUDGET_MS
      );
      if (!raw) {
        attempts.push({
          providerKey: provider.key,
          ok: false,
          reason: 'no-source',
          costMs: Date.now() - stageStart
        });
        MusicResolveCache.addFailedCache(songId, provider.key);
        continue;
      }

      // 验证也纳入单步预算：失效端点/HTML 页当场判失败降级，不进缓存
      const resolvedUrl = await withTimeout(verifyMediaUrl(raw.url, raw.headers), STAGE_BUDGET_MS);
      const media = resolvedUrl ? validatePluginMediaSource({ ...raw, url: resolvedUrl }) : null;
      if (!media) {
        attempts.push({
          providerKey: provider.key,
          ok: false,
          reason: 'no-source',
          detail: 'invalid-url',
          costMs: Date.now() - stageStart
        });
        MusicResolveCache.addFailedCache(songId, provider.key);
        continue;
      }

      attempts.push({ providerKey: provider.key, ok: true, costMs: Date.now() - stageStart });
      const result: ResolveSongResult = {
        media: {
          url: buildPluginMediaUrl(media.url, media.headers),
          format: media.format || inferPluginAudioFormat(media.url, media.br),
          br: media.br ?? qualityToBitrate(quality),
          headers: media.headers
        },
        providerKey: provider.key,
        providerName: provider.name,
        attempts
      };
      await MusicResolveCache.setCachedMusicUrl(
        songId,
        {
          url: media.url,
          format: result.media.format,
          br: result.media.br,
          providerKey: provider.key,
          providerName: provider.name
        },
        sourceKeys ?? globalKeys
      );
      return result;
    } catch (error) {
      const isTimeout = (error as Error).message === 'timeout';
      attempts.push({
        providerKey: provider.key,
        ok: false,
        reason: isTimeout ? 'timeout' : 'error',
        detail: (error as Error).message?.slice(0, 120),
        costMs: Date.now() - stageStart
      });
      MusicResolveCache.addFailedCache(songId, provider.key);
    }
  }

  if (attempts.length) {
    console.warn(
      `[resolver] 全部音源未命中: ${song.name}(${songId})`,
      attempts.map((a) => `${a.providerKey}:${a.reason}`).join(', ')
    );
  }
  return null;
};

export { MusicResolveCache };
