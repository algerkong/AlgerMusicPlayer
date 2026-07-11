<template>
  <div class="home-container h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <n-scrollbar class="h-full">
      <div class="home-content w-full pb-32 page-padding max-w-3xl mx-auto pt-12">
        <div class="space-y-6">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">LYMusic</h1>
          <p class="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
            本地音乐播放器。在线音源将接入独立库。
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <n-button type="primary" @click="router.push('/local-music')">
              <template #icon><i class="ri-folder-music-fill" /></template>
              本地音乐
            </n-button>
            <n-button @click="router.push('/search')">
              <template #icon><i class="ri-search-line" /></template>
              搜索
            </n-button>
            <n-button @click="router.push('/history')">
              <template #icon><i class="ri-history-line" /></template>
              播放历史
            </n-button>
            <n-button @click="router.push('/favorite')">
              <template #icon><i class="ri-heart-fill" /></template>
              我的收藏
            </n-button>
          </div>
          <div
            class="mt-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400"
          >
            在线音源将接入独立库
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { NButton, NScrollbar } from 'naive-ui';
import { useRouter } from 'vue-router';

defineOptions({ name: 'Home' });

const router = useRouter();
</script>
