<template>
  <div id="title-bar" @mousedown="drag">
    <div id="title">Alger Music</div>
    <div id="buttons">
      <div class="button" @click="minimize">
        <i class="iconfont icon-minisize"></i>
      </div>
      <div class="button" @click="close">
        <i class="iconfont icon-close"></i>
      </div>
    </div>
  </div>

  <n-modal
    v-model:show="showCloseModal"
    preset="dialog"
    title="关闭应用"
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
import { useStore } from 'vuex';

import { isElectron } from '@/utils';

const store = useStore();
const showCloseModal = ref(false);
const rememberChoice = ref(false);

const minimize = () => {
  if (!isElectron) {
    return;
  }
  window.api.minimize();
};

const handleAction = (action: 'minimize' | 'close') => {
  if (rememberChoice.value) {
    store.commit('setSetData', {
      ...store.state.setData,
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

const close = () => {
  if (!isElectron) {
    return;
  }

  const { closeAction } = store.state.setData;

  if (closeAction === 'minimize') {
    window.api.miniTray();
    return;
  }

  if (closeAction === 'close') {
    window.api.close();
    return;
  }

  showCloseModal.value = true;
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
