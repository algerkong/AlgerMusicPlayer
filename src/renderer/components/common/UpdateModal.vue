<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    :show-icon="false"
    :mask-closable="!downloading"
    :closable="!downloading"
    class="update-app-modal"
    style="width: 800px; max-width: 90vw"
  >
    <div class="modal-content">
      <div class="modal-header">
        <div class="app-icon">
          <img src="@/assets/logo.png" alt="App Icon" />
        </div>
        <div class="app-info">
          <h2 class="app-name">发现新版本 {{ updateInfo.latestVersion }}</h2>
          <p class="app-desc mb-2">当前版本 {{ updateInfo.currentVersion }}</p>
        </div>
      </div>
      <div class="update-info">
        <n-scrollbar style="max-height: 300px">
          <div class="update-body" v-html="parsedReleaseNotes"></div>
        </n-scrollbar>
      </div>
      <div v-if="downloading" class="download-status mt-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-500">{{ downloadStatus }}</span>
          <span class="text-sm font-medium">{{ downloadProgress }}%</span>
        </div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar" :style="{ width: `${downloadProgress}%` }"></div>
        </div>
      </div>
      <div class="modal-actions" :class="{ 'mt-6': !downloading }">
        <n-button
          class="cancel-btn"
          :disabled="downloading"
          :loading="downloading"
          @click="closeModal"
        >
          {{ '暂不更新' }}
        </n-button>
        <n-button
          type="primary"
          class="update-btn"
          :loading="downloading"
          :disabled="downloading"
          @click="handleUpdate"
        >
          {{ downloadBtnText }}
        </n-button>
      </div>
      <div v-if="!downloading" class="modal-desc mt-4 text-center">
        <p class="text-xs text-gray-400">
          下载遇到问题？去
          <a
            class="text-green-500"
            target="_blank"
            href="https://github.com/algerkong/AlgerMusicPlayer/releases"
            >GitHub</a
          >
          下载最新版本
        </p>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { marked } from 'marked';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStore } from 'vuex';

import { checkUpdate, UpdateResult } from '@/utils/update';

import config from '../../../../package.json';

// 配置 marked
marked.setOptions({
  breaks: true, // 支持 GitHub 风格的换行
  gfm: true // 启用 GitHub 风格的 Markdown
});

const showModal = ref(false);
const updateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

const store = useStore();

// 添加计算属性
const showUpdateModalState = computed({
  get: () => store.state.showUpdateModal,
  set: (val) => store.commit('setShowUpdateModal', val)
});

// 替换原来的 watch
watch(showUpdateModalState, (newVal) => {
  if (newVal) {
    showModal.value = true;
  }
});

watch(
  () => showModal.value,
  (newVal) => {
    showUpdateModalState.value = newVal;
  }
);

// 解析 Markdown
const parsedReleaseNotes = computed(() => {
  if (!updateInfo.value.releaseInfo?.body) return '';
  try {
    return marked.parse(updateInfo.value.releaseInfo.body);
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return updateInfo.value.releaseInfo.body;
  }
});

const closeModal = () => {
  showModal.value = false;
};

const checkForUpdates = async () => {
  try {
    const result = await checkUpdate(config.version);
    if (result) {
      updateInfo.value = result;
      showModal.value = true;
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
};

const downloading = ref(false);
const downloadProgress = ref(0);
const downloadStatus = ref('准备下载...');
const downloadBtnText = computed(() => {
  if (downloading.value) return '下载中...';
  return '立即更新';
});

// 处理下载状态更新
const handleDownloadProgress = (_event: any, progress: number, status: string) => {
  downloadProgress.value = progress;
  downloadStatus.value = status;
};

// 处理下载完成
const handleDownloadComplete = (_event: any, success: boolean, filePath: string) => {
  downloading.value = false;
  if (success) {
    window.electron.ipcRenderer.send('install-update', filePath);
  } else {
    window.$message.error('下载失败，请重试或手动下载');
  }
};

// 监听下载事件
onMounted(() => {
  checkForUpdates();
  window.electron.ipcRenderer.on('download-progress', handleDownloadProgress);
  window.electron.ipcRenderer.on('download-complete', handleDownloadComplete);
});

// 清理事件监听
onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('download-progress', handleDownloadProgress);
  window.electron.ipcRenderer.removeListener('download-complete', handleDownloadComplete);
});

const handleUpdate = async () => {
  const assets = updateInfo.value.releaseInfo?.assets || [];
  const { platform } = window.electron.process;
  const arch = window.electron.ipcRenderer.sendSync('get-arch');
  const version = updateInfo.value.latestVersion;
  const downUrls = {
    win32: {
      all: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-win.exe`,
      x64: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-win-x64.exe`,
      ia32: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-win-ia32.exe`
    },
    darwin: {
      all: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}AlgerMusicPlayer-${version}-mac-universal.dmg`
    },
    linux: {
      AppImage: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-linux-x64.AppImage`,
      deb: `https://github.com/algerkong/AlgerMusicPlayer/releases/download/v${version}/AlgerMusicPlayer-${version}-linux-x64.deb`
    }
  };

  let downloadUrl = '';

  // 根据平台和架构选择对应的安装包
  if (platform === 'darwin') {
    // macOS
    const macAsset = assets.find((asset) => asset.name.includes('mac'));
    downloadUrl = macAsset?.browser_download_url || downUrls.darwin.all || '';
  } else if (platform === 'win32') {
    // Windows
    const winAsset = assets.find(
      (asset) =>
        asset.name.includes('win') &&
        (arch === 'x64' ? asset.name.includes('x64') : asset.name.includes('ia32'))
    );
    downloadUrl =
      winAsset?.browser_download_url || downUrls.win32[arch] || downUrls.win32.all || '';
  } else if (platform === 'linux') {
    // Linux
    const linuxAsset = assets.find(
      (asset) =>
        (asset.name.endsWith('.AppImage') || asset.name.endsWith('.deb')) &&
        asset.name.includes('x64')
    );
    downloadUrl = linuxAsset?.browser_download_url || downUrls.linux[arch] || '';
  }

  if (downloadUrl) {
    try {
      downloading.value = true;
      downloadStatus.value = '准备下载...';
      window.electron.ipcRenderer.send('start-download', downloadUrl);
    } catch (error) {
      downloading.value = false;
      window.$message.error('启动下载失败，请重试或手动下载');
      console.error('下载失败:', error);
    }
  } else {
    window.$message.error('未找到适合当前系统的安装包，请手动下载');
    window.open('https://github.com/algerkong/AlgerMusicPlayer/releases/latest', '_blank');
  }
};
</script>

<style lang="scss" scoped>
.update-app-modal {
  :deep(.n-modal) {
    @apply max-w-4xl;
  }
  .modal-content {
    @apply p-6 pb-4;
    .modal-header {
      @apply flex items-center mb-6;
      .app-icon {
        @apply w-24 h-24 mr-6 rounded-2xl overflow-hidden;
        img {
          @apply w-full h-full object-cover;
        }
      }
      .app-info {
        @apply flex-1;
        .app-name {
          @apply text-2xl font-bold mb-2;
        }
        .app-desc {
          @apply text-base text-gray-400;
        }
      }
    }
    .update-info {
      @apply mb-6 rounded-lg bg-gray-50 dark:bg-gray-800;
      .update-title {
        @apply text-base font-medium p-4 pb-2;
      }
      .update-body {
        @apply p-4 pt-2 text-gray-600 dark:text-gray-300 rounded-lg overflow-hidden;

        :deep(h1) {
          @apply text-xl font-bold mb-3;
        }
        :deep(h2) {
          @apply text-lg font-bold mb-3;
        }
        :deep(h3) {
          @apply text-base font-bold mb-2;
        }
        :deep(p) {
          @apply mb-3 leading-relaxed;
        }
        :deep(ul) {
          @apply list-disc list-inside mb-3;
        }
        :deep(ol) {
          @apply list-decimal list-inside mb-3;
        }
        :deep(li) {
          @apply mb-2 leading-relaxed;
        }
        :deep(code) {
          @apply px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200;
        }
        :deep(pre) {
          @apply p-3 rounded bg-gray-100 dark:bg-gray-700 overflow-x-auto mb-3;
          code {
            @apply bg-transparent p-0;
          }
        }
        :deep(blockquote) {
          @apply pl-4 border-l-4 border-gray-200 dark:border-gray-600 mb-3;
        }
        :deep(a) {
          @apply text-green-500 hover:text-green-600 dark:hover:text-green-400;
        }
        :deep(hr) {
          @apply my-4 border-gray-200 dark:border-gray-600;
        }
        :deep(table) {
          @apply w-full mb-3;
          th,
          td {
            @apply px-3 py-2 border border-gray-200 dark:border-gray-600;
          }
          th {
            @apply bg-gray-100 dark:bg-gray-700;
          }
        }
      }
    }
    .download-status {
      @apply p-2;
      .progress-bar-wrapper {
        @apply w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden;
        .progress-bar {
          @apply h-full bg-green-500 rounded-full transition-all duration-300 ease-out;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
      }
    }
    .modal-actions {
      @apply flex gap-4;
      .n-button {
        @apply flex-1 text-base py-2;
      }
      .cancel-btn {
        @apply bg-gray-800 text-gray-300 border-none;
        &:hover {
          @apply bg-gray-700;
        }
        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }
      }
      .update-btn {
        @apply bg-green-600 border-none;
        &:hover {
          @apply bg-green-500;
        }
        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }
      }
    }
  }
}
</style>
