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
          <p class="app-desc mb-2">{{ t('comp.installApp.description') }}</p>
          <n-checkbox v-model:checked="noPrompt">{{ t('comp.installApp.noPrompt') }}</n-checkbox>
        </div>
      </div>
      <div class="modal-actions">
        <n-button class="cancel-btn" @click="closeModal">{{
          t('comp.installApp.cancel')
        }}</n-button>
        <n-button type="primary" class="install-btn" @click="handleInstall">{{
          t('comp.installApp.install')
        }}</n-button>
      </div>
      <div class="modal-desc mt-4 text-center">
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
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { isElectron } from '@/utils';

import config from '../../../../package.json';

const { t } = useI18n();

const showModal = ref(false);
const noPrompt = ref(false);

const closeModal = () => {
  showModal.value = false;
  if (noPrompt.value) {
    localStorage.setItem('installPromptDismissed', 'true');
  }
};

onMounted(async () => {
  // 如果是 electron 环境，不显示安装提示
  if (isElectron) {
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
  window.open('http://donate.alger.fun/download', '_blank');
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
