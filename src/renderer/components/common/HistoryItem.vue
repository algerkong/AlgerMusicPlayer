<template>
  <div
    class="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl cursor-pointer transition-colors duration-200 bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200"
    @click="$emit('click')"
  >
    <n-image
      :src="imageUrl"
      class="w-[60px] h-[60px] flex-shrink-0 rounded-xl bg-light-300 dark:bg-dark-300"
      lazy
      preview-disabled
    />
    <div class="flex-1 min-w-0">
      <div class="text-base text-gray-900 dark:text-white mb-1">
        <n-ellipsis :line-clamp="1">{{ name }}</n-ellipsis>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ description }}</div>
    </div>
    <div
      v-if="showCount && count"
      class="px-4 text-lg text-center min-w-[60px] text-gray-600 dark:text-gray-400 flex-shrink-0"
    >
      {{ count }}
    </div>
    <div
      v-if="showDelete"
      class="cursor-pointer rounded-full border-2 w-8 h-8 flex flex-shrink-0 justify-center items-center border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-500 hover:text-red-500 transition-colors duration-200"
      @click.stop="$emit('delete')"
    >
      <i class="iconfont icon-close" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  imageUrl: string;
  name: string;
  description: string;
  count?: number;
  showCount?: boolean;
  showDelete?: boolean;
}>();

defineEmits<{
  click: [];
  delete: [];
}>();
</script>
