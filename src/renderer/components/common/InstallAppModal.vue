<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    :show-icon="false"
    :mask-closable="true"
    class="install-app-modal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <div class="app-icon">
          <img src="@/assets/logo.png" alt="App Icon" />
        </div>
        <div class="app-info">
          <h2 class="app-name">Alger Music Player {{ config.version }}</h2>
          <p class="app-desc mb-2">在桌面安装应用，获得更好的体验</p>
          <n-checkbox v-model:checked="noPrompt">不再提示</n-checkbox>
        </div>
      </div>
      <div class="modal-actions">
        <n-button class="cancel-btn" @click="closeModal">暂不安装</n-button>
        <n-button type="primary" class="install-btn" @click="handleInstall">立即安装</n-button>
      </div>
      <div class="modal-desc mt-4 text-center">
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
import { onMounted, ref } from 'vue';

import { isElectron, isMobile } from '@/utils';
import { getLatestReleaseInfo } from '@/utils/update';

import config from '../../../../package.json';

const showModal = ref(false);
const noPrompt = ref(false);
const releaseInfo = ref<any>(null);

const closeModal = () => {
  showModal.value = false;
  if (noPrompt.value) {
    localStorage.setItem('installPromptDismissed', 'true');
  }
};

onMounted(async () => {
  // 如果是 electron 环境，不显示安装提示
  if (isElectron || isMobile.value) {
    return;
  }

  // 检查是否已经点击过"暂不安装"
  const isDismissed = localStorage.getItem('installPromptDismissed') === 'true';
  if (isDismissed) {
    return;
  }

  // 获取最新版本信息
  releaseInfo.value = await getLatestReleaseInfo();
  showModal.value = true;
});

const handleInstall = async (): Promise<void> => {
  const assets = releaseInfo.value?.assets || [];
  const { userAgent } = navigator;
  const isMac = userAgent.toLowerCase().includes('mac');
  const isWindows = userAgent.toLowerCase().includes('win');
  const isLinux = userAgent.toLowerCase().includes('linux');
  const isX64 =
    userAgent.includes('x86_64') || userAgent.includes('Win64') || userAgent.includes('WOW64');

  let downloadUrl = '';

  // 根据平台和架构选择对应的安装包
  if (isMac) {
    // macOS
    const macAsset = assets.find((asset) => asset.name.includes('mac'));
    downloadUrl = macAsset?.browser_download_url || '';
  } else if (isWindows) {
    // Windows
    let winAsset = assets.find(
      (asset) =>
        asset.name.includes('win') &&
        (isX64 ? asset.name.includes('x64') : asset.name.includes('ia32'))
    );
    if (!winAsset) {
      winAsset = assets.find((asset) => asset.name.includes('win.exe'));
    }
    downloadUrl = winAsset?.browser_download_url || '';
  } else if (isLinux) {
    // Linux
    const linuxAsset = assets.find(
      (asset) =>
        (asset.name.endsWith('.AppImage') || asset.name.endsWith('.deb')) &&
        asset.name.includes('x64')
    );
    downloadUrl = linuxAsset?.browser_download_url || '';
  }

  if (downloadUrl) {
    window.open(`https://ghproxy.cn/${downloadUrl}`, '_blank');
  } else {
    // 如果没有找到对应的安装包，跳转到 release 页面
    window.open('https://github.com/algerkong/AlgerMusicPlayer/releases/latest', '_blank');
  }
  closeModal();
};
</script>

<style lang="scss" scoped>
.install-app-modal {
  :deep(.n-modal) {
    @apply max-w-sm;
  }
  .modal-content {
    @apply p-4 pb-0;
    .modal-header {
      @apply flex items-center mb-6;
      .app-icon {
        @apply w-20 h-20 mr-4 rounded-2xl overflow-hidden;
        img {
          @apply w-full h-full object-cover;
        }
      }
      .app-info {
        @apply flex-1;
        .app-name {
          @apply text-xl font-bold mb-1;
        }
        .app-desc {
          @apply text-sm text-gray-400;
        }
      }
    }
    .modal-actions {
      @apply flex gap-3 mt-4;
      .n-button {
        @apply flex-1;
      }
      .cancel-btn {
        @apply bg-gray-800 text-gray-300 border-none;
        &:hover {
          @apply bg-gray-700;
        }
      }
      .install-btn {
        @apply bg-green-600 border-none;
        &:hover {
          @apply bg-green-500;
        }
      }
    }
  }
}
</style>
