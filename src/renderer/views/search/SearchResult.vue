<template>
  <div class="search-result-page h-full page-padding">
    <div class="max-w-3xl mx-auto pt-6 space-y-4">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">
        搜索结果:
        <span class="text-primary">{{ keyword }}</span>
      </h1>
      <n-empty description="在线音源将接入独立库" class="pt-16" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NEmpty } from 'naive-ui';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

defineOptions({ name: 'SearchResult' });

const route = useRoute();
const keyword = computed(() => String(route.query.keyword || ''));
</script>
