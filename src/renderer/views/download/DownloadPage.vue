<template>
  <div class="download-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('download.title') }}</h1>
      <div class="flex items-center gap-3">
        <n-button size="small" @click="showSettingsDrawer = true">
          <template #icon><i class="iconfont ri-settings-3-line"></i></template>
          {{ t('download.settings') }}
        </n-button>
        <div class="segment-control">
          <div
            class="segment-item"
            :class="{ active: tabName === 'downloading' }"
            @click="tabName = 'downloading'"
          >
            {{ t('download.tabs.downloading') }}
          </div>
          <div
            class="segment-item"
            :class="{ active: tabName === 'downloaded' }"
            @click="tabName = 'downloaded'"
          >
            {{ t('download.tabs.downloaded') }}
          </div>
        </div>
      </div>
    </div>

    <div class="page-content">
      <!-- 下载列表 -->
      <div v-show="tabName === 'downloading'" class="tab-content">
        <div class="download-list">
          <div v-if="downloadList.length === 0" class="empty-state">
            <div class="empty-icon">
              <i class="iconfont ri-download-cloud-2-line"></i>
            </div>
            <h3 class="empty-title">{{ t('download.empty.noTasks') }}</h3>
          </div>
          <template v-else>
            <div class="total-progress">
              <div class="progress-header">
                <div class="progress-title">
                  {{ t('download.progress.total', { progress: totalProgress.toFixed(1) }) }}
                </div>
                <div class="progress-info">{{ downloadList.length }} {{ t('download.items') }}</div>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${totalProgress}%` }"></div>
                </div>
              </div>
            </div>

            <div class="download-items">
              <div v-for="item in downloadList" :key="item.path" class="download-item">
                <div class="item-left flex items-center gap-3">
                  <div class="item-cover">
                    <img :src="getImgUrl(item.songInfo?.picUrl, '200y200')" alt="Cover" />
                  </div>
                  <div class="item-info flex items-center gap-4 w-full">
                    <div
                      class="item-name min-w-[160px] max-w-[160px] truncate"
                      :title="item.filename"
                    >
                      {{ item.filename }}
                    </div>
                    <div class="item-artist min-w-[120px] max-w-[120px] truncate">
                      {{
                        item.songInfo?.ar?.map((a) => a.name).join(', ') ||
                        t('download.artist.unknown')
                      }}
                    </div>
                    <div class="item-progress flex-1 min-w-0">
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          :class="[`status-${item.status}`]"
                          :style="{ width: `${item.progress}%` }"
                        ></div>
                      </div>
                    </div>
                    <div class="item-details min-w-[120px] max-w-[120px] flex flex-col items-end">
                      <span class="item-size">
                        {{ formatSize(item.loaded) }} / {{ formatSize(item.total) }}
                      </span>
                      <span class="item-status-badge" :class="[`status-${item.status}`]">
                        {{ getStatusText(item) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 已下载列表 -->
      <div v-show="tabName === 'downloaded'" class="tab-content">
        <div class="downloaded-list">
          <div v-if="isLoadingDownloaded" class="loading-state">
            <div class="spinner"></div>
            <span class="loading-text">{{ t('download.loading') }}</span>
          </div>
          <div v-else-if="downloadedList.length === 0" class="empty-state">
            <div class="empty-icon">
              <i class="iconfont ri-inbox-archive-line"></i>
            </div>
            <h3 class="empty-title">{{ t('download.empty.noDownloaded') }}</h3>
            <p class="empty-text">{{ t('download.empty.noDownloadedHint') }}</p>
          </div>
          <template v-else>
            <div class="downloaded-header">
              <div class="header-info">
                <i class="iconfont ri-archive-line"></i>
                <span>{{ t('download.count', { count: downloadedList.length }) }}</span>
              </div>
              <button class="clear-button" @click="showClearConfirm = true">
                <i class="iconfont ri-delete-bin-line"></i>
                <span>{{ t('download.clearAll') }}</span>
              </button>
            </div>

            <div class="downloaded-items">
              <div v-for="item in downList" :key="item.path" class="downloaded-item">
                <div class="item-cover">
                  <img :src="getImgUrl(item.picUrl, '200y200')" alt="Cover" />
                </div>
                <div class="item-info flex items-center gap-4 w-full">
                  <div
                    class="item-name min-w-[160px] max-w-[160px] truncate"
                    :title="item.displayName || item.filename"
                  >
                    {{ item.displayName || item.filename }}
                  </div>
                  <div
                    class="item-artist min-w-[120px] max-w-[120px] flex items-center gap-1 truncate"
                  >
                    <i class="iconfont ri-user-line"></i>
                    <span>{{ item.ar?.map((a) => a.name).join(', ') }}</span>
                  </div>
                  <div class="item-size min-w-[80px] max-w-[80px] flex items-center gap-1">
                    <i class="iconfont ri-file-line"></i>
                    <span>{{ formatSize(item.size) }}</span>
                  </div>
                  <div
                    class="item-path min-w-[220px] max-w-[220px] flex items-center gap-1"
                    :title="item.path"
                  >
                    <i class="iconfont ri-folder-path-line"></i>
                    <span>{{ shortenPath(item.path) }}</span>
                    <button class="copy-button" @click="copyPath(item.path)">
                      <i class="iconfont ri-file-copy-line"></i>
                    </button>
                  </div>
                  <div class="item-actions flex gap-1 ml-2">
                    <button class="action-btn play" @click="handlePlayMusic(item)">
                      <i class="iconfont ri-play-circle-line"></i>
                    </button>
                    <button class="action-btn open" @click="openDirectory(item.path)">
                      <i class="iconfont ri-folder-open-line"></i>
                    </button>
                    <button class="action-btn delete" @click="handleDelete(item)">
                      <i class="iconfont ri-delete-bin-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- 删除确认对话框 -->
  <div class="modal-overlay" v-if="showDeleteConfirm" @click="showDeleteConfirm = false">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <i class="iconfont ri-error-warning-line"></i>
        <span>{{ t('download.delete.title') }}</span>
      </div>
      <div class="modal-body">
        {{
          t('download.delete.message', {
            filename: itemToDelete?.displayName || itemToDelete?.filename
          })
        }}
      </div>
      <div class="modal-footer">
        <button class="modal-btn cancel" @click="showDeleteConfirm = false">
          {{ t('download.delete.cancel') }}
        </button>
        <button class="modal-btn confirm" @click="confirmDelete">
          {{ t('download.delete.confirm') }}
        </button>
      </div>
    </div>
  </div>

  <!-- 清空确认对话框 -->
  <div class="modal-overlay" v-if="showClearConfirm" @click="showClearConfirm = false">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <i class="iconfont ri-delete-bin-line"></i>
        <span>{{ t('download.clear.title') }}</span>
      </div>
      <div class="modal-body">
        {{ t('download.clear.message') }}
      </div>
      <div class="modal-footer">
        <button class="modal-btn cancel" @click="showClearConfirm = false">
          {{ t('download.clear.cancel') }}
        </button>
        <button class="modal-btn confirm" @click="clearDownloadRecords">
          {{ t('download.clear.confirm') }}
        </button>
      </div>
    </div>
  </div>

  <!-- 下载设置抽屉 -->
  <n-drawer v-model:show="showSettingsDrawer" :width="380" placement="right" :z-index="999999999">
    <n-drawer-content :native-scrollbar="false">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="text-lg font-bold">{{ t('download.settingsPanel.title') }}</div>
          <n-button type="primary" @click="saveDownloadSettings">
            {{ t('common.save') }}
          </n-button>
        </div>
      </template>
      <div class="download-settings">
        <!-- 下载路径设置 -->
        <div class="setting-item">
          <div class="setting-title">{{ t('download.settingsPanel.path') }}</div>
          <div class="setting-desc">{{ t('download.settingsPanel.pathDesc') }}</div>
          <div class="flex flex-col gap-2 mt-2">
            <n-input
              v-model:value="downloadSettings.path"
              :placeholder="t('download.settingsPanel.pathPlaceholder')"
              readonly
              class="flex-1"
            />
            <div class="flex items-center gap-2">
              <n-button class="flex-1" @click="selectDownloadPath">{{
                t('download.settingsPanel.select')
              }}</n-button>
              <n-button class="flex-1" @click="openDownloadPath">
                {{ t('download.settingsPanel.open') }}
                <i class="iconfont ri-folder-open-line"></i>
              </n-button>
            </div>
          </div>
        </div>

        <!-- 文件名格式设置 -->
        <div class="setting-item">
          <div class="setting-title">{{ t('download.settingsPanel.fileFormat') }}</div>
          <div class="setting-desc">{{ t('download.settingsPanel.fileFormatDesc') }}</div>

          <!-- 预设模板 -->
          <div class="flex gap-2 my-2">
            <n-button
              size="small"
              :type="
                downloadSettings.nameFormat === '{songName} - {artistName}' ? 'primary' : 'default'
              "
              @click="downloadSettings.nameFormat = '{songName} - {artistName}'"
            >
              {{ t('download.settingsPanel.presets.songArtist') }}
            </n-button>
            <n-button
              size="small"
              :type="
                downloadSettings.nameFormat === '{artistName} - {songName}' ? 'primary' : 'default'
              "
              @click="downloadSettings.nameFormat = '{artistName} - {songName}'"
            >
              {{ t('download.settingsPanel.presets.artistSong') }}
            </n-button>
            <n-button
              size="small"
              :type="downloadSettings.nameFormat === '{songName}' ? 'primary' : 'default'"
              @click="downloadSettings.nameFormat = '{songName}'"
            >
              {{ t('download.settingsPanel.presets.songOnly') }}
            </n-button>
          </div>

          <!-- 分隔符设置 -->
          <div class="my-3">
            <div class="text-sm text-gray-500 mb-2">
              {{ t('download.settingsPanel.separator') || '分隔符' }}
            </div>
            <div class="flex items-center gap-2">
              <n-button
                size="small"
                :type="downloadSettings.separator === ' - ' ? 'primary' : 'default'"
                @click="downloadSettings.separator = ' - '"
              >
                {{ t('download.settingsPanel.separators.dash') || '空格-空格' }}
              </n-button>
              <n-button
                size="small"
                :type="downloadSettings.separator === '_' ? 'primary' : 'default'"
                @click="downloadSettings.separator = '_'"
              >
                {{ t('download.settingsPanel.separators.underscore') || '下划线' }}
              </n-button>
              <n-button
                size="small"
                :type="downloadSettings.separator === ' ' ? 'primary' : 'default'"
                @click="downloadSettings.separator = ' '"
              >
                {{ t('download.settingsPanel.separators.space') || '空格' }}
              </n-button>
              <n-input
                v-model:value="downloadSettings.separator"
                size="small"
                style="width: 100px"
                placeholder="自定义"
              />
            </div>
          </div>

          <!-- 组件排序 -->
          <div class="my-3">
            <div class="text-sm text-gray-500 mb-2">
              {{ t('download.settingsPanel.dragToArrange') }}
            </div>
            <div class="format-components">
              <div
                v-for="(component, index) in formatComponents"
                :key="component.id"
                class="format-item"
              >
                <div class="flex items-center justify-between w-full">
                  <span>{{ t(`download.settingsPanel.components.${component.type}`) }}</span>
                  <div class="flex items-center">
                    <n-button
                      quaternary
                      circle
                      size="small"
                      @click="handleMoveUp(index)"
                      :disabled="index === 0"
                    >
                      <template #icon><i class="iconfont ri-arrow-up-s-line"></i></template>
                    </n-button>
                    <n-button
                      quaternary
                      circle
                      size="small"
                      @click="handleMoveDown(index)"
                      :disabled="index === formatComponents.length - 1"
                    >
                      <template #icon><i class="iconfont ri-arrow-down-s-line"></i></template>
                    </n-button>
                    <n-button
                      quaternary
                      circle
                      size="small"
                      @click="removeFormatComponent(index)"
                      :disabled="formatComponents.length <= 1"
                    >
                      <template #icon><i class="iconfont ri-close-line"></i></template>
                    </n-button>
                  </div>
                </div>
              </div>
              <div class="mt-2 flex gap-2">
                <n-button
                  size="small"
                  @click="addFormatComponent('songName')"
                  :disabled="formatComponents.some((c) => c.type === 'songName')"
                >
                  +{{ t('download.settingsPanel.components.songName') }}
                </n-button>
                <n-button
                  size="small"
                  @click="addFormatComponent('artistName')"
                  :disabled="formatComponents.some((c) => c.type === 'artistName')"
                >
                  +{{ t('download.settingsPanel.components.artistName') }}
                </n-button>
                <n-button
                  size="small"
                  @click="addFormatComponent('albumName')"
                  :disabled="formatComponents.some((c) => c.type === 'albumName')"
                >
                  +{{ t('download.settingsPanel.components.albumName') }}
                </n-button>
              </div>
            </div>
          </div>

          <!-- 自定义格式 -->
          <div class="my-3">
            <div class="text-sm text-gray-500 mb-2">
              {{ t('download.settingsPanel.customFormat') }}
            </div>
            <n-input
              v-model:value="downloadSettings.nameFormat"
              placeholder="{artistName} - {songName} - {albumName}"
            />
          </div>

          <div class="mt-2 text-xs text-amber-500">
            <i class="iconfont ri-information-line"></i>
            {{ t('download.settingsPanel.formatVariables') }}:<br />
            {songName}, {artistName}, {albumName}
          </div>

          <!-- 预览 -->
          <div class="format-preview mt-3 bg-gray-100 dark:bg-dark-300 p-2 rounded">
            <div class="text-xs text-gray-500 mb-1">{{ t('download.settingsPanel.preview') }}</div>
            <div class="preview-content">{{ formatNamePreview }}</div>
          </div>
        </div>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getMusicDetail } from '@/api/music';
import { usePlayerStore } from '@/store/modules/player';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';

const { t } = useI18n();
const playerStore = usePlayerStore();
const message = useMessage();

interface DownloadItem {
  filename: string;
  progress: number;
  loaded: number;
  total: number;
  path: string;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
  songInfo?: any;
}

interface DownloadedItem {
  filename: string;
  path: string;
  size: number;
  id: number;
  picUrl: string;
  ar: { name: string }[];
  displayName?: string;
}
const tabName = ref('downloading');

const downloadList = ref<DownloadItem[]>([]);
const downloadedList = ref<DownloadedItem[]>(
  JSON.parse(localStorage.getItem('downloadedList') || '[]')
);

const downList = computed(() => downloadedList.value);

// 计算总进度
const totalProgress = computed(() => {
  if (downloadList.value.length === 0) return 0;
  const total = downloadList.value.reduce((sum, item) => sum + item.progress, 0);
  return total / downloadList.value.length;
});

watch(totalProgress, (newVal) => {
  if (newVal === 100) {
    refreshDownloadedList();
  }
});

// 获取状态文本
const getStatusText = (item: DownloadItem) => {
  switch (item.status) {
    case 'downloading':
      return t('download.status.downloading');
    case 'completed':
      return t('download.status.completed');
    case 'error':
      return t('download.status.failed');
    default:
      return t('download.status.unknown');
  }
};

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
};

// 复制文件路径
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

// 格式化路径
const shortenPath = (path: string) => {
  if (!path) return '';

  // 获取文件名和目录
  const parts = path.split(/[/\\]/);
  const fileName = parts.pop() || '';

  // 如果路径很短，直接返回
  if (path.length < 30) return path;

  // 保留开头的部分目录和结尾的文件名
  if (parts.length <= 2) return path;

  const start = parts.slice(0, 1).join('/');
  const end = parts.slice(-1).join('/');

  return `${start}/.../${end}/${fileName}`;
};

// 获取本地文件URL
const getLocalFilePath = (path: string) => {
  if (!path) return '';
  // 确保URL格式正确
  return `local:///${encodeURIComponent(path)}`;
};

// 打开目录
const openDirectory = (path: string) => {
  window.electron.ipcRenderer.send('open-directory', path);
};

// 播放音乐
const handlePlayMusic = async (item: DownloadedItem) => {
  try {
    // 先检查文件是否存在
    const fileExists = await window.electron.ipcRenderer.invoke('check-file-exists', item.path);

    if (!fileExists) {
      message.error(t('download.delete.fileNotFound', { name: item.displayName || item.filename }));
      return;
    }

    // 转换下载项为播放所需的歌曲对象
    const song: SongResult = {
      id: item.id,
      name: item.displayName || item.filename,
      ar:
        item.ar?.map((a) => ({
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
      // 使用本地文件协议
      playMusicUrl: getLocalFilePath(item.path),
      source: 'netease' as 'netease',
      count: 0
    };

    console.log('开始播放本地音乐:', song.name, '路径:', song.playMusicUrl);

    // 播放歌曲
    await playerStore.setPlay(song);
    playerStore.setPlayMusic(true);
    playerStore.setIsPlay(true);

    message.success(t('download.playStarted', { name: item.displayName || item.filename }));
  } catch (error) {
    console.error('播放音乐失败:', error);
    message.error(t('download.playFailed', { name: item.displayName || item.filename }));
  }
};

// 删除相关
const showDeleteConfirm = ref(false);
const itemToDelete = ref<DownloadedItem | null>(null);

// 处理删除点击
const handleDelete = (item: DownloadedItem) => {
  itemToDelete.value = item;
  showDeleteConfirm.value = true;
};

// 确认删除
const confirmDelete = async () => {
  const item = itemToDelete.value;
  if (!item) return;

  try {
    const success = await window.electron.ipcRenderer.invoke('delete-downloaded-music', item.path);

    if (success) {
      const newList = downloadedList.value.filter((i) => i.id !== item.id);
      downloadedList.value = newList;
      localStorage.setItem('downloadedList', JSON.stringify(newList));
      message.success(t('download.delete.success'));
    } else {
      message.warning(t('download.delete.fileNotFound'));
    }
  } catch (error) {
    console.error('Failed to delete music:', error);
    message.warning(t('download.delete.recordRemoved'));
  } finally {
    showDeleteConfirm.value = false;
    itemToDelete.value = null;
  }
};

// 清空下载记录相关
const showClearConfirm = ref(false);

// 清空下载记录
const clearDownloadRecords = async () => {
  try {
    downloadedList.value = [];
    localStorage.setItem('downloadedList', '[]');
    await window.electron.ipcRenderer.invoke('clear-downloaded-music');
    message.success(t('download.clear.success'));
  } catch (error) {
    console.error('Failed to clear download records:', error);
    message.error(t('download.clear.failed'));
  } finally {
    showClearConfirm.value = false;
  }
};

// 添加加载状态
const isLoadingDownloaded = ref(false);

// 格式化歌曲名称，应用用户设置的格式
const formatSongName = (songInfo) => {
  if (!songInfo) return '';

  // 获取格式设置
  const nameFormat = downloadSettings.value.nameFormat || '{songName} - {artistName}';

  // 准备替换变量
  const artistName = songInfo.ar?.map((a) => a.name).join('/') || '未知艺术家';
  const songName = songInfo.name || songInfo.filename || '未知歌曲';
  const albumName = songInfo.al?.name || '未知专辑';

  // 应用自定义格式
  return nameFormat
    .replace(/\{songName\}/g, songName)
    .replace(/\{artistName\}/g, artistName)
    .replace(/\{albumName\}/g, albumName);
};

// 获取已下载音乐列表
const refreshDownloadedList = async () => {
  if (isLoadingDownloaded.value) return; // 防止重复加载

  try {
    isLoadingDownloaded.value = true;
    const list = await window.electron.ipcRenderer.invoke('get-downloaded-music');

    if (!Array.isArray(list) || list.length === 0) {
      downloadedList.value = [];
      localStorage.setItem('downloadedList', '[]');
      return;
    }

    const songIds = list.filter((item) => item.id).map((item) => item.id);
    if (songIds.length === 0) {
      // 处理显示格式化文件名
      const updatedList = list.map((item) => ({
        ...item,
        displayName: formatSongName(item) || item.filename
      }));

      downloadedList.value = updatedList;
      localStorage.setItem('downloadedList', JSON.stringify(updatedList));
      return;
    }

    try {
      const detailRes = await getMusicDetail(songIds);
      const songDetails = detailRes.data.songs.reduce((acc, song) => {
        acc[song.id] = song;
        return acc;
      }, {});

      const updatedList = list.map((item) => {
        const songDetail = songDetails[item.id];
        const updatedItem = {
          ...item,
          picUrl: songDetail?.al?.picUrl || item.picUrl || '/images/default_cover.png',
          ar: songDetail?.ar || item.ar || [{ name: t('download.localMusic') }],
          name: songDetail?.name || item.name || item.filename
        };

        // 添加格式化的显示名称
        updatedItem.displayName = formatSongName(updatedItem) || updatedItem.filename;
        return updatedItem;
      });

      downloadedList.value = updatedList;
      localStorage.setItem('downloadedList', JSON.stringify(updatedList));
    } catch (error) {
      console.error('Failed to get music details:', error);
      // 处理显示格式化文件名
      const updatedList = list.map((item) => ({
        ...item,
        displayName: formatSongName(item) || item.filename
      }));

      downloadedList.value = updatedList;
      localStorage.setItem('downloadedList', JSON.stringify(updatedList));
    }
  } catch (error) {
    console.error('Failed to get downloaded music list:', error);
    downloadedList.value = [];
    localStorage.setItem('downloadedList', '[]');
  } finally {
    isLoadingDownloaded.value = false;
  }
};

watch(
  () => tabName.value,
  (newVal) => {
    if (newVal) {
      refreshDownloadedList();
    }
  }
);

// 初始化
onMounted(() => {
  refreshDownloadedList();

  // 记录已处理的下载项，避免重复触发事件
  const processedDownloads = new Set<string>();

  // 监听下载进度
  window.electron.ipcRenderer.on('music-download-progress', (_, data) => {
    const existingItem = downloadList.value.find((item) => item.filename === data.filename);

    // 如果进度为100%，将状态设置为已完成
    if (data.progress === 100) {
      data.status = 'completed';
    }

    if (existingItem) {
      Object.assign(existingItem, {
        ...data,
        songInfo: data.songInfo || existingItem.songInfo
      });

      // 如果下载完成，从列表中移除，但不触发完成通知
      // 通知由 music-download-complete 事件处理
      if (data.status === 'completed') {
        downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
      }
    } else {
      downloadList.value.push({
        ...data,
        songInfo: data.songInfo
      });
    }
  });

  // 监听下载完成
  window.electron.ipcRenderer.on('music-download-complete', async (_, data) => {
    // 如果已经处理过此文件的完成事件，则跳过
    if (processedDownloads.has(data.filename)) {
      return;
    }

    // 标记为已处理
    processedDownloads.add(data.filename);

    // 下载成功处理
    if (data.success) {
      // 从下载列表中移除
      downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);

      // 延迟刷新已下载列表，避免文件系统未完全写入
      setTimeout(() => refreshDownloadedList(), 500);

      // 只在下载页面显示一次下载成功通知
      message.success(t('download.message.downloadComplete', { filename: data.filename }));

      // 避免通知过多占用内存，设置一个超时来清理已处理的标记
      setTimeout(() => {
        processedDownloads.delete(data.filename);
      }, 10000); // 10秒后清除
    } else {
      // 下载失败处理
      const existingItem = downloadList.value.find((item) => item.filename === data.filename);
      if (existingItem) {
        Object.assign(existingItem, {
          status: 'error',
          error: data.error,
          progress: 0
        });
        setTimeout(() => {
          downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
          processedDownloads.delete(data.filename);
        }, 3000);
      }

      message.error(
        t('download.message.downloadFailed', { filename: data.filename, error: data.error })
      );
    }
  });

  // 监听下载队列
  window.electron.ipcRenderer.on('music-download-queued', (_, data) => {
    const existingItem = downloadList.value.find((item) => item.filename === data.filename);
    if (!existingItem) {
      downloadList.value.push({
        filename: data.filename,
        progress: 0,
        loaded: 0,
        total: 0,
        path: '',
        status: 'downloading',
        songInfo: data.songInfo
      });
    }
  });
});

// 下载设置
const showSettingsDrawer = ref(false);
const downloadSettings = ref({
  path: '',
  nameFormat: '{songName} - {artistName}',
  separator: ' - '
});

// 格式组件（用于拖拽排序）
const formatComponents = ref([
  { id: 1, type: 'songName' },
  { id: 2, type: 'artistName' }
]);

// 处理组件排序
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

// 添加新的格式组件
const addFormatComponent = (type: string) => {
  if (!formatComponents.value.some((item) => item.type === type)) {
    formatComponents.value.push({
      id: Date.now(),
      type
    });
  }
};

// 删除格式组件
const removeFormatComponent = (index: number) => {
  formatComponents.value.splice(index, 1);
};

// 监听组件变化更新格式
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

// 监听分隔符变化更新格式
watch(
  () => downloadSettings.value.separator,
  (newSeparator) => {
    if (formatComponents.value.length > 1) {
      // 重新构建格式字符串
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

// 格式名称预览
const formatNamePreview = computed(() => {
  const format = downloadSettings.value.nameFormat;
  return format
    .replace(/\{songName\}/g, '莫失莫忘')
    .replace(/\{artistName\}/g, '香蜜沉沉烬如霜')
    .replace(/\{albumName\}/g, '电视剧原声带');
});

// 选择下载路径
const selectDownloadPath = async () => {
  const result = await window.electron.ipcRenderer.invoke('select-directory');
  if (result && !result.canceled && result.filePaths.length > 0) {
    downloadSettings.value.path = result.filePaths[0];
  }
};

// 打开下载路径
const openDownloadPath = () => {
  if (downloadSettings.value.path) {
    window.electron.ipcRenderer.send('open-directory', downloadSettings.value.path);
  } else {
    message.warning(t('download.settingsPanel.noPathSelected'));
  }
};

// 保存下载设置
const saveDownloadSettings = () => {
  // 保存到配置
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

  // 如果是在已下载页面，刷新列表以更新显示
  if (tabName.value === 'downloaded') {
    refreshDownloadedList();
  }

  message.success(t('download.settingsPanel.saveSuccess'));
  showSettingsDrawer.value = false;
};

// 初始化下载设置
const initDownloadSettings = async () => {
  // 获取当前配置
  const path = await window.electron.ipcRenderer.invoke('get-store-value', 'set.downloadPath');
  const nameFormat = await window.electron.ipcRenderer.invoke(
    'get-store-value',
    'set.downloadNameFormat'
  );
  const separator = await window.electron.ipcRenderer.invoke(
    'get-store-value',
    'set.downloadSeparator'
  );

  downloadSettings.value = {
    path: path || (await window.electron.ipcRenderer.invoke('get-downloads-path')),
    nameFormat: nameFormat || '{songName} - {artistName}',
    separator: separator || ' - '
  };

  // 初始化排序组件
  updateFormatComponents();
};

// 根据格式更新组件
const updateFormatComponents = () => {
  // 提取格式中的变量
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

// 监听格式变化更新组件
watch(() => downloadSettings.value.nameFormat, updateFormatComponents);

// 监听命名格式变化，更新已下载文件的显示名称
watch(
  () => downloadSettings.value.nameFormat,
  () => {
    if (downloadedList.value.length > 0) {
      // 更新所有已下载项的显示名称
      downloadedList.value = downloadedList.value.map((item) => ({
        ...item,
        displayName: formatSongName(item) || item.filename
      }));

      // 保存到本地存储
      localStorage.setItem('downloadedList', JSON.stringify(downloadedList.value));
    }
  }
);

// 初始化
onMounted(() => {
  initDownloadSettings();
});
</script>

<style lang="scss" scoped>
/* macOS style with Neumorphism */
.download-page {
  @apply h-full w-full flex flex-col overflow-hidden;
  @apply bg-gray-50 dark:bg-dark-200;
  @apply text-gray-900 dark:text-gray-100;
}

.page-header {
  @apply px-4 py-3;
  @apply bg-white/90 dark:bg-dark-100/90;
  @apply border-b border-gray-200/50 dark:border-gray-700/50;
  @apply backdrop-blur-xl backdrop-saturate-150;
  @apply sticky top-0 z-10;
  @apply flex items-center justify-between;
}

.page-title {
  @apply text-lg font-medium;
  @apply text-gray-800 dark:text-gray-200;
}

.segment-control {
  @apply flex rounded-lg overflow-hidden;
  @apply bg-gray-100 dark:bg-dark-300;
  @apply w-max;
  @apply border border-gray-200/60 dark:border-gray-700/60;
}

.segment-item {
  @apply px-3 py-1 cursor-pointer text-sm font-medium;
  @apply text-gray-500 dark:text-gray-400;
  @apply transition-all duration-200;
  @apply hover:bg-light-300 dark:hover:bg-dark-300;

  &.active {
    @apply bg-white dark:bg-dark-200;
    @apply text-gray-900 dark:text-gray-100;
    @apply shadow-sm;
  }
}

.page-content {
  @apply flex-1 overflow-hidden;
}

.tab-content {
  @apply h-full overflow-auto pb-16;
}

/* Empty & Loading States */
.empty-state,
.loading-state {
  @apply flex flex-col items-center justify-center h-full;
  @apply py-16;
}

.empty-icon {
  @apply text-4xl mb-3 text-gray-300 dark:text-gray-600;
}

.empty-title {
  @apply text-base font-medium mb-1;
  @apply text-gray-500 dark:text-gray-400;
}

.empty-text {
  @apply text-xs text-gray-400 dark:text-gray-500;
}

.spinner {
  @apply w-8 h-8 rounded-full border border-t-primary;
  @apply animate-spin mb-3;
}

.loading-text {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

/* Progress Bar */
.total-progress {
  @apply px-4 py-3;
  @apply bg-white/90 dark:bg-dark-100/90;
  @apply backdrop-blur-lg backdrop-saturate-150;
  @apply border-b border-gray-200/50 dark:border-gray-700/50;
  @apply sticky top-0 z-10;
}

.progress-header {
  @apply flex justify-between items-center mb-2;
}

.progress-title {
  @apply text-xs font-medium;
  @apply text-gray-700 dark:text-gray-300;
}

.progress-info {
  @apply text-xs;
  @apply text-gray-500 dark:text-gray-400;
}

.progress-bar-wrapper {
  @apply w-full;
}

.progress-bar {
  @apply h-1.5 rounded-full w-full;
  @apply bg-gray-200 dark:bg-dark-300;
  @apply overflow-hidden;
}

.progress-fill {
  @apply h-full rounded-full;
  @apply bg-primary;
  @apply transition-all duration-300;

  &.status-downloading {
    @apply bg-primary;
  }

  &.status-completed {
    @apply bg-green-500;
  }

  &.status-error {
    @apply bg-red-500;
  }
}

/* Download Items */
.download-items {
  @apply p-4 space-y-3;
}

.download-item {
  @apply rounded-lg p-3;
  @apply bg-white dark:bg-dark-100;
  @apply border border-gray-200/60 dark:border-gray-700/50;
  @apply shadow-sm;
  @apply transition-all duration-300;

  &:hover {
    @apply shadow-md;
    @apply transform -translate-y-0.5;
  }

  .item-left {
    @apply flex gap-3;
  }

  .item-cover {
    @apply w-12 h-12 rounded-md overflow-hidden;
    @apply flex-shrink-0;
    @apply bg-gray-100 dark:bg-dark-300;
    @apply shadow-sm;

    img {
      @apply w-full h-full object-cover;
    }
  }

  .item-info {
    @apply flex-1 min-w-0 flex items-center justify-between;
  }

  .item-name {
    @apply text-sm font-medium truncate;
  }

  .item-artist {
    @apply text-xs text-gray-500 dark:text-gray-400;
  }

  .item-progress {
    @apply mb-2;
  }

  .item-details {
    @apply flex justify-between items-center;
  }

  .item-size {
    @apply text-xs text-gray-500 dark:text-gray-400;
  }

  .item-status-badge {
    @apply text-xs px-2 py-0.5 rounded-full;
    @apply bg-gray-100 dark:bg-dark-300;

    &.status-downloading {
      @apply bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400;
    }

    &.status-completed {
      @apply bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400;
    }

    &.status-error {
      @apply bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400;
    }
  }
}

/* Downloaded List */
.downloaded-header {
  @apply px-4 py-3;
  @apply bg-white/90 dark:bg-dark-100/90;
  @apply backdrop-blur-lg backdrop-saturate-150;
  @apply border-b border-gray-200/50 dark:border-gray-700/50;
  @apply sticky top-0 z-10;
  @apply flex items-center justify-between;
}

.header-info {
  @apply flex items-center gap-2;
  @apply text-xs font-medium;
  @apply text-gray-700 dark:text-gray-300;

  i {
    @apply text-gray-400 dark:text-gray-500;
  }
}

.clear-button {
  @apply flex items-center gap-1;
  @apply px-2 py-1 rounded-md;
  @apply text-xs font-medium;
  @apply bg-gray-100 dark:bg-dark-300;
  @apply text-gray-700 dark:text-gray-300;
  @apply hover:bg-gray-200 dark:hover:bg-dark-300;
  @apply transition-colors duration-200;
}

.downloaded-items {
  @apply p-4 space-y-3;
}

.downloaded-item {
  @apply p-3 rounded-lg;
  @apply bg-white dark:bg-dark-100;
  @apply border border-gray-200/60 dark:border-gray-700/50;
  @apply shadow-sm;
  @apply flex gap-3;
  @apply transition-all duration-300;

  &:hover {
    @apply shadow-md;
    @apply transform -translate-y-0.5;
  }

  .item-cover {
    @apply w-14 h-14 rounded-md overflow-hidden;
    @apply flex-shrink-0;
    @apply bg-gray-100 dark:bg-dark-300;
    @apply shadow-sm;

    img {
      @apply w-full h-full object-cover;
    }
  }

  .item-info {
    @apply flex-1 flex justify-between items-center;
    @apply min-w-0;
  }

  .item-primary {
    @apply flex-1 min-w-0 flex items-center justify-between;
  }

  .item-name {
    @apply text-sm font-medium truncate;
  }

  .item-artist,
  .item-size {
    @apply flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400;

    i {
      @apply text-gray-400 dark:text-gray-500;
    }
  }

  .item-path {
    @apply flex items-center gap-1 text-xs;
    @apply text-gray-500 dark:text-gray-400;
    @apply bg-gray-50 dark:bg-dark-300;
    @apply rounded-md py-1 px-2;
    @apply truncate;

    i {
      @apply text-gray-400 dark:text-gray-500 flex-shrink-0;
    }

    span {
      @apply truncate flex-1;
    }

    .copy-button {
      @apply ml-1 opacity-0;
      @apply text-gray-400 hover:text-primary;
      @apply transition-all duration-200;
    }

    &:hover .copy-button {
      @apply opacity-100;
    }
  }

  .item-actions {
    @apply flex gap-1;
    @apply ml-2;
  }

  .action-btn {
    @apply flex items-center gap-1;
    @apply px-2 py-1 rounded-md;
    @apply text-xs;
    @apply transition-colors duration-200;

    &.play {
      @apply text-primary dark:text-white;
      @apply hover:bg-gray-100 dark:hover:bg-dark-300 hover:text-green-500;
    }

    &.open {
      @apply text-gray-600 dark:text-gray-300;
      @apply hover:bg-gray-100 dark:hover:bg-dark-300;
    }

    &.delete {
      @apply text-red-500;
      @apply hover:bg-red-500/10;
    }
  }
}

/* Modal */
.modal-overlay {
  @apply fixed inset-0 z-50;
  @apply bg-black/40 backdrop-blur-sm;
  @apply flex items-center justify-center;
}

.modal-content {
  @apply bg-white dark:bg-dark-100;
  @apply rounded-lg overflow-hidden;
  @apply shadow-xl;
  @apply w-full max-w-sm;
  @apply border border-gray-200/60 dark:border-gray-700/50;
  @apply animate-fade-in;
}

.modal-header {
  @apply flex items-center gap-2;
  @apply px-4 py-3;
  @apply border-b border-gray-100 dark:border-gray-800;
  @apply text-gray-900 dark:text-gray-100;
  @apply font-medium;

  i {
    @apply text-amber-500 dark:text-amber-400;
  }
}

.modal-body {
  @apply px-4 py-4;
  @apply text-sm text-gray-700 dark:text-gray-300;
}

.modal-footer {
  @apply px-4 py-3;
  @apply flex justify-end gap-2;
  @apply border-t border-gray-100 dark:border-gray-800;
}

.modal-btn {
  @apply px-3 py-1.5 rounded-md;
  @apply text-sm font-medium;
  @apply transition-colors duration-200;

  &.cancel {
    @apply bg-gray-100 dark:bg-dark-300;
    @apply text-gray-700 dark:text-gray-300;
    @apply hover:bg-gray-200 dark:hover:bg-dark-300;
  }

  &.confirm {
    @apply bg-amber-500 dark:bg-amber-600;
    @apply text-white;
    @apply hover:bg-amber-600 dark:hover:bg-amber-700;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.download-settings {
  @apply flex flex-col gap-6;
}

.setting-item {
  @apply bg-white dark:bg-dark-200 p-3 rounded-lg shadow-sm;
  @apply border border-gray-200/60 dark:border-gray-700/50;
}

.setting-title {
  @apply text-base font-medium;
  @apply text-gray-800 dark:text-gray-200;
}

.setting-desc {
  @apply text-sm text-gray-500 dark:text-gray-400 mt-1;
}

.format-components {
  @apply flex flex-col gap-2;
}

.format-item {
  @apply flex items-center px-3 py-2 bg-gray-100 dark:bg-dark-300 rounded;
  @apply border border-gray-200 dark:border-gray-700;
}

.format-preview {
  @apply text-sm;
}
</style>
