<template>
  <div class="user-page h-full page-padding flex items-center justify-center">
    <div class="text-center space-y-4">
      <n-empty description="未登录 · 在线账号功能将接入独立库" />
      <n-button v-if="userStore.user" @click="userStore.handleLogout()">退出本地登录状态</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NEmpty } from 'naive-ui';

import { useUserStore } from '@/store/modules/user';

defineOptions({ name: 'User' });

const userStore = useUserStore();
</script>
