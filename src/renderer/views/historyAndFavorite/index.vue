<template>
  <div class="flex gap-4 h-full pb-4">
    <favorite class="flex-item" />
    <history-list class="flex-item" />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'History'
});

import Favorite from '@/views/favorite/index.vue';
import HistoryList from '@/views/history/index.vue';
</script>

<style scoped>
.flex-item {
  @apply flex-1 bg-light-100 dark:bg-dark-100 rounded-2xl overflow-hidden;
}
</style>
