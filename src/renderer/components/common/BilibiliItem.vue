<template>
  <div class="bilibili-item" @click="handleClick">
    <div class="bilibili-item-img">
      <n-image class="w-full h-full" :src="item.pic" lazy preview-disabled />
      <div class="play">
        <i class="ri-play-fill text-4xl"></i>
      </div>
      <div class="duration">{{ formatDuration(item.duration) }}</div>
    </div>
    <div class="bilibili-item-info">
      <p class="bilibili-item-title" v-html="item.title"></p>
      <p class="bilibili-item-author"><i class="ri-user-line mr-1"></i>{{ item.author }}</p>
      <div class="bilibili-item-stats">
        <span><i class="ri-play-line mr-1"></i>{{ formatNumber(item.view) }}</span>
        <span><i class="ri-chat-1-line mr-1"></i>{{ formatNumber(item.danmaku) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { IBilibiliSearchResult } from '@/types/bilibili';

const { t } = useI18n();

const props = defineProps<{
  item: IBilibiliSearchResult;
}>();

const emit = defineEmits<{
  (e: 'play', item: IBilibiliSearchResult): void;
}>();

const handleClick = () => {
  emit('play', props.item);
};

/**
 * 格式化数字显示
 */
const formatNumber = (num?: number) => {
  if (!num) return '0';
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}${t('bilibili.player.num')}`;
  }
  return num.toString();
};

/**
 * 格式化视频时长
 */
const formatDuration = (duration?: number | string) => {
  if (!duration) return '00:00:00';

  // 处理字符串格式 (例如 "4352:29")
  if (typeof duration === 'string') {
    // 检查是否是合法的格式
    if (/^\d+:\d+$/.test(duration)) {
      // 分解分钟和秒数
      const [minutes, seconds] = duration.split(':').map(Number);

      // 转换为时:分:秒格式
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return '00:00:00';
  }

  // 数字处理逻辑 (秒数转为"时:分:秒"格式)
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
</script>

<style scoped lang="scss">
.bilibili-item {
  @apply rounded-lg flex items-start hover:bg-light-200 dark:hover:bg-dark-200 p-3 transition cursor-pointer border-none;

  &-img {
    @apply w-40 rounded-lg overflow-hidden relative mr-4;
    aspect-ratio: 16/9;

    &:hover {
      .play {
        @apply opacity-80;
      }
    }

    .play {
      @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity text-white;
    }

    .duration {
      @apply absolute bottom-1 right-1 text-xs text-white px-1 py-0.5 rounded-sm bg-black/60 backdrop-blur-sm;
    }
  }

  &-info {
    @apply flex-1 overflow-hidden;
  }

  &-title {
    @apply text-gray-800 dark:text-gray-200 text-sm font-medium mb-1 line-clamp-2 leading-tight;
  }

  &-author {
    @apply text-gray-500 dark:text-gray-400 text-xs flex items-center mb-1;
  }

  &-stats {
    @apply flex items-center text-xs text-gray-500 dark:text-gray-400 gap-3;
  }
}
</style>
