import { computed } from 'vue';

import { useMusicSourceRegistry } from '@/services/musicSource/registry';
import type { Platform } from '@/types/music';

// ==================== 类型定义 ====================

export type MusicSourceGroup = 'builtin' | 'netease' | 'unblock' | 'plugin';

export type MusicSourceMeta = {
  key: Platform;
  icon: string;
  color: string;
  group: MusicSourceGroup;
};

export type MusicSourceInfo = MusicSourceMeta & {
  available: boolean;
  configHint?: string;
  /** 覆盖显示名（本地插件用插件名替代 key） */
  label?: string;
  /** 内置源（不可删除） */
  builtin?: boolean;
  /** 插件源专有（音源管理 UI 用） */
  pluginId?: string;
};

// ==================== Composable ====================
//
// 重构后音源身份的唯一来源是 Provider 注册表（内置 + 插件同权），
// 这里只做 provider → UI 列表项的映射，不再维护静态注册表。

export const useMusicSources = () => {
  const { providers } = useMusicSourceRegistry();

  const allSources = computed<MusicSourceInfo[]>(() =>
    providers.value.map((provider) => ({
      key: provider.key as Platform,
      label: provider.name,
      icon: provider.icon,
      color: provider.color,
      group:
        provider.kind === 'plugin'
          ? 'plugin'
          : provider.key === 'netease'
            ? 'netease'
            : provider.key === 'customApi' || provider.key === 'gdmusic'
              ? 'builtin'
              : 'unblock',
      available: provider.available,
      configHint: provider.configHint,
      builtin: provider.builtin,
      ...(provider.plugin ? { pluginId: provider.plugin.id } : {})
    }))
  );

  return { allSources };
};
