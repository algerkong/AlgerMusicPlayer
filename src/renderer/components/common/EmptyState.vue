<template>
  <div
    class="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500"
  >
    <i :class="[icon, 'text-5xl mb-4 opacity-40']" />
    <p class="text-sm">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    text?: string;
  }>(),
  {
    icon: 'ri-music-2-line',
    text: ''
  }
);
</script>
