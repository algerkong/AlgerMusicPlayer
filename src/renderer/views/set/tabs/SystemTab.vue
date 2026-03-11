<template>
  <setting-section v-if="isElectron" :title="t('settings.sections.system')">
    <setting-item
      :title="t('settings.system.diskCache')"
      :description="t('settings.system.diskCacheDesc')"
    >
      <n-switch v-model:value="setData.enableDiskCache">
        <template #checked>{{ t('common.on') }}</template>
        <template #unchecked>{{ t('common.off') }}</template>
      </n-switch>
    </setting-item>

    <setting-item
      :title="t('settings.system.cacheDirectory')"
      :description="
        setData.diskCacheDir || diskCacheStats.directory || t('settings.system.cacheDirectoryDesc')
      "
    >
      <template #action>
        <div class="flex items-center gap-2 max-md:flex-wrap">
          <s-btn @click="selectCacheDirectory">
            {{ t('settings.system.selectDirectory') }}
          </s-btn>
          <s-btn @click="openCacheDirectory">
            {{ t('settings.system.openDirectory') }}
          </s-btn>
        </div>
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.system.cacheMaxSize')"
      :description="t('settings.system.cacheMaxSizeDesc')"
    >
      <template #action>
        <s-input
          v-model="setData.diskCacheMaxSizeMB"
          type="number"
          :min="256"
          :max="102400"
          :step="256"
          suffix="MB"
          width="w-[160px] max-md:w-32"
        />
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.system.cleanupPolicy')"
      :description="t('settings.system.cleanupPolicyDesc')"
    >
      <s-select
        v-model="setData.diskCacheCleanupPolicy"
        :options="cleanupPolicyOptions"
        width="w-40"
      />
    </setting-item>

    <setting-item
      :title="t('settings.system.cacheStatus')"
      :description="
        t('settings.system.cacheStatusDesc', {
          used: formatBytes(diskCacheStats.totalSizeBytes),
          limit: `${setData.diskCacheMaxSizeMB || diskCacheStats.maxSizeMB || 0} MB`
        })
      "
    >
      <template #action>
        <div class="flex items-center gap-3 max-md:flex-wrap">
          <div class="w-40 max-md:w-32">
            <n-progress type="line" :percentage="diskCacheUsagePercent" />
          </div>
          <span class="text-xs text-neutral-500">
            {{
              t('settings.system.cacheStatusDetail', {
                musicCount: diskCacheStats.musicFiles,
                lyricCount: diskCacheStats.lyricFiles
              })
            }}
          </span>
          <s-btn @click="refreshDiskCacheStats()">{{ t('common.refresh') }}</s-btn>
        </div>
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.system.manageDiskCache')"
      :description="t('settings.system.manageDiskCacheDesc')"
    >
      <template #action>
        <div class="flex items-center gap-2 max-md:flex-wrap">
          <s-btn @click="clearDiskCacheByScope('music')">
            {{ t('settings.system.clearMusicCache') }}
          </s-btn>
          <s-btn @click="clearDiskCacheByScope('lyrics')">
            {{ t('settings.system.clearLyricCache') }}
          </s-btn>
          <s-btn variant="danger" @click="clearDiskCacheByScope('all')">
            {{ t('settings.system.clearAllCache') }}
          </s-btn>
        </div>
      </template>
    </setting-item>

    <setting-item :title="t('settings.system.cache')" :description="t('settings.system.cacheDesc')">
      <s-btn @click="showClearCacheModal = true">{{ t('settings.system.cacheDesc') }}</s-btn>
    </setting-item>

    <setting-item
      :title="t('settings.system.restart')"
      :description="t('settings.system.restartDesc')"
    >
      <s-btn @click="restartApp">{{ t('settings.system.restart') }}</s-btn>
    </setting-item>

    <clear-cache-settings v-model:show="showClearCacheModal" @confirm="clearCache" />
  </setting-section>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import localData from '@/../main/set.json';
import ClearCacheSettings from '@/components/settings/ClearCacheSettings.vue';
import { useUserStore } from '@/store/modules/user';
import { isElectron } from '@/utils';
import { openDirectory, selectDirectory } from '@/utils/fileOperation';

import { SETTINGS_DATA_KEY, SETTINGS_DIALOG_KEY, SETTINGS_MESSAGE_KEY } from '../keys';
import SBtn from '../SBtn.vue';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';
import SInput from '../SInput.vue';
import SSelect from '../SSelect.vue';

type DiskCacheScope = 'all' | 'music' | 'lyrics';
type DiskCacheCleanupPolicy = 'lru' | 'fifo';
type CacheSwitchAction = 'migrate' | 'destroy' | 'keep';

type DiskCacheConfig = {
  enabled: boolean;
  directory: string;
  maxSizeMB: number;
  cleanupPolicy: DiskCacheCleanupPolicy;
};

type DiskCacheStats = DiskCacheConfig & {
  totalSizeBytes: number;
  musicSizeBytes: number;
  lyricSizeBytes: number;
  totalFiles: number;
  musicFiles: number;
  lyricFiles: number;
  usage: number;
};

type SwitchCacheDirectoryResult = {
  success: boolean;
  config: DiskCacheConfig;
  migratedFiles: number;
  destroyedFiles: number;
};

const { t } = useI18n();
const userStore = useUserStore();
const setData = inject(SETTINGS_DATA_KEY)!;
const message = inject(SETTINGS_MESSAGE_KEY)!;
const dialog = inject(SETTINGS_DIALOG_KEY)!;

const showClearCacheModal = ref(false);
const diskCacheStats = ref<DiskCacheStats>({
  enabled: true,
  directory: '',
  maxSizeMB: 4096,
  cleanupPolicy: 'lru',
  totalSizeBytes: 0,
  musicSizeBytes: 0,
  lyricSizeBytes: 0,
  totalFiles: 0,
  musicFiles: 0,
  lyricFiles: 0,
  usage: 0
});
const applyingDiskCacheConfig = ref(false);
const switchingCacheDirectory = ref(false);

const cleanupPolicyOptions = computed(() => [
  { label: t('settings.system.cleanupPolicyOptions.lru'), value: 'lru' },
  { label: t('settings.system.cleanupPolicyOptions.fifo'), value: 'fifo' }
]);

const diskCacheUsagePercent = computed(() =>
  Math.min(100, Math.max(0, Math.round((diskCacheStats.value.usage || 0) * 100)))
);

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const readDiskCacheConfigFromUI = (): DiskCacheConfig => {
  const cleanupPolicy: DiskCacheCleanupPolicy =
    setData.value.diskCacheCleanupPolicy === 'fifo' ? 'fifo' : 'lru';
  const maxSizeMB = Math.max(256, Math.floor(Number(setData.value.diskCacheMaxSizeMB || 4096)));

  return {
    enabled: setData.value.enableDiskCache !== false,
    directory: String(setData.value.diskCacheDir || ''),
    maxSizeMB,
    cleanupPolicy
  };
};

const refreshDiskCacheStats = async (silent: boolean = true) => {
  if (!window.electron) return;
  try {
    const stats = (await window.electron.ipcRenderer.invoke(
      'get-disk-cache-stats'
    )) as DiskCacheStats;
    if (stats) {
      diskCacheStats.value = stats;
    }
  } catch (error) {
    console.error('读取磁盘缓存统计失败:', error);
    if (!silent) {
      message.error(t('settings.system.messages.diskCacheStatsLoadFailed'));
    }
  }
};

const loadDiskCacheConfig = async () => {
  if (!window.electron) return;

  try {
    const config = (await window.electron.ipcRenderer.invoke(
      'get-disk-cache-config'
    )) as DiskCacheConfig;
    if (config) {
      setData.value = {
        ...setData.value,
        enableDiskCache: config.enabled,
        diskCacheDir: config.directory,
        diskCacheMaxSizeMB: config.maxSizeMB,
        diskCacheCleanupPolicy: config.cleanupPolicy
      };
    }
  } catch (error) {
    console.error('读取磁盘缓存配置失败:', error);
  }
};

const applyDiskCacheConfig = async () => {
  if (!window.electron || applyingDiskCacheConfig.value) return;

  applyingDiskCacheConfig.value = true;
  try {
    const config = readDiskCacheConfigFromUI();
    const updated = (await window.electron.ipcRenderer.invoke(
      'set-disk-cache-config',
      config
    )) as DiskCacheConfig;

    if (updated) {
      setData.value = {
        ...setData.value,
        enableDiskCache: updated.enabled,
        diskCacheDir: updated.directory,
        diskCacheMaxSizeMB: updated.maxSizeMB,
        diskCacheCleanupPolicy: updated.cleanupPolicy
      };
    }
    await refreshDiskCacheStats();
  } catch (error) {
    console.error('更新磁盘缓存配置失败:', error);
  } finally {
    applyingDiskCacheConfig.value = false;
  }
};

const applyDiskCacheConfigDebounced = useDebounceFn(() => {
  void applyDiskCacheConfig();
}, 500);

watch(
  () => [
    setData.value.enableDiskCache,
    setData.value.diskCacheDir,
    setData.value.diskCacheMaxSizeMB,
    setData.value.diskCacheCleanupPolicy
  ],
  () => {
    if (!window.electron || applyingDiskCacheConfig.value || switchingCacheDirectory.value) return;
    applyDiskCacheConfigDebounced();
  }
);

const askCacheSwitchMigrate = (): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    dialog.warning({
      title: t('settings.system.switchDirectoryMigrateTitle'),
      content: t('settings.system.switchDirectoryMigrateContent'),
      positiveText: t('settings.system.switchDirectoryMigrateConfirm'),
      negativeText: t('settings.system.switchDirectoryKeepOld'),
      onPositiveClick: () => finish(true),
      onNegativeClick: () => finish(false),
      onClose: () => finish(false)
    });
  });
};

const askCacheSwitchDestroy = (): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    dialog.warning({
      title: t('settings.system.switchDirectoryDestroyTitle'),
      content: t('settings.system.switchDirectoryDestroyContent'),
      positiveText: t('settings.system.switchDirectoryDestroyConfirm'),
      negativeText: t('settings.system.switchDirectoryKeepOld'),
      onPositiveClick: () => finish(true),
      onNegativeClick: () => finish(false),
      onClose: () => finish(false)
    });
  });
};

const selectCacheDirectory = async () => {
  if (!window.electron) return;

  const selectedPath = await selectDirectory(message);
  if (!selectedPath) return;

  const currentDirectory = setData.value.diskCacheDir || diskCacheStats.value.directory;
  if (currentDirectory && selectedPath === currentDirectory) {
    return;
  }

  let action: CacheSwitchAction = 'keep';
  if (currentDirectory && diskCacheStats.value.totalFiles > 0) {
    const shouldMigrate = await askCacheSwitchMigrate();
    if (shouldMigrate) {
      action = 'migrate';
    } else {
      const shouldDestroy = await askCacheSwitchDestroy();
      action = shouldDestroy ? 'destroy' : 'keep';
    }
  }

  switchingCacheDirectory.value = true;
  try {
    const result = (await window.electron.ipcRenderer.invoke('switch-disk-cache-directory', {
      directory: selectedPath,
      action
    })) as SwitchCacheDirectoryResult;

    if (!result?.success) {
      message.error(t('settings.system.messages.switchDirectoryFailed'));
      return;
    }

    setData.value = {
      ...setData.value,
      enableDiskCache: result.config.enabled,
      diskCacheDir: result.config.directory,
      diskCacheMaxSizeMB: result.config.maxSizeMB,
      diskCacheCleanupPolicy: result.config.cleanupPolicy
    };
    await refreshDiskCacheStats();

    if (action === 'migrate') {
      message.success(
        t('settings.system.messages.switchDirectoryMigrated', { count: result.migratedFiles })
      );
      return;
    }
    if (action === 'destroy') {
      message.success(
        t('settings.system.messages.switchDirectoryDestroyed', { count: result.destroyedFiles })
      );
      return;
    }
    message.success(t('settings.system.messages.switchDirectorySuccess'));
  } catch (error) {
    console.error('切换缓存目录失败:', error);
    message.error(t('settings.system.messages.switchDirectoryFailed'));
  } finally {
    switchingCacheDirectory.value = false;
  }
};

const openCacheDirectory = () => {
  const targetPath = setData.value.diskCacheDir || diskCacheStats.value.directory;
  openDirectory(targetPath, message);
};

const clearDiskCacheByScope = async (scope: DiskCacheScope) => {
  if (!window.electron) return;

  try {
    const success = await window.electron.ipcRenderer.invoke('clear-disk-cache', scope);
    if (success) {
      await refreshDiskCacheStats();
      message.success(t('settings.system.messages.diskCacheClearSuccess'));
      return;
    }
    message.error(t('settings.system.messages.diskCacheClearFailed'));
  } catch (error) {
    console.error('手动清理磁盘缓存失败:', error);
    message.error(t('settings.system.messages.diskCacheClearFailed'));
  }
};

const clearCache = async (selectedCacheTypes: string[]) => {
  const clearTasks = selectedCacheTypes.map(async (type) => {
    switch (type) {
      case 'history':
        localStorage.removeItem('musicHistory');
        break;
      case 'favorite':
        localStorage.removeItem('favoriteList');
        break;
      case 'user':
        userStore.handleLogout();
        break;
      case 'settings':
        if (window.electron) {
          window.electron.ipcRenderer.send('set-store-value', 'set', localData);
        }
        localStorage.removeItem('appSettings');
        localStorage.removeItem('theme');
        localStorage.removeItem('lyricData');
        localStorage.removeItem('lyricFontSize');
        localStorage.removeItem('playMode');
        break;
      case 'downloads':
        if (window.electron) {
          window.electron.ipcRenderer.send('clear-downloads-history');
        }
        break;
      case 'resources':
        if (window.electron) {
          window.electron.ipcRenderer.send('clear-audio-cache');
          await window.electron.ipcRenderer.invoke('clear-disk-cache', 'music');
        }
        localStorage.removeItem('lyricCache');
        localStorage.removeItem('musicUrlCache');
        if (window.caches) {
          try {
            const cache = await window.caches.open('music-images');
            const keys = await cache.keys();
            keys.forEach((key) => cache.delete(key));
          } catch (error) {
            console.error('清除图片缓存失败:', error);
          }
        }
        break;
      case 'lyrics':
        if (window.electron) {
          await window.electron.ipcRenderer.invoke('clear-disk-cache', 'lyrics');
        }
        await window.api.invoke('clear-lyrics-cache');
        break;
    }
  });
  await Promise.all(clearTasks);
  await refreshDiskCacheStats();
  message.success(t('settings.system.messages.clearSuccess'));
};

const restartApp = () => {
  window.electron.ipcRenderer.send('restart');
};

onMounted(async () => {
  await loadDiskCacheConfig();
  await refreshDiskCacheStats();
});
</script>
