<template>
  <div class="user-page h-full page-padding flex items-center justify-center">
    <div class="text-center space-y-4 max-w-sm">
      <template v-if="userStore.user">
        <n-avatar round :size="72" :src="userStore.user.avatarUrl || undefined" />
        <div>
          <p class="text-lg font-medium">{{ userStore.user.nickname || '已登录' }}</p>
          <p class="text-sm text-neutral-500 mt-1">
            {{ userStore.loginType === 'qr' ? '扫码登录' : '在线账号' }}
            <span v-if="userStore.isVip"> · VIP</span>
          </p>
        </div>
        <n-button @click="void userStore.handleLogout()">退出登录</n-button>
      </template>
      <template v-else>
        <n-empty description="未登录 · 请点击右上角「登录」扫码" />
        <n-button @click="router.push('/')">返回首页</n-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NAvatar, NButton, NEmpty } from 'naive-ui';
import { useRouter } from 'vue-router';

import { useUserStore } from '@/store/modules/user';

defineOptions({ name: 'User' });

const userStore = useUserStore();
const router = useRouter();
</script>
