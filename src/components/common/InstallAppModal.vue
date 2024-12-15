<template>
  <n-modal v-model:show="showModal" preset="dialog" :show-icon="false" :mask-closable="true" class="install-app-modal">
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
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import config from '@/../package.json';

const showModal = ref(false);
const isElectron = ref((window as any).electron !== undefined);
const noPrompt = ref(false);

const closeModal = () => {
  showModal.value = false;
  if (noPrompt.value) {
    localStorage.setItem('installPromptDismissed', 'true');
  }
};

onMounted(() => {
  // 如果是 electron 环境，不显示安装提示
  if (isElectron.value) {
    return;
  }

  // 检查是否已经点击过"暂不安装"
  const isDismissed = localStorage.getItem('installPromptDismissed') === 'true';
  if (isDismissed) {
    return;
  }
  showModal.value = true;
});

const handleInstall = async (): Promise<void> => {
  const { userAgent } = navigator;
  console.log('userAgent', userAgent);
  const isMac: boolean = userAgent.includes('Mac');
  const isWindows: boolean = userAgent.includes('Win');
  const isARM: boolean = userAgent.includes('ARM') || userAgent.includes('arm') || userAgent.includes('OS X');
  const isX64: boolean = userAgent.includes('x86_64') || userAgent.includes('Win64') || userAgent.includes('WOW64');
  const isX86: boolean =
    !isX64 && (userAgent.includes('i686') || userAgent.includes('i386') || userAgent.includes('Win32'));

  const getDownloadUrl = (os: string, arch: string): string => {
    const version = config.version as string;
    return `https://github.com/algerkong/AlgerMusicPlayer/releases/download/${version}/AlgerMusic_${version}_${arch}.${os === 'mac' ? 'dmg' : 'exe'}`;
  };

  const osType: string | null = isMac ? 'mac' : isWindows ? 'windows' : null;
  const archType: string | null = isARM ? 'arm64' : isX64 ? 'x64' : isX86 ? 'x86' : null;

  const downloadUrl: string | null = osType && archType ? getDownloadUrl(osType, archType) : null;

  window.open(downloadUrl || 'https://github.com/algerkong/AlgerMusicPlayer/releases', '_blank');
};
</script>

<style lang="scss" scoped>
.install-app-modal {
  :deep(.n-modal) {
    @apply max-w-sm;
  }
  .modal-content {
    @apply p-4;
    .modal-header {
      @apply flex items-center mb-6;
      .app-icon {
        @apply w-16 h-16 mr-4 rounded-2xl overflow-hidden;
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
      @apply flex gap-3;
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
