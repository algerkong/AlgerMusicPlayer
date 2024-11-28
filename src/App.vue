<template>
  <div class="app-container" :class="{ mobile: isMobile }">
    <n-config-provider :theme="darkTheme">
      <n-dialog-provider>
        <router-view></router-view>
      </n-dialog-provider>
      <install-app-modal></install-app-modal>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import { darkTheme } from 'naive-ui';

import InstallAppModal from '@/components/common/InstallAppModal.vue';
import store from '@/store';

import { isMobile } from './utils';

const windowData = window as any;
onMounted(() => {
  if (windowData.electron) {
    const setData = windowData.electron.ipcRenderer.getStoreValue('set');
    store.commit('setSetData', setData);
  }
});
</script>

<style lang="scss" scoped>
.app-container {
  @apply h-full w-full;
  user-select: none;
}

.mobile {
  .text-base {
    font-size: 14px !important;
  }
}

.html:has(.mobile) {
  font-size: 14px;
}
</style>
