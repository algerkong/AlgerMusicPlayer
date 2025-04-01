<!-- 迷你模式布局 -->
<template>
  <div class="mini-layout">
    <mini-play-bar />
  </div>
</template>

<script setup lang="ts">
import MiniPlayBar from '@/components/player/MiniPlayBar.vue';
</script>

<style lang="scss" scoped>
.mini-layout {
  @apply w-full h-full bg-transparent;
}
</style>
