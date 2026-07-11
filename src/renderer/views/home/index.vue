<template>
  <div class="home-container h-full w-full">
    <n-scrollbar class="h-full">
      <div class="home-content w-full pb-32 page-padding max-w-3xl mx-auto pt-12">
        <div class="space-y-6">
          <h1 class="home-title text-3xl font-bold">LYMusic</h1>
          <p class="home-desc text-base leading-relaxed">本地音乐播放器。在线音源将接入独立库。</p>
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
          <div class="home-card chrome-surface text-sm">在线音源将接入独立库</div>
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

<style scoped>
.home-title {
  color: var(--chrome-text, #111827);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
.home-desc,
.home-card {
  color: var(--chrome-text-muted, #6b7280);
}
.home-card {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 0.75rem;
}
</style>
