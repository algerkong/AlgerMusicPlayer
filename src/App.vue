<template>
  <div class="app-container" :class="{ mobile: isMobile, noElectron: !isElectron }">
    <n-config-provider :theme="darkTheme">
      <n-dialog-provider>
        <router-view></router-view>
      </n-dialog-provider>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import { darkTheme } from 'naive-ui';
import { onMounted } from 'vue';

import { isElectron } from '@/hooks/MusicHook';
import store from '@/store';

import { isMobile } from './utils';

onMounted(() => {
  store.dispatch('initializeSettings');
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
