import { computed } from 'vue';

import { useSettingsStore } from '@/store';
import type { Platform } from '@/types/music';

// ==================== 类型定义 ====================

export type MusicSourceGroup = 'unblock' | 'extended' | 'plugin';

export type MusicSourceMeta = {
  key: Platform;
  icon: string;
  color: string;
  group: MusicSourceGroup;
};

export type MusicSourceInfo = MusicSourceMeta & {
  available: boolean;
  configHint?: string;
};

// ==================== 静态注册表 ====================

export const MUSIC_SOURCE_REGISTRY: MusicSourceMeta[] = [
  // 内置解锁音源 (UnblockMusicStrategy)
  { key: 'migu', icon: 'ri-music-2-fill', color: '#ff6600', group: 'unblock' },
  { key: 'kugou', icon: 'ri-music-fill', color: '#2979ff', group: 'unblock' },
  { key: 'kuwo', icon: 'ri-music-fill', color: '#ff8c00', group: 'unblock' },
  { key: 'pyncmd', icon: 'ri-netease-cloud-music-fill', color: '#ec4141', group: 'unblock' },
  // 扩展音源 (GDMusicStrategy)
  { key: 'gdmusic', icon: 'ri-google-fill', color: '#4285f4', group: 'extended' },
  // 插件音源 (需要用户配置)
  { key: 'lxMusic', icon: 'ri-leaf-fill', color: '#22c55e', group: 'plugin' },
  { key: 'custom', icon: 'ri-plug-fill', color: '#8b5cf6', group: 'plugin' }
];

// ==================== Composable ====================

export const useMusicSources = () => {
  const settingsStore = useSettingsStore();

  const allSources = computed<MusicSourceInfo[]>(() => {
    return MUSIC_SOURCE_REGISTRY.map((source) => {
      let available = true;
      let configHint: string | undefined;

      if (source.key === 'lxMusic') {
        available =
          (settingsStore.setData.lxMusicScripts?.length ?? 0) > 0 &&
          Boolean(settingsStore.setData.activeLxMusicApiId);
        if (!available) configHint = 'settings.playback.lxMusic.scripts.notConfigured';
      } else if (source.key === 'custom') {
        available = Boolean(settingsStore.setData.customApiPlugin);
        if (!available) configHint = 'settings.playback.customApi.notImported';
      }

      return { ...source, available, configHint };
    });
  });

  return { allSources };
};
