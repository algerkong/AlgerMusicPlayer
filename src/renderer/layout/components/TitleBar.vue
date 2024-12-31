<template>
  <div id="title-bar" @mousedown="drag">
    <div id="title">Alger Music</div>
    <div id="buttons">
      <button @click="minimize">
        <i class="iconfont icon-minisize"></i>
      </button>
      <button @click="close">
        <i class="iconfont icon-close"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDialog } from 'naive-ui';

import { isElectron } from '@/utils';

const dialog = useDialog();

const minimize = () => {
  if (!isElectron) {
    return;
  }
  window.api.minimize();
};

const close = () => {
  if (!isElectron) {
    return;
  }
  dialog.warning({
    title: '提示',
    content: '确定要退出吗？',
    positiveText: '最小化',
    negativeText: '关闭',
    onPositiveClick: () => {
      window.api.minimize();
    },
    onNegativeClick: () => {
      window.api.close();
    }
  });
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
  z-index: 9999999;
}

#buttons {
  @apply flex gap-4;
  -webkit-app-region: no-drag;
}

button {
  @apply text-gray-600 dark:text-gray-400 hover:text-green-500;
}
</style>
