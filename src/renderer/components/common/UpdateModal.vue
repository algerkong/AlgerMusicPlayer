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
          <h2 class="app-name">{{ t('comp.update.title') }} {{ updateInfo.latestVersion }}</h2>
          <p class="app-desc mb-2">
            {{ t('comp.update.currentVersion') }} {{ updateInfo.currentVersion }}
          </p>
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
        <n-button class="cancel-btn" :disabled="downloading" @click="closeModal">
          {{ t('comp.update.cancel') }}
        </n-button>
        <n-button
          v-if="!downloading"
          type="primary"
          class="update-btn"
          :disabled="downloading"
          @click="handleUpdate"
        >
          {{ downloadBtnText }}
        </n-button>
        <!-- 后台下载 -->
        <n-button v-else class="update-btn" type="primary" @click="closeModal">
          {{ t('comp.update.backgroundDownload') }}
        </n-button>
      </div>
      <div v-if="!downloading" class="modal-desc mt-4 text-center">
        <p class="text-xs text-gray-400">
          {{ t('comp.installApp.downloadProblem') }}
          <a
            class="text-green-500"
            target="_blank"
            href="https://github.com/algerkong/AlgerMusicPlayer/releases"
            >GitHub</a
          >
          {{ t('comp.installApp.downloadProblemLinkText') }}
        </p>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { marked } from 'marked';
import { computed, h, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSettingsStore } from '@/store/modules/settings';
import { checkUpdate, getProxyNodes, UpdateResult } from '@/utils/update';

import config from '../../../../package.json';

const { t } = useI18n();
const dialog = useDialog();
const message = useMessage();

// 配置 marked
marked.setOptions({
  breaks: true, // 支持 GitHub 风格的换行
  gfm: true // 启用 GitHub 风格的 Markdown
});

const settingsStore = useSettingsStore();

const showModal = computed({
  get: () => settingsStore.showUpdateModal,
  set: (val) => settingsStore.setShowUpdateModal(val)
});

const updateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

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
const downloadStatus = ref(t('comp.update.prepareDownload'));
const downloadBtnText = computed(() => {
  if (downloading.value) return t('comp.update.downloading');
  return t('comp.update.nowUpdate');
});

// 下载完成后的文件路径
const downloadedFilePath = ref('');
// 防止对话框重复弹出
const isDialogShown = ref(false);

// 处理下载状态更新
const handleDownloadProgress = (_event: any, progress: number, status: string) => {
  downloadProgress.value = progress;
  downloadStatus.value = status;
};

// 处理下载完成
const handleDownloadComplete = (_event: any, success: boolean, filePath: string) => {
  downloading.value = false;
  closeModal();

  if (success && !isDialogShown.value) {
    downloadedFilePath.value = filePath;
    isDialogShown.value = true;

    // 复制文件路径到剪贴板
    const copyFilePath = () => {
      navigator.clipboard
        .writeText(filePath)
        .then(() => {
          message.success(t('comp.update.copySuccess'));
        })
        .catch(() => {
          message.error(t('comp.update.copyFailed'));
        });
    };

    // 使用naive-ui的对话框询问用户是否安装
    const dialogRef = dialog.create({
      title: t('comp.update.installConfirmTitle'),
      content: () =>
        h('div', { class: 'update-dialog-content' }, [
          h('p', { class: 'content-text' }, t('comp.update.installConfirmContent')),
          h('div', { class: 'divider' }),
          h('p', { class: 'manual-tip' }, t('comp.update.manualInstallTip')),
          h('div', { class: 'file-path-container' }, [
            h('div', { class: 'file-path-box' }, [
              h('p', { class: 'file-path-label' }, t('comp.update.fileLocation')),
              h('div', { class: 'file-path-value' }, filePath)
            ]),
            h(
              'div',
              {
                class: 'copy-btn',
                onClick: copyFilePath
              },
              [h('i', { class: 'ri-file-copy-line' }), h('span', t('comp.update.copy'))]
            )
          ])
        ]),
      positiveText: t('comp.update.yesInstall'),
      negativeText: t('comp.update.noThanks'),
      onPositiveClick: () => {
        window.electron.ipcRenderer.send('install-update', filePath);
      },
      onNegativeClick: () => {
        closeModal();
        // 关闭当前窗口
        dialogRef.destroy();
      },
      onClose: () => {
        isDialogShown.value = false;
      }
    });
  } else if (!success) {
    message.error(t('comp.update.downloadFailed'));
  }
};

// 监听下载事件
onMounted(() => {
  checkForUpdates();
  // 确保事件监听器只注册一次
  window.electron.ipcRenderer.removeListener('download-progress', handleDownloadProgress);
  window.electron.ipcRenderer.removeListener('download-complete', handleDownloadComplete);

  window.electron.ipcRenderer.on('download-progress', handleDownloadProgress);
  window.electron.ipcRenderer.on('download-complete', handleDownloadComplete);
});

// 清理事件监听
onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('download-progress', handleDownloadProgress);
  window.electron.ipcRenderer.removeListener('download-complete', handleDownloadComplete);
  isDialogShown.value = false;
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
      downloadStatus.value = t('comp.update.prepareDownload');
      isDialogShown.value = false;

      // 获取代理节点列表
      const proxyHosts = await getProxyNodes();
      const proxyDownloadUrl = `${proxyHosts[0]}/${downloadUrl}`;

      // 发送所有可能的下载地址到主进程
      window.electron.ipcRenderer.send('start-download', proxyDownloadUrl);
    } catch (error) {
      downloading.value = false;
      message.error(t('comp.update.startFailed'));
      console.error('下载失败:', error);
    }
  } else {
    message.error(t('comp.update.noDownloadUrl'));
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

<style lang="scss" scoped>
/* 对话框内容样式 */
.update-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .content-text {
    font-size: 16px;
    font-weight: 500;
  }

  .divider {
    width: 100%;
    height: 1px;
    background-color: #e5e7eb;
    margin: 4px 0;
  }

  .manual-tip {
    font-size: 14px;
    color: #6b7280;
  }

  .file-path-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;

    .file-path-box {
      flex: 1;

      .file-path-label {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 4px;
      }

      .file-path-value {
        padding: 8px;
        border-radius: 4px;
        background-color: #f3f4f6;
        font-size: 12px;
        font-family: monospace;
        color: #1f2937;
        word-break: break-all;
      }
    }

    .copy-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border-radius: 4px;
      background-color: #e5e7eb;
      color: #4b5563;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #d1d5db;
      }

      i {
        font-size: 14px;
      }
    }
  }
}

/* 深色模式样式 */
.dark .update-dialog-content {
  .divider {
    background-color: #374151;
  }

  .manual-tip {
    color: #9ca3af;
  }

  .file-path-container {
    .file-path-box {
      .file-path-label {
        color: #9ca3af;
      }

      .file-path-value {
        background-color: #1f2937;
        color: #d1d5db;
      }
    }

    .copy-btn {
      background-color: #374151;
      color: #d1d5db;

      &:hover {
        background-color: #4b5563;
      }
    }
  }
}
</style>
