<template>
  <div class="download-page h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <n-scrollbar ref="scrollbarRef" class="h-full" @scroll="handleDownloadScroll">
      <div class="download-content" :style="{ paddingBottom: contentPaddingBottom }">
        <!-- Hero Section -->
        <section class="hero-section relative overflow-hidden rounded-tl-2xl">
          <!-- Background with Blur -->
          <div class="hero-bg absolute inset-0 -top-20">
            <div
              class="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-3xl opacity-50 dark:opacity-30"
            ></div>
            <div
              class="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-black/80 dark:to-black"
            ></div>
          </div>

          <!-- Hero Content -->
          <div class="hero-content relative z-10 page-padding-x pt-10 pb-8">
            <div class="flex flex-col md:flex-row gap-8 items-center md:items-end">
              <div class="cover-wrapper relative group">
                <div
                  class="cover-container relative w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-primary/10 flex items-center justify-center shadow-2xl ring-4 ring-white/50 dark:ring-neutral-800/50"
                >
                  <i class="ri-download-cloud-2-line text-6xl text-primary opacity-80" />
                </div>
              </div>

              <div class="info-content text-center md:text-left">
                <div class="badge mb-3">
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider"
                  >
                    {{ t('download.title') }}
                  </span>
                </div>
                <h1
                  class="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight"
                >
                  {{
                    tabName === 'downloading'
                      ? t('download.tabs.downloading')
                      : t('download.tabs.downloaded')
                  }}
                </h1>
                <p class="mt-4 text-sm md:text-base text-neutral-500 dark:text-neutral-400">
                  {{
                    tabName === 'downloading'
                      ? t('download.progress.total', {
                          progress: downloadStore.totalProgress.toFixed(1)
                        })
                      : t('download.count', { count: downloadStore.completedList.length })
                  }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Action Bar (Sticky) -->
        <section
          class="action-bar sticky top-0 z-20 page-padding-x py-3 md:py-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-800/50"
        >
          <div class="flex items-center justify-between gap-4">
            <!-- Tabs (Segment Control) -->
            <div class="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl">
              <button
                v-for="tab in ['downloading', 'downloaded']"
                :key="tab"
                class="px-6 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="
                  tabName === tab
                    ? 'bg-white dark:bg-neutral-800 text-primary shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                "
                @click="tabName = tab"
              >
                {{ t(`download.tabs.${tab}`) }}
              </button>
            </div>

            <!-- Right Actions -->
            <div class="flex items-center gap-3">
              <button
                v-if="tabName === 'downloaded' && downloadStore.completedList.length > 0"
                class="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 border border-neutral-200 dark:border-neutral-800 hover:border-primary/30 hover:bg-primary/5"
                @click="showClearConfirm = true"
              >
                <i class="ri-delete-bin-line text-lg" />
                <span class="hidden md:inline">{{ t('download.clearAll') }}</span>
              </button>

              <button
                class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all hover:scale-110 hover:text-primary hover:bg-primary/10"
                @click="openDownloadPath"
              >
                <i class="ri-folder-open-line text-lg" />
              </button>

              <button
                class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all hover:scale-110 hover:text-primary hover:bg-primary/10"
                @click="showSettingsDrawer = true"
              >
                <i class="ri-settings-3-line text-lg" />
              </button>
            </div>
          </div>
        </section>

        <!-- List Section -->
        <section class="list-section page-padding-x mt-6">
          <!-- Downloading List -->
          <div v-if="tabName === 'downloading'" class="downloading-container">
            <div
              v-if="downloadStore.downloadingList.length === 0"
              class="empty-state py-20 text-center"
            >
              <i
                class="ri-download-cloud-2-line text-5xl mb-4 text-neutral-200 dark:text-neutral-800"
              />
              <p class="text-neutral-400">{{ t('download.empty.noTasks') }}</p>
            </div>
            <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                v-for="item in downloadStore.downloadingList"
                :key="item.taskId"
                class="downloading-item group p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                <div class="flex items-center gap-4">
                  <img
                    :src="getImgUrl(item.songInfo?.picUrl, '100y100')"
                    class="w-12 h-12 rounded-xl flex-shrink-0 object-cover"
                    @error="handleCoverError"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-2">
                      <div class="truncate pr-4">
                        <span class="text-sm font-bold text-neutral-900 dark:text-white">{{
                          item.filename
                        }}</span>
                        <span class="ml-2 text-xs text-neutral-400">{{
                          item.songInfo?.ar?.map((a) => a.name).join(', ')
                        }}</span>
                      </div>
                      <span class="text-xs font-medium" :class="getStatusClass(item)">
                        {{ getStatusText(item) }}
                      </span>
                    </div>
                    <div
                      class="relative h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden"
                    >
                      <div
                        class="absolute inset-y-0 left-0 transition-all duration-300"
                        :class="getProgressClass(item)"
                        :style="{ width: `${item.progress}%` }"
                      ></div>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                      <span class="text-[10px] text-neutral-400">
                        {{ formatSize(item.loaded) }} / {{ formatSize(item.total) }}
                      </span>
                      <div class="flex items-center gap-1">
                        <!-- Pause button (shown when downloading) -->
                        <button
                          v-if="item.state === 'downloading'"
                          class="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-yellow-500 hover:bg-yellow-500/10 transition-all"
                          @click="handlePause(item.taskId)"
                        >
                          <i class="ri-pause-circle-line text-sm" />
                        </button>
                        <!-- Resume button (shown when paused) -->
                        <button
                          v-if="item.state === 'paused'"
                          class="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-primary/10 transition-all"
                          @click="handleResume(item.taskId)"
                        >
                          <i class="ri-play-circle-line text-sm" />
                        </button>
                        <!-- Cancel button (shown for all active states) -->
                        <button
                          v-if="['queued', 'downloading', 'paused'].includes(item.state)"
                          class="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          @click="handleCancel(item.taskId)"
                        >
                          <i class="ri-close-circle-line text-sm" />
                        </button>
                        <span class="text-[10px] text-neutral-400 ml-1"
                          >{{ item.progress.toFixed(1) }}%</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Downloaded List -->
          <div v-else class="downloaded-container">
            <n-spin :show="downloadStore.isLoadingCompleted">
              <div
                v-if="downloadStore.completedList.length === 0"
                class="empty-state py-20 text-center"
              >
                <i
                  class="ri-inbox-archive-line text-5xl mb-4 text-neutral-200 dark:text-neutral-800"
                />
                <p class="text-neutral-400">{{ t('download.empty.noDownloaded') }}</p>
                <p class="text-xs text-neutral-500 mt-2">
                  {{ t('download.empty.noDownloadedHint') }}
                </p>
              </div>
              <div v-else class="space-y-2">
                <div class="downloaded-list-section">
                  <div
                    v-for="(item, index) in renderedDownloaded"
                    :key="item.path || item.filePath"
                    class="downloaded-item group p-3 rounded-2xl flex items-center gap-4 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all"
                    :class="{ 'animate-item': index < 20 }"
                    :style="index < 20 ? { animationDelay: `${index * 0.03}s` } : undefined"
                  >
                    <div
                      class="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
                    >
                      <img
                        :src="getImgUrl(item.picUrl, '100y100')"
                        class="w-full h-full object-cover"
                        @error="handleCoverError"
                      />
                      <div
                        class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        @click="handlePlayMusic(item)"
                      >
                        <i class="ri-play-fill text-white text-xl" />
                      </div>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-neutral-900 dark:text-white truncate">{{
                          item.displayName || item.filename
                        }}</span>
                        <span class="text-xs text-neutral-400 flex-shrink-0">{{
                          formatSize(item.size)
                        }}</span>
                      </div>
                      <div class="flex items-center gap-4 mt-1">
                        <span class="text-xs text-neutral-500 truncate max-w-[150px]">{{
                          item.ar?.map((a) => a.name).join(', ')
                        }}</span>
                        <div
                          class="hidden md:flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full truncate"
                        >
                          <i class="ri-folder-line" />
                          <span class="truncate">{{
                            shortenPath(item.path || item.filePath)
                          }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-1">
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <button
                            class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-primary/10 transition-all"
                            @click="copyPath(item.path || item.filePath)"
                          >
                            <i class="ri-file-copy-line" />
                          </button>
                        </template>
                        {{ t('download.path.copy') || '复制路径' }}
                      </n-tooltip>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <button
                            class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-primary/10 transition-all"
                            @click="openDirectory(item.path || item.filePath)"
                          >
                            <i class="ri-folder-open-line" />
                          </button>
                        </template>
                        {{ t('download.settingsPanel.open') }}
                      </n-tooltip>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <button
                            class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                            @click="handleDelete(item)"
                          >
                            <i class="ri-delete-bin-line" />
                          </button>
                        </template>
                        {{ t('common.delete') }}
                      </n-tooltip>
                    </div>
                  </div>
                </div>
                <!-- 未渲染项占位 -->
                <div
                  v-if="downloadedPlaceholderHeight > 0"
                  :style="{ height: downloadedPlaceholderHeight + 'px' }"
                />
              </div>
            </n-spin>
          </div>
        </section>
      </div>
    </n-scrollbar>

    <!-- 删除确认对话框 -->
    <n-modal
      v-model:show="showDeleteConfirm"
      preset="dialog"
      type="warning"
      :title="t('download.delete.title')"
      :content="
        t('download.delete.message', {
          filename: itemToDelete?.displayName || itemToDelete?.filename
        })
      "
      :positive-text="t('download.delete.confirm')"
      :negative-text="t('download.delete.cancel')"
      @positive-click="confirmDelete"
    />

    <!-- 清空确认对话框 -->
    <n-modal
      v-model:show="showClearConfirm"
      preset="dialog"
      type="error"
      :title="t('download.clear.title')"
      :content="t('download.clear.message')"
      :positive-text="t('download.clear.confirm')"
      :negative-text="t('download.clear.cancel')"
      @positive-click="clearDownloadRecords"
    />

    <!-- 未保存下载设置确认对话框 -->
    <n-modal
      v-model:show="showNotSaveConfirm"
      preset="dialog"
      type="warning"
      :z-index="3200"
      :title="t('download.save.title')"
      :content="t('download.save.message')"
      :positive-text="t('download.save.confirm')"
      :negative-text="t('download.save.discard')"
      @positive-click="saveDownloadSettings"
      @negative-click="discardDownloadSettings"
    >
      <template #action>
        <n-button @click="showNotSaveConfirm = false">{{ t('download.save.cancel') }}</n-button>
        <n-button type="error" @click="discardDownloadSettings">{{
          t('download.save.discard')
        }}</n-button>
        <n-button type="primary" @click="saveDownloadSettings">{{
          t('download.save.confirm')
        }}</n-button>
      </template>
    </n-modal>

    <!-- 下载设置抽屉 -->
    <n-drawer
      :show="showSettingsDrawer"
      :width="400"
      placement="right"
      :z-index="3100"
      @update:show="handleDrawerUpdate"
    >
      <n-drawer-content :title="t('download.settingsPanel.title')" closable>
        <div class="download-settings-content space-y-8 py-4">
          <!-- Path Section -->
          <div class="setting-group">
            <h3 class="text-sm font-bold text-neutral-900 dark:text-white mb-2">
              {{ t('download.settingsPanel.path') }}
            </h3>
            <p class="text-xs text-neutral-500 mb-4">{{ t('download.settingsPanel.pathDesc') }}</p>
            <div class="space-y-3">
              <n-input :value="downloadSettings.path" readonly placeholder="Select path..." />
              <div class="flex gap-2">
                <n-button class="flex-1" @click="selectDownloadPath">{{
                  t('download.settingsPanel.select')
                }}</n-button>
                <n-button class="flex-1" @click="openDownloadPath">{{
                  t('download.settingsPanel.open')
                }}</n-button>
              </div>
            </div>
          </div>

          <!-- Save Lyric File -->
          <div class="setting-group">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-neutral-900 dark:text-white">
                  {{ t('download.settingsPanel.saveLyric') }}
                </h3>
                <p class="text-xs text-neutral-500 mt-1">
                  {{ t('download.settingsPanel.saveLyricDesc') }}
                </p>
              </div>
              <n-switch v-model:value="downloadSettings.saveLyric" />
            </div>
          </div>

          <!-- Concurrency Section -->
          <div class="setting-group">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-neutral-900 dark:text-white">
                  {{ t('download.settingsPanel.concurrency') }}
                </h3>
                <p class="text-xs text-neutral-500 mt-1">
                  {{ t('download.settingsPanel.concurrencyDesc') }}
                </p>
              </div>
              <n-input-number
                :value="downloadStore.settings.maxConcurrent"
                :min="1"
                :max="5"
                size="small"
                class="w-24"
                @update:value="(v: number | null) => downloadStore.updateConcurrency(v || 3)"
              />
            </div>
          </div>

          <!-- Format Section -->
          <div class="setting-group">
            <h3 class="text-sm font-bold text-neutral-900 dark:text-white mb-2">
              {{ t('download.settingsPanel.fileFormat') }}
            </h3>
            <p class="text-xs text-neutral-500 mb-4">
              {{ t('download.settingsPanel.fileFormatDesc') }}
            </p>

            <div class="space-y-4">
              <div class="flex flex-wrap gap-2">
                <n-button
                  v-for="preset in [
                    { label: 'songArtist', value: '{songName} - {artistName}' },
                    { label: 'artistSong', value: '{artistName} - {songName}' },
                    { label: 'songOnly', value: '{songName}' }
                  ]"
                  :key="preset.label"
                  size="small"
                  :type="downloadSettings.nameFormat === preset.value ? 'primary' : 'default'"
                  @click="downloadSettings.nameFormat = preset.value"
                >
                  {{ t(`download.settingsPanel.presets.${preset.label}`) }}
                </n-button>
              </div>

              <div>
                <p class="text-[10px] text-neutral-400 mb-2 uppercase font-bold">
                  {{ t('download.settingsPanel.separator') }}
                </p>
                <div class="flex items-center gap-2">
                  <n-button
                    v-for="sep in [' - ', '_', ' ']"
                    :key="sep"
                    size="small"
                    :type="downloadSettings.separator === sep ? 'primary' : 'default'"
                    @click="downloadSettings.separator = sep"
                  >
                    {{ sep === ' ' ? 'Space' : sep }}
                  </n-button>
                  <n-input v-model:value="downloadSettings.separator" size="small" class="w-20" />
                </div>
              </div>

              <div>
                <p class="text-[10px] text-neutral-400 mb-2 uppercase font-bold">
                  {{ t('download.settingsPanel.dragToArrange') }}
                </p>
                <div class="space-y-2">
                  <div
                    v-for="(comp, idx) in formatComponents"
                    :key="comp.id"
                    class="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                  >
                    <span class="text-xs">{{
                      t(`download.settingsPanel.components.${comp.type}`)
                    }}</span>
                    <div class="flex items-center gap-1">
                      <n-button
                        quaternary
                        circle
                        size="tiny"
                        :disabled="idx === 0"
                        @click="handleMoveUp(idx)"
                        ><i class="ri-arrow-up-s-line"
                      /></n-button>
                      <n-button
                        quaternary
                        circle
                        size="tiny"
                        :disabled="idx === formatComponents.length - 1"
                        @click="handleMoveDown(idx)"
                        ><i class="ri-arrow-down-s-line"
                      /></n-button>
                      <n-button
                        quaternary
                        circle
                        size="tiny"
                        :disabled="formatComponents.length <= 1"
                        @click="removeFormatComponent(idx)"
                        ><i class="ri-close-line"
                      /></n-button>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 mt-2">
                    <n-button
                      v-for="type in ['songName', 'artistName', 'albumName']"
                      :key="type"
                      size="tiny"
                      :disabled="formatComponents.some((c) => c.type === type)"
                      @click="addFormatComponent(type)"
                    >
                      + {{ t(`download.settingsPanel.components.${type}`) }}
                    </n-button>
                  </div>
                </div>
              </div>

              <div
                class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800"
              >
                <p class="text-[10px] text-neutral-400 mb-1 uppercase font-bold">
                  {{ t('download.settingsPanel.preview') }}
                </p>
                <p class="text-sm font-medium text-primary truncate">{{ formatNamePreview }}</p>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <n-button type="primary" block @click="saveDownloadSettings">{{
            t('common.save')
          }}</n-button>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useProgressiveRender } from '@/hooks/useProgressiveRender';
import { useDownloadStore } from '@/store/modules/download';
import { usePlayerStore } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';

import type { DownloadTask } from '../../../shared/download';

const { t } = useI18n();
const playerStore = usePlayerStore();
const downloadStore = useDownloadStore();
const message = useMessage();
const scrollbarRef = ref();

const completedList = computed(() => downloadStore.completedList);

const {
  renderedItems: renderedDownloaded,
  placeholderHeight: downloadedPlaceholderHeight,
  contentPaddingBottom,
  handleScroll: handleDownloadScroll
} = useProgressiveRender({
  items: completedList,
  itemHeight: 72,
  listSelector: '.downloaded-list-section',
  initialCount: 40
});

const tabName = ref(downloadStore.downloadingList.length > 0 ? 'downloading' : 'downloaded');

// ── Status helpers ──────────────────────────────────────────────────────────

const getStatusText = (item: DownloadTask) => {
  const statusMap: Record<string, string> = {
    queued: t('download.status.queued'),
    downloading: t('download.status.downloading'),
    paused: t('download.status.paused'),
    completed: t('download.status.completed'),
    error: t('download.status.failed'),
    cancelled: t('download.status.cancelled')
  };
  return statusMap[item.state] || t('download.status.unknown');
};

const getStatusClass = (item: DownloadTask) => {
  const classMap: Record<string, string> = {
    queued: 'text-neutral-400',
    downloading: 'text-primary',
    paused: 'text-yellow-500',
    error: 'text-red-500',
    cancelled: 'text-neutral-400'
  };
  return classMap[item.state] || 'text-neutral-400';
};

const getProgressClass = (item: DownloadTask) => {
  if (item.state === 'error') return 'bg-red-500';
  if (item.state === 'paused') return 'bg-yellow-500';
  return 'bg-primary';
};

// ── Task action handlers ────────────────────────────────────────────────────

const handlePause = (taskId: string) => downloadStore.pauseTask(taskId);
const handleResume = (taskId: string) => downloadStore.resumeTask(taskId);
const handleCancel = (taskId: string) => downloadStore.cancelTask(taskId);

const handleCoverError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/images/default_cover.png';
};

// ── Utility functions ───────────────────────────────────────────────────────

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
};

const copyPath = (path: string) => {
  navigator.clipboard
    .writeText(path)
    .then(() => {
      message.success(t('download.path.copied'));
    })
    .catch((err) => {
      console.error('复制失败:', err);
      message.error(t('download.path.copyFailed'));
    });
};

const shortenPath = (path: string) => {
  if (!path) return '';
  const parts = path.split(/[/\\]/);
  const fileName = parts.pop() || '';
  if (path.length < 30) return path;
  if (parts.length <= 2) return path;
  const start = parts.slice(0, 1).join('/');
  const end = parts.slice(-1).join('/');
  return `${start}/.../${end}/${fileName}`;
};

const getLocalFilePath = (path: string) => {
  if (!path) return '';
  return `local:///${encodeURIComponent(path)}`;
};

const openDirectory = (path: string) => {
  window.electron.ipcRenderer.send('open-directory', path);
};

// ── Play music ──────────────────────────────────────────────────────────────

const handlePlayMusic = async (item: any) => {
  try {
    const filePath = item.path || item.filePath;
    const fileExists = await window.electron.ipcRenderer.invoke('check-file-exists', filePath);

    if (!fileExists) {
      message.error(t('download.delete.fileNotFound', { name: item.displayName || item.filename }));
      return;
    }

    const song: SongResult = {
      id: item.id,
      name: item.displayName || item.filename,
      ar:
        item.ar?.map((a: { name: string }) => ({
          id: 0,
          name: a.name,
          picId: 0,
          img1v1Id: 0,
          briefDesc: '',
          picUrl: '',
          img1v1Url: '',
          albumSize: 0,
          alias: [],
          trans: '',
          musicSize: 0,
          topicPerson: 0
        })) || [],
      al: {
        name: item.filename,
        id: 0,
        picUrl: item.picUrl,
        pic: 0,
        picId: 0
      } as any,
      picUrl: item.picUrl,
      playMusicUrl: getLocalFilePath(filePath),
      source: 'netease' as 'netease',
      count: 0
    };

    await playerStore.setPlay(song);
    playerStore.setPlayMusic(true);
    playerStore.setIsPlay(true);

    message.success(t('download.playStarted', { name: item.displayName || item.filename }));
  } catch (error) {
    console.error('播放音乐失败:', error);
    message.error(t('download.playFailed', { name: item.displayName || item.filename }));
  }
};

// ── Delete / Clear ──────────────────────────────────────────────────────────

const showDeleteConfirm = ref(false);
const itemToDelete = ref<any>(null);

const handleDelete = (item: any) => {
  itemToDelete.value = item;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  const item = itemToDelete.value;
  if (!item) return;

  try {
    const filePath = item.path || item.filePath;
    await downloadStore.deleteCompleted(filePath);
    message.success(t('download.delete.success'));
  } catch (error) {
    console.error('Failed to delete music:', error);
    message.warning(t('download.delete.recordRemoved'));
  } finally {
    showDeleteConfirm.value = false;
    itemToDelete.value = null;
  }
};

const showClearConfirm = ref(false);

const clearDownloadRecords = async () => {
  try {
    await downloadStore.clearCompleted();
    message.success(t('download.clear.success'));
  } catch (error) {
    console.error('Failed to clear download records:', error);
    message.error(t('download.clear.failed'));
  } finally {
    showClearConfirm.value = false;
  }
};

// ── Download settings ───────────────────────────────────────────────────────

const showSettingsDrawer = ref(false);
const showNotSaveConfirm = ref(false);
const downloadSettings = ref({
  path: '',
  nameFormat: '{songName} - {artistName}',
  separator: ' - ',
  saveLyric: false
});
const originalDownloadSettings = ref({ ...downloadSettings.value });

watch(showSettingsDrawer, (newVal) => {
  if (newVal) {
    originalDownloadSettings.value = { ...downloadSettings.value };
  }
});

const handleDrawerUpdate = (show: boolean) => {
  if (show) {
    showSettingsDrawer.value = true;
    return;
  }
  const isModified =
    JSON.stringify(downloadSettings.value) !== JSON.stringify(originalDownloadSettings.value);
  if (isModified) {
    showNotSaveConfirm.value = true;
  } else {
    showSettingsDrawer.value = false;
  }
};

const discardDownloadSettings = () => {
  downloadSettings.value = { ...originalDownloadSettings.value };
  showNotSaveConfirm.value = false;
  showSettingsDrawer.value = false;
};

const formatComponents = ref([
  { id: 1, type: 'songName' },
  { id: 2, type: 'artistName' }
]);

const handleMoveUp = (index: number) => {
  if (index > 0) {
    const temp = formatComponents.value.splice(index, 1)[0];
    formatComponents.value.splice(index - 1, 0, temp);
  }
};

const handleMoveDown = (index: number) => {
  if (index < formatComponents.value.length - 1) {
    const temp = formatComponents.value.splice(index, 1)[0];
    formatComponents.value.splice(index + 1, 0, temp);
  }
};

const addFormatComponent = (type: string) => {
  if (!formatComponents.value.some((item) => item.type === type)) {
    formatComponents.value.push({
      id: Date.now(),
      type
    });
  }
};

const removeFormatComponent = (index: number) => {
  formatComponents.value.splice(index, 1);
};

watch(
  formatComponents,
  (newComponents) => {
    let format = '';
    newComponents.forEach((component, index) => {
      format += `{${component.type}}`;
      if (index < newComponents.length - 1) {
        format += downloadSettings.value.separator;
      }
    });
    downloadSettings.value.nameFormat = format;
  },
  { deep: true }
);

watch(
  () => downloadSettings.value.separator,
  (newSeparator) => {
    if (formatComponents.value.length > 1) {
      let format = '';
      formatComponents.value.forEach((component, index) => {
        format += `{${component.type}}`;
        if (index < formatComponents.value.length - 1) {
          format += newSeparator;
        }
      });
      downloadSettings.value.nameFormat = format;
    }
  }
);

const formatNamePreview = computed(() => {
  const format = downloadSettings.value.nameFormat;
  return format
    .replace(/\{songName\}/g, '莫失莫忘')
    .replace(/\{artistName\}/g, '香蜜沉沉烬如霜')
    .replace(/\{albumName\}/g, '电视剧原声带');
});

const selectDownloadPath = async () => {
  const result = await window.electron.ipcRenderer.invoke('select-directory');
  if (result && !result.canceled && result.filePaths.length > 0) {
    downloadSettings.value.path = result.filePaths[0];
  }
};

const openDownloadPath = () => {
  if (downloadSettings.value.path) {
    window.electron.ipcRenderer.send('open-directory', downloadSettings.value.path);
  } else {
    message.warning(t('download.settingsPanel.noPathSelected'));
  }
};

const saveDownloadSettings = () => {
  window.electron.ipcRenderer.send(
    'set-store-value',
    'set.downloadPath',
    downloadSettings.value.path
  );
  window.electron.ipcRenderer.send(
    'set-store-value',
    'set.downloadNameFormat',
    downloadSettings.value.nameFormat
  );
  window.electron.ipcRenderer.send(
    'set-store-value',
    'set.downloadSeparator',
    downloadSettings.value.separator
  );
  window.electron.ipcRenderer.send(
    'set-store-value',
    'set.downloadSaveLyric',
    downloadSettings.value.saveLyric
  );

  if (tabName.value === 'downloaded') {
    downloadStore.refreshCompleted();
  }

  originalDownloadSettings.value = { ...downloadSettings.value };
  message.success(t('download.settingsPanel.saveSuccess'));
  showNotSaveConfirm.value = false;
  showSettingsDrawer.value = false;
};

const initDownloadSettings = async () => {
  const path = await window.electron.ipcRenderer.invoke('get-store-value', 'set.downloadPath');
  const nameFormat = await window.electron.ipcRenderer.invoke(
    'get-store-value',
    'set.downloadNameFormat'
  );
  const separator = await window.electron.ipcRenderer.invoke(
    'get-store-value',
    'set.downloadSeparator'
  );
  const saveLyric = await window.electron.ipcRenderer.invoke(
    'get-store-value',
    'set.downloadSaveLyric'
  );

  downloadSettings.value = {
    path: path || (await window.electron.ipcRenderer.invoke('get-downloads-path')),
    nameFormat: nameFormat || '{songName} - {artistName}',
    separator: separator || ' - ',
    saveLyric: saveLyric || false
  };

  updateFormatComponents();
};

const updateFormatComponents = () => {
  const format = downloadSettings.value.nameFormat;
  const matches = Array.from(format.matchAll(/\{(\w+)\}/g));

  if (matches.length === 0) {
    formatComponents.value = [
      { id: 1, type: 'songName' },
      { id: 2, type: 'artistName' }
    ];
    return;
  }

  formatComponents.value = matches.map((match, index) => ({
    id: index + 1,
    type: match[1]
  }));
};

watch(() => downloadSettings.value.nameFormat, updateFormatComponents);

// ── Lifecycle & watchers ────────────────────────────────────────────────────

onMounted(() => {
  downloadStore.initListeners();
  downloadStore.loadPersistedQueue();
  downloadStore.refreshCompleted();
  initDownloadSettings();
});

watch(
  () => tabName.value,
  (newVal) => {
    if (newVal === 'downloaded') {
      downloadStore.refreshCompleted();
    }
  }
);

watch(
  () => downloadStore.totalProgress,
  (newVal) => {
    if (newVal === 100) {
      downloadStore.refreshCompleted();
    }
  }
);
</script>

<style lang="scss" scoped>
.download-page {
  position: relative;
}

.hero-section {
  min-height: 240px;
}

.animate-item {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.downloading-item,
.downloaded-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
