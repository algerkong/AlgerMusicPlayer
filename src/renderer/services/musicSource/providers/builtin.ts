/**
 * 内置 Provider（包装现有实现，不重写解析逻辑）
 *
 * 每个内置源只做三件事：声明身份（key/name/available）、把旧实现的结果
 * 归一成 MediaSource、保留原有的超时与验证语义。
 */
import { parseFromGDMusic } from '@/api/gdmusic';
import { getMusicUrl } from '@/api/music';
import { parseFromCustomApi } from '@/api/parseFromCustomApi';
import { useSettingsStore } from '@/store';
import type { SongResult } from '@/types/music';
import type { PluginMediaSource } from '@/types/musicSourcePlugin';

import { validatePluginHttpUrl } from '../../../../shared/musicSourcePlugin';
import type { MusicSourceProvider } from '../types';

const toMediaSource = (
  url: unknown,
  extra: Partial<PluginMediaSource> = {}
): PluginMediaSource | null => {
  const validated = validatePluginHttpUrl(url as string);
  if (!validated) return null;
  return { url: validated, ...extra };
};

/** 从 MusicParseResult 兼容形状提取直链（GD/自定义 API 的旧返回） */
const extractLegacyUrl = (result: unknown): string | undefined => {
  if (!result || typeof result !== 'object') return undefined;
  const r = result as Record<string, any>;
  const inner = r?.data?.data;
  if (Array.isArray(inner)) return inner[0]?.url;
  if (inner && typeof inner === 'object') return inner.url;
  if (typeof r.url === 'string') return r.url;
  return undefined;
};

// ─── 网易云官方直连（默认第一位，含 VIP 下载口与试听判定） ────────────────

export const neteaseProvider: MusicSourceProvider = {
  key: 'netease',
  name: '网易云',
  kind: 'builtin',
  icon: 'ri-netease-cloud-music-fill',
  color: '#ec4141',
  builtin: true,
  available: true,
  resolve: async (song: SongResult, _quality: string, options) => {
    // 下载场景走 VIP 下载口（getMusicUrl 内部按 isDownloaded 判定）
    const res = await getMusicUrl(song.id as number, Boolean(options?.isDownload));
    const detail = res?.data?.data?.[0];
    if (!detail?.url || detail.freeTrialInfo) return null;
    return toMediaSource(detail.url, {
      format: detail.type,
      br: detail.br ? Number(detail.br) * 1000 : undefined
    });
  }
};

// ─── 自定义 API（用户导入的 JSON 接口配置） ──────────────────────────────

export const customApiProvider: MusicSourceProvider = {
  key: 'customApi',
  name: '自定义API',
  kind: 'builtin',
  icon: 'ri-plug-fill',
  color: '#8b5cf6',
  builtin: true,
  available: true,
  configHint: 'settings.playback.customApi.notImported',
  resolve: async (song: SongResult, quality: string) => {
    const settingsStore = useSettingsStore();
    if (!settingsStore.setData.customApiPlugin) return null;
    const result = await parseFromCustomApi(song.id as number, song, quality);
    const url = extractLegacyUrl(result);
    return url ? toMediaSource(url) : null;
  }
};

// ─── GD 音乐台（聚合解析） ───────────────────────────────────────────────

export const gdmusicProvider: MusicSourceProvider = {
  key: 'gdmusic',
  name: 'GD音乐台',
  kind: 'builtin',
  icon: 'ri-google-fill',
  color: '#4285f4',
  builtin: true,
  available: true,
  resolve: async (song: SongResult, _quality: string) => {
    const result = await parseFromGDMusic(song.id as number, song, '999');
    const url = extractLegacyUrl(result);
    return url ? toMediaSource(url) : null;
  }
};

// ─── UnblockNeteaseMusic（按平台一 provider，key 沿用旧值零迁移） ──────────
//
// 2026-10-24 用 VIP 歌单 2605912264 两轮实测（命中率 + audio 元素解码验时长）：
//   pyncmd  6/6 命中且时长精确匹配（126.net 正版直链）→ 保留
//   gdmusic 6/6 命中且时长精确匹配（126.net 聚合搜索）→ 保留（见 gdmusicProvider）
//   kuwo    6/6 "命中"但 0/6 时长正确 —— ID 映射错乱，返回的全是错歌 → 移除
//   kugou   1/10 命中 → 上游已死，移除
//   migu    0/10 命中 → 上游已死，移除
// enabledMusicSources 里的残留 key 由注册表的"失效键剔除"自动清理。

const UNBLOCK_PLATFORMS = [
  { key: 'pyncmd', name: 'pyncmd', icon: 'ri-netease-cloud-music-fill', color: '#ec4141' }
] as const;

const UNBLOCK_TIMEOUT = 15000;

const createUnblockProvider = (
  platform: (typeof UNBLOCK_PLATFORMS)[number]
): MusicSourceProvider => ({
  key: platform.key,
  name: platform.name,
  kind: 'builtin',
  icon: platform.icon,
  color: platform.color,
  builtin: true,
  available: true,
  resolve: async (song: SongResult, _quality: string) => {
    const result = await Promise.race([
      window.api.unblockMusic(song.id as number, { ...song }, [platform.key]),
      new Promise((resolve) => setTimeout(() => resolve(null), UNBLOCK_TIMEOUT))
    ]);
    const url = extractLegacyUrl(result);
    return url ? toMediaSource(url) : null;
  }
});

export const unblockProviders: MusicSourceProvider[] = UNBLOCK_PLATFORMS.map(createUnblockProvider);

export const builtinProviders: MusicSourceProvider[] = [
  customApiProvider,
  neteaseProvider,
  gdmusicProvider,
  ...unblockProviders
];
