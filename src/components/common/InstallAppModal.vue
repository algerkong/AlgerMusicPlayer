<template>
  <n-modal v-model:show="showModal" preset="dialog" :show-icon="false" :mask-closable="true" class="install-app-modal">
    <div class="modal-content">
      <div class="modal-header">
        <div class="app-icon">
          <img src="@/assets/logo.png" alt="App Icon" />
        </div>
        <div class="app-info">
          <h2 class="app-name">Alger Music</h2>
          <p class="app-desc">在桌面安装应用，获得更好的体验</p>
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

const showModal = ref(false);
const isElectron = ref((window as any).electron !== undefined);

const closeModal = () => {
  showModal.value = false;
  localStorage.setItem('installPromptDismissed', 'true');
};

const handleInstall = async () => {
  // 新页面打开
  // 识别当前环境是 mac 还是 windows
  const os = navigator.platform;
  const isMac = os.includes('Mac');
  const isWindows = os.includes('Win');
  const urls = {
    mac: 'http://file.alger.fun/d/ali/%E8%BD%AF%E4%BB%B6/AlgerMusic/AlgerMusic.dmg',
    windows: 'http://file.alger.fun/d/ali/%E8%BD%AF%E4%BB%B6/AlgerMusic/AlgerMusic_2.1.0_Setup_x64.exe',
  };
  // 根据操作系统选择下载链接
  let downloadUrl = '';
  if (isMac) {
    downloadUrl = urls.mac;
  } else if (isWindows) {
    downloadUrl = urls.windows;
  }
  if (downloadUrl) {
    window.open(downloadUrl, '_blank');
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
