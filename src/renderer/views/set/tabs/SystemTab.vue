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
          <ui-button variant="outline" size="sm" @click="openDownloadPath">
            {{ t('common.open') }}
          </ui-button>
          <ui-button variant="outline" size="sm" @click="selectDownloadPath">
            {{ t('common.modify') }}
          </ui-button>
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
          <ui-button variant="outline" size="sm" @click="selectCacheDirectory">
            {{ t('settings.system.selectDirectory') }}
          </ui-button>
          <ui-button variant="outline" size="sm" @click="openCacheDirectory">
            {{ t('settings.system.openDirectory') }}
          </ui-button>
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
            <ui-progress :value="diskCacheUsagePercent" />
          </div>
          <span class="text-xs text-muted-foreground tabular-nums">
            {{ diskCacheUsagePercent }}%
          </span>
          <span class="text-xs text-muted-foreground">
            {{
              t('settings.system.cacheStatusDetail', {
                musicCount: diskCacheStats.musicFiles,
                lyricCount: diskCacheStats.lyricFiles
              })
            }}
          </span>
          <ui-button variant="outline" size="sm" @click="refreshDiskCacheStats()">
            {{ t('common.refresh') }}
          </ui-button>
        </div>
      </template>
    </setting-item>
  </setting-section>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button as UiButton } from '@/components/ui/button';
import { Progress as UiProgress } from '@/components/ui/progress';
import { isElectron } from '@/utils';
import { openDirectory } from '@/utils/fileOperation';

import { SETTINGS_DATA_KEY, SETTINGS_MESSAGE_KEY } from '../keys';
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
  if (!isElectron || !window.api) return;
  try {
    const stats = await window.api.getDiskCacheStats();
    if (stats) {
      diskCacheStats.value = { ...diskCacheStats.value, ...stats };
    }
  } catch (e) {
    console.warn('[SystemTab] cache stats failed', e);
  }
};

const selectDownloadPath = async () => {
  // 信任根仅由主进程对话框落盘，不可 setSettings 写入
  const result = await window.api.selectDownloadPath();
  if (!result.canceled) {
    setData.value = { ...setData.value, downloadPath: result.path };
  }
};

const openDownloadPath = () => {
  openDirectory(setData.value.downloadPath, message);
};

const selectCacheDirectory = async () => {
  const result = await window.api.selectDiskCacheDir();
  if (result.canceled) return;
  setData.value = { ...setData.value, diskCacheDir: result.path };
  // directory 已由主进程写入；此处只同步 enabled/策略（directory 字段会被主进程忽略）
  await window.api?.setDiskCacheConfig({
    enabled: true,
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
  void window.api?.setDiskCacheConfig({
    enabled: true,
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
