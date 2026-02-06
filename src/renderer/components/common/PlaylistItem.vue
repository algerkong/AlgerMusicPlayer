<template>
  <div class="playlist-item" @click="handleClick">
    <n-image
      :src="getImgUrl(item.coverImgUrl || item.picUrl || '', '100y100')"
      class="playlist-item-img"
      lazy
      preview-disabled
    />
    <div class="playlist-item-info">
      <div class="playlist-item-name">
        <n-ellipsis :line-clamp="1">{{ item.name }}</n-ellipsis>
      </div>
      <div class="playlist-item-desc">
        {{ getDescription() }}
      </div>
    </div>
    <div v-if="showCount && item.count" class="playlist-item-count">
      {{ item.count }}
    </div>
    <div v-if="showDelete" class="playlist-item-delete" @click.stop="handleDelete">
      <i class="iconfont icon-close"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { PlaylistHistoryItem } from '@/store/modules/playHistory';
import { getImgUrl } from '@/utils';

interface Props {
  item: PlaylistHistoryItem;
  showCount?: boolean;
  showDelete?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showCount: false,
  showDelete: false
});

const emit = defineEmits<{
  click: [item: PlaylistHistoryItem];
  delete: [item: PlaylistHistoryItem];
}>();

const { t } = useI18n();

const getDescription = () => {
  const parts: string[] = [];

  if (props.item.trackCount !== undefined) {
    parts.push(t('user.playlist.trackCount', { count: props.item.trackCount }));
  }

  if (props.item.creator?.nickname) {
    parts.push(props.item.creator.nickname);
  }

  return parts.join(' · ') || t('history.noDescription');
};

const handleClick = () => {
  emit('click', props.item);
};

const handleDelete = () => {
  emit('delete', props.item);
};
</script>

<style scoped lang="scss">
.playlist-item {
  @apply flex items-center px-2 py-2 rounded-xl cursor-pointer;
  @apply transition-all duration-200;
  @apply bg-light-100 dark:bg-dark-100;
  @apply hover:bg-light-200 dark:hover:bg-dark-200;
  @apply mb-2;

  &-img {
    @apply flex items-center justify-center rounded-xl;
    @apply w-[60px] h-[60px] flex-shrink-0;
    @apply bg-light-300 dark:bg-dark-300;
  }

  &-info {
    @apply ml-3 flex-1 min-w-0;
  }

  &-name {
    @apply text-gray-900 dark:text-white text-base mb-1;
  }

  &-desc {
    @apply text-sm text-gray-500 dark:text-gray-400;
  }

  &-count {
    @apply px-4 text-lg text-center min-w-[60px];
    @apply text-gray-600 dark:text-gray-400;
  }

  &-delete {
    @apply cursor-pointer rounded-full border-2 w-8 h-8 flex justify-center items-center;
    @apply border-gray-400 dark:border-gray-600;
    @apply text-gray-600 dark:text-gray-400;
    @apply hover:border-red-500 hover:text-red-500;
    @apply transition-all;
  }
}
</style>
