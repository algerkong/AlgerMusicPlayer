<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    :show-icon="false"
    :mask-closable="!downloading"
    :closable="!downloading"
    class="update-modal"
    style="width: 800px; max-width: 90vw"
  >
    <div class="p-6 pb-4">
      <!-- 头部：图标 + 版本信息 -->
      <div class="flex items-center mb-6">
        <div
          class="w-20 h-20 mr-5 flex-shrink-0 overflow-hidden rounded-2xl shadow-lg ring-2 ring-neutral-100 dark:ring-neutral-800"
        >
          <img src="@/assets/logo.png" alt="App Icon" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mb-1.5">
            {{ t('comp.update.title') }} {{ updateInfo.latestVersion }}
          </h2>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            >
              {{ t('comp.update.currentVersion') }} {{ updateInfo.currentVersion }}
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20"
            >
              NEW
            </span>
          </div>
        </div>
      </div>

      <!-- 更新日志 -->
      <div class="mb-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden">
        <n-scrollbar style="max-height: 300px">
          <div
            class="update-body p-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300"
            v-html="parsedReleaseNotes"
          />
        </n-scrollbar>
      </div>

      <!-- 下载进度 -->
      <div v-if="downloading" class="mb-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-sm text-neutral-500 dark:text-neutral-400">{{ downloadStatus }}</span>
          <span class="text-sm font-bold text-primary">{{ downloadProgress }}%</span>
        </div>
        <div
          class="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
        >
          <div
            class="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(34,197,94,0.4)]"
            :style="{ width: `${downloadProgress}%` }"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-3" :class="{ 'mt-6': !downloading }">
        <button
          class="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="downloading"
          @click="closeModal"
        >
          {{ t('comp.update.cancel') }}
        </button>
        <button
          v-if="!downloading"
          class="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="downloading"
          @click="handleUpdate"
        >
          {{ downloadBtnText }}
        </button>
        <button
          v-else
          class="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95"
          @click="closeModal"
        >
          {{ t('comp.update.backgroundDownload') }}
        </button>
      </div>

      <!-- 底部提示 -->
      <p
        v-if="!downloading"
        class="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500"
      >
        {{ t('comp.installApp.downloadProblem') }}
        <a
          class="text-primary hover:text-primary/80 transition-colors"
          target="_blank"
          href="https://github.com/algerkong/AlgerMusicPlayer/releases"
          >GitHub</a
        >
        {{ t('comp.installApp.downloadProblemLinkText') }}
      </p>
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

// 配置 marked（只需执行一次）
marked.setOptions({ breaks: true, gfm: true });

const GITHUB_RELEASE_BASE = 'https://github.com/algerkong/AlgerMusicPlayer/releases/download';
const GITHUB_RELEASES_URL = 'https://github.com/algerkong/AlgerMusicPlayer/releases';

const settingsStore = useSettingsStore();
const ipc = window.electron.ipcRenderer;

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

const downloading = ref(false);
const downloadProgress = ref(0);
const downloadStatus = ref(t('comp.update.prepareDownload'));
const isDialogShown = ref(false);

const parsedReleaseNotes = computed(() => {
  const body = updateInfo.value.releaseInfo?.body;
  if (!body) return '';
  try {
    return marked.parse(body);
  } catch (error) {
    console.error('Markdown 解析失败:', error);
    return body;
  }
});

const downloadBtnText = computed(() =>
  downloading.value ? t('comp.update.downloading') : t('comp.update.nowUpdate')
);

const closeModal = () => {
  showModal.value = false;
};

// ---- 下载 URL 解析 ----

const buildReleaseUrl = (version: string, suffix: string): string =>
  `${GITHUB_RELEASE_BASE}/v${version}/AlgerMusicPlayer-${version}${suffix}`;

const resolveDownloadUrl = (
  assets: any[],
  platform: string,
  arch: string,
  version: string
): string => {
  // 从 release assets 中按平台/架构匹配
  const findAsset = (keywords: string[]): string | undefined =>
    assets.find((a) => keywords.every((k) => a.name.includes(k)))?.browser_download_url;

  if (platform === 'darwin') {
    const macArch = arch === 'arm64' ? 'arm64' : 'x64';
    return findAsset(['mac', macArch]) || buildReleaseUrl(version, `-${macArch}.dmg`);
  }

  if (platform === 'win32') {
    const winArch = arch === 'x64' ? 'x64' : 'ia32';
    return (
      findAsset(['win', winArch]) ||
      buildReleaseUrl(version, `-win-${winArch}.exe`) ||
      buildReleaseUrl(version, '-win.exe')
    );
  }

  if (platform === 'linux') {
    return (
      findAsset(['x64', '.AppImage']) ||
      findAsset(['x64', '.deb']) ||
      buildReleaseUrl(version, '-linux-x64.AppImage')
    );
  }

  return '';
};

// ---- IPC 事件处理 ----

const onDownloadProgress = (_event: any, progress: number, status: string) => {
  downloadProgress.value = progress;
  downloadStatus.value = status;
};

const showInstallDialog = (filePath: string) => {
  const copyFilePath = () => {
    navigator.clipboard
      .writeText(filePath)
      .then(() => message.success(t('comp.update.copySuccess')))
      .catch(() => message.error(t('comp.update.copyFailed')));
  };

  const dialogRef = dialog.create({
    title: t('comp.update.installConfirmTitle'),
    content: () =>
      h('div', { class: 'flex flex-col gap-3' }, [
        h(
          'p',
          { class: 'text-base font-medium text-neutral-800 dark:text-neutral-100' },
          t('comp.update.installConfirmContent')
        ),
        h('div', { class: 'h-px bg-neutral-200 dark:bg-neutral-700' }),
        h(
          'p',
          { class: 'text-sm text-neutral-500 dark:text-neutral-400' },
          t('comp.update.manualInstallTip')
        ),
        h('div', { class: 'flex items-center gap-3 mt-1' }, [
          h('div', { class: 'flex-1 min-w-0' }, [
            h(
              'p',
              { class: 'text-xs text-neutral-400 dark:text-neutral-500 mb-1' },
              t('comp.update.fileLocation')
            ),
            h(
              'div',
              {
                class:
                  'rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-xs font-mono text-neutral-700 dark:text-neutral-300 break-all'
              },
              filePath
            )
          ]),
          h(
            'button',
            {
              class:
                'flex items-center gap-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-700 px-3 py-2 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-600 flex-shrink-0',
              onClick: copyFilePath
            },
            [h('i', { class: 'ri-file-copy-line text-sm' }), h('span', t('comp.update.copy'))]
          )
        ])
      ]),
    positiveText: t('comp.update.yesInstall'),
    negativeText: t('comp.update.noThanks'),
    onPositiveClick: () => {
      ipc.send('install-update', filePath);
    },
    onNegativeClick: () => {
      dialogRef.destroy();
    },
    onClose: () => {
      isDialogShown.value = false;
    }
  });
};

const onDownloadComplete = (_event: any, success: boolean, filePath: string) => {
  downloading.value = false;
  closeModal();

  if (success && !isDialogShown.value) {
    isDialogShown.value = true;
    showInstallDialog(filePath);
  } else if (!success) {
    message.error(t('comp.update.downloadFailed'));
  }
};

// ---- 生命周期 ----

const registerIpcListeners = () => {
  // 先移除旧监听，防止重复注册
  ipc.removeListener('download-progress', onDownloadProgress);
  ipc.removeListener('download-complete', onDownloadComplete);
  ipc.on('download-progress', onDownloadProgress);
  ipc.on('download-complete', onDownloadComplete);
};

const removeIpcListeners = () => {
  ipc.removeListener('download-progress', onDownloadProgress);
  ipc.removeListener('download-complete', onDownloadComplete);
};

onMounted(async () => {
  registerIpcListeners();
  try {
    const result = await checkUpdate(config.version);
    if (result) {
      updateInfo.value = result;
      showModal.value = true;
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
});

onUnmounted(() => {
  removeIpcListeners();
  isDialogShown.value = false;
});

// ---- 触发更新下载 ----

const handleUpdate = async () => {
  const { releaseInfo, latestVersion } = updateInfo.value;
  const assets = releaseInfo?.assets ?? [];
  const { platform } = window.electron.process;
  const arch = ipc.sendSync('get-arch');

  const downloadUrl = resolveDownloadUrl(assets, platform, arch, latestVersion);

  if (!downloadUrl) {
    message.error(t('comp.update.noDownloadUrl'));
    window.open(`${GITHUB_RELEASES_URL}/latest`, '_blank');
    return;
  }

  try {
    downloading.value = true;
    downloadProgress.value = 0;
    downloadStatus.value = t('comp.update.prepareDownload');
    isDialogShown.value = false;

    const proxyHosts = await getProxyNodes();
    ipc.send('start-download', `${proxyHosts[0]}/${downloadUrl}`);
  } catch (error) {
    downloading.value = false;
    message.error(t('comp.update.startFailed'));
    console.error('下载失败:', error);
  }
};
</script>

<style scoped>
/* 弹窗圆角 */
.update-modal :deep(.n-dialog) {
  border-radius: 1.25rem; /* 20px — rounded-2xl 级别 */
  overflow: hidden;
}

/* 更新日志 Markdown 渲染样式 */
.update-body :deep(h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}
.update-body :deep(h2) {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}
.update-body :deep(h3) {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.update-body :deep(p) {
  margin-bottom: 0.75rem;
  line-height: 1.625;
}
.update-body :deep(ul) {
  list-style-type: disc;
  list-style-position: inside;
  margin-bottom: 0.75rem;
}
.update-body :deep(ol) {
  list-style-type: decimal;
  list-style-position: inside;
  margin-bottom: 0.75rem;
}
.update-body :deep(li) {
  margin-bottom: 0.5rem;
  line-height: 1.625;
}
.update-body :deep(code) {
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  background-color: rgb(245 245 245);
}
.dark .update-body :deep(code) {
  background-color: rgb(64 64 64);
}
.update-body :deep(pre) {
  padding: 0.75rem;
  border-radius: 0.75rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
  background-color: rgb(245 245 245);
}
.dark .update-body :deep(pre) {
  background-color: rgb(64 64 64);
}
.update-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
}
.update-body :deep(blockquote) {
  padding-left: 1rem;
  border-left: 4px solid rgb(229 229 229);
  margin-bottom: 0.75rem;
}
.dark .update-body :deep(blockquote) {
  border-left-color: rgb(82 82 82);
}
.update-body :deep(a) {
  color: #22c55e;
  transition: color 0.2s;
}
.update-body :deep(a:hover) {
  color: rgb(34 197 94 / 0.8);
}
.update-body :deep(hr) {
  margin: 1rem 0;
  border-color: rgb(229 229 229);
}
.dark .update-body :deep(hr) {
  border-color: rgb(82 82 82);
}
.update-body :deep(table) {
  width: 100%;
  margin-bottom: 0.75rem;
}
.update-body :deep(th),
.update-body :deep(td) {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgb(229 229 229);
}
.dark .update-body :deep(th),
.dark .update-body :deep(td) {
  border-color: rgb(82 82 82);
}
.update-body :deep(th) {
  background-color: rgb(245 245 245);
}
.dark .update-body :deep(th) {
  background-color: rgb(64 64 64);
}
</style>
