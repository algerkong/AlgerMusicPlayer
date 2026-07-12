<template>
  <!-- 存储：下载目录 + 磁盘缓存 -->
  <setting-section v-if="isElectron">
    <setting-item :title="t('settings.application.downloadPath')">
      <template #description>
        <span class="break-all">{{
          setData.downloadPath || t('settings.application.downloadPathDesc')
        }}</span>
      </template>
      <template #action>
        <div class="flex items-center gap-2">
          <s-btn @click="openDownloadPath">{{ t('common.open') }}</s-btn>
          <s-btn @click="selectDownloadPath">{{ t('common.modify') }}</s-btn>
        </div>
      </template>
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
      :title="t('settings.system.cacheStatus')"
      :description="
        t('settings.system.cacheStatusDesc', {
          used: formatBytes(diskCacheStats.totalSizeBytes),
          limit: `${DEFAULT_CACHE_MB} MB`
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
  </setting-section>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { isElectron } from '@/utils';
import { openDirectory, selectDirectory } from '@/utils/fileOperation';

import { SETTINGS_DATA_KEY, SETTINGS_MESSAGE_KEY } from '../keys';
import SBtn from '../SBtn.vue';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';

/** 默认磁盘缓存上限 / 策略（界面不再暴露，后台写死） */
const DEFAULT_CACHE_MB = 4096;
const DEFAULT_CLEANUP: DiskCacheCleanupPolicy = 'lru';

type DiskCacheCleanupPolicy = 'lru' | 'fifo';

type DiskCacheConfig = {
  enabled: boolean;
  directory: string;
  maxSizeMB: number;
  cleanupPolicy: DiskCacheCleanupPolicy;
};

type DiskCacheStats = DiskCacheConfig & {
  totalSizeBytes: number;
  musicFiles: number;
  lyricFiles: number;
  maxSizeMB: number;
};

const { t } = useI18n();
const setData = inject(SETTINGS_DATA_KEY)!;
const message = inject(SETTINGS_MESSAGE_KEY)!;

const diskCacheStats = ref<DiskCacheStats>({
  enabled: true,
  directory: '',
  maxSizeMB: DEFAULT_CACHE_MB,
  cleanupPolicy: DEFAULT_CLEANUP,
  totalSizeBytes: 0,
  musicFiles: 0,
  lyricFiles: 0
});

const diskCacheUsagePercent = computed(() => {
  const limit = DEFAULT_CACHE_MB * 1024 * 1024;
  if (!limit) return 0;
  return Math.min(100, Math.round((diskCacheStats.value.totalSizeBytes / limit) * 100));
});

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const refreshDiskCacheStats = async () => {
  if (!isElectron || !window.electron?.ipcRenderer) return;
  try {
    const stats = await window.electron.ipcRenderer.invoke('get-disk-cache-stats');
    if (stats) {
      diskCacheStats.value = { ...diskCacheStats.value, ...stats };
    }
  } catch (e) {
    console.warn('[SystemTab] cache stats failed', e);
  }
};

const selectDownloadPath = async () => {
  const path = await selectDirectory(message);
  if (path) {
    setData.value = { ...setData.value, downloadPath: path };
  }
};

const openDownloadPath = () => {
  openDirectory(setData.value.downloadPath, message);
};

const selectCacheDirectory = async () => {
  const path = await selectDirectory(message);
  if (!path) return;
  setData.value = { ...setData.value, diskCacheDir: path };
  await window.electron?.ipcRenderer.invoke('set-disk-cache-config', {
    enabled: true,
    directory: path,
    maxSizeMB: DEFAULT_CACHE_MB,
    cleanupPolicy: DEFAULT_CLEANUP
  });
  await refreshDiskCacheStats();
};

const openCacheDirectory = () => {
  const dir = setData.value.diskCacheDir || diskCacheStats.value.directory || '';
  openDirectory(dir, message);
};

const ensureCacheDefaults = useDebounceFn(() => {
  if (!isElectron) return;
  setData.value = {
    ...setData.value,
    enableDiskCache: true,
    diskCacheMaxSizeMB: DEFAULT_CACHE_MB,
    diskCacheCleanupPolicy: DEFAULT_CLEANUP
  };
  void window.electron?.ipcRenderer.invoke('set-disk-cache-config', {
    enabled: true,
    directory: setData.value.diskCacheDir || undefined,
    maxSizeMB: DEFAULT_CACHE_MB,
    cleanupPolicy: DEFAULT_CLEANUP
  });
}, 300);

onMounted(() => {
  ensureCacheDefaults();
  void refreshDiskCacheStats();
});

watch(
  () => setData.value.diskCacheDir,
  () => void refreshDiskCacheStats()
);
</script>
