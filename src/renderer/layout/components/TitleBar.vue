<template>
  <div id="title-bar" @mousedown="drag">
    <div id="title">Alger Music</div>
    <div id="buttons">
      <n-button
        v-if="!isElectron"
        type="primary"
        size="small"
        text
        title="下载应用"
        @click="openDownloadPage"
      >
        <i class="ri-download-line"></i>
        下载桌面版
      </n-button>
      <template v-if="isElectron">
        <div class="button" @click="miniWindow">
          <i class="iconfont ri-picture-in-picture-line"></i>
        </div>
        <div class="button" @click="minimize">
          <i class="iconfont icon-minisize"></i>
        </div>
        <div class="button" @click="handleClose">
          <i class="iconfont icon-close"></i>
        </div>
      </template>
    </div>
  </div>

  <n-modal
    v-model:show="showCloseModal"
    preset="dialog"
    :title="t('comp.titleBar.closeApp')"
    :style="{ width: '400px' }"
    :mask-closable="true"
  >
    <div class="close-dialog-content">
      <p>{{ t('comp.titleBar.closeTitle') }}</p>
      <div class="remember-choice">
        <n-checkbox v-model:checked="rememberChoice">
          {{ t('comp.titleBar.rememberChoice') }}
        </n-checkbox>
      </div>
    </div>
    <template #action>
      <div class="dialog-footer">
        <n-button type="primary" @click="handleAction('minimize')">
          {{ t('comp.titleBar.minimizeToTray') }}
        </n-button>
        <n-button @click="handleAction('close')">
          {{ t('comp.titleBar.exitApp') }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSettingsStore } from '@/store/modules/settings';
import { isElectron } from '@/utils';

const { t } = useI18n();

const settingsStore = useSettingsStore();
const showCloseModal = ref(false);
const rememberChoice = ref(false);

const openDownloadPage = () => {
  if (!isElectron) {
    window.open('http://donate.alger.fun/download', '_blank');
  }
};

const minimize = () => {
  if (!isElectron) {
    return;
  }
  window.api.minimize();
};

const miniWindow = () => {
  if (!isElectron) return;
  window.api.miniWindow();
};

const handleAction = (action: 'minimize' | 'close') => {
  if (rememberChoice.value) {
    settingsStore.setSetData({
      ...settingsStore.setData,
      closeAction: action
    });
  }

  if (action === 'minimize') {
    window.api.miniTray();
  } else {
    window.api.close();
  }
  showCloseModal.value = false;
};

const handleClose = () => {
  const { closeAction } = settingsStore.setData;

  if (closeAction === 'minimize') {
    window.api.miniTray();
  } else if (closeAction === 'close') {
    window.api.close();
  } else {
    showCloseModal.value = true;
  }
};

const drag = (event: MouseEvent) => {
  if (!isElectron) {
    return;
  }
  window.api.dragStart(event as unknown as string);
};
</script>

<style scoped lang="scss">
#title-bar {
  -webkit-app-region: drag;
  @apply flex justify-between px-6 py-2 select-none relative;
  @apply text-dark dark:text-white;
  z-index: 3000;
}

#buttons {
  @apply flex gap-4;
  -webkit-app-region: no-drag;
}

.button {
  @apply text-gray-600 dark:text-gray-400 hover:text-green-500;
}

.close-dialog-content {
  @apply flex flex-col gap-4;
}

.dialog-footer {
  @apply flex gap-4 justify-end;
}
</style>
