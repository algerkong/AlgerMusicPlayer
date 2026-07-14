<template>
  <div class="login-page h-full page-padding flex items-center justify-center">
    <div class="text-center space-y-4 max-w-md">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">登录</h1>
      <p class="text-gray-500 dark:text-gray-400">请点击窗口右上角的「登录」进行扫码。</p>
      <n-button type="primary" @click="router.push('/')">返回首页</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import { useRouter } from 'vue-router';

defineOptions({ name: 'Login' });

const router = useRouter();
</script>
