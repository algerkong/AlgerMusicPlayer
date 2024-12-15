<template>
  <div class="flex gap-4 h-full p-4">
    <favorite class="flex-1 bg-[#0d0d0d] border border-[#374151] rounded-2xl overflow-hidden" />
    <history class="flex-1 bg-[#0d0d0d] border border-[#374151] rounded-2xl overflow-hidden" />
  </div>
</template>

<script setup lang="ts">
import Favorite from '@/views/favorite/index.vue';
import History from '@/views/history/index.vue';
</script>

<style scoped></style>
