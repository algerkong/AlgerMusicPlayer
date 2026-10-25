/**
 * 音源 Provider：统一一切音源的身份模型（重构核心）
 *
 * 内置源（网易云官方/unblock 平台/GD 音乐台/自定义 API）与导入插件
 * （三方言）在这里获得同一种身份 —— 同一个注册表、同一套排序与启停、
 * 同一个解析入口（resolver）。对齐 AlgerMusicFlutter 的 MediaProvider
 * 注册表设计，按 Electron 单机场景裁剪（内置源保留原生实现，不插件化）。
 */
import type { SongResult } from '@/types/music';
import type { MusicSourcePlugin, PluginMediaSource } from '@/types/musicSourcePlugin';

export type MusicSourceKind = 'builtin' | 'plugin';

export type ResolveCallOptions = {
  /** 下载场景：netease provider 切换 VIP 下载口 */
  isDownload?: boolean;
};

export type MusicSourceProvider = {
  /** 注册表唯一键：内置 'netease'/'gdmusic'/'customApi'/unblock 平台 key（migu…）；插件 'plugin:<id>' */
  key: string;
  name: string;
  kind: MusicSourceKind;
  icon: string;
  color: string;
  /** 内置源不可删除，仅可停用 */
  builtin: boolean;
  /** 配置缺失时注册表判定为不可用（UI 置灰 + 解析链跳过） */
  available: boolean;
  configHint?: string;
  resolve: (
    song: SongResult,
    quality: string,
    options?: ResolveCallOptions
  ) => Promise<PluginMediaSource | null>;
  /** 插件源专有（音源管理 UI 与插件执行用） */
  plugin?: MusicSourcePlugin;
};

export type ResolveAttempt = {
  providerKey: string;
  ok: boolean;
  /** 未命中原因（ok=false 时）：no-source / timeout / error / skipped（失败缓存期内） */
  reason?: 'no-source' | 'timeout' | 'error' | 'skipped';
  detail?: string;
  costMs?: number;
};

export type ResolveSongResult = {
  media: PluginMediaSource;
  providerKey: string;
  providerName: string;
  attempts: ResolveAttempt[];
};
