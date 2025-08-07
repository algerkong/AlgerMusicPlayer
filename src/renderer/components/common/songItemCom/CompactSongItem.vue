<template>
  <base-song-item
    :item="item"
    :selectable="selectable"
    :selected="selected"
    :can-remove="canRemove"
    :is-next="isNext"
    :index="index"
    @play="(...args) => $emit('play', ...args)"
    @select="(...args) => $emit('select', ...args)"
    @remove-song="(...args) => $emit('remove-song', ...args)"
    class="compact-song-item"
    ref="baseItem"
  >
    <!-- 索引插槽 -->
    <template #index>
      <div
        v-if="index !== undefined"
        class="song-item-index"
        :class="{ 'text-green-500': isPlaying }"
      >
        {{ index + 1 }}
      </div>
    </template>

    <!-- 选择框插槽 -->
    <template #select>
      <div v-if="baseItem && selectable" class="song-item-select" @click.stop="onToggleSelect">
        <n-checkbox :checked="selected" />
      </div>
    </template>

    <!-- 内容插槽 -->
    <template #content>
      <div class="song-item-content-compact">
        <div class="song-item-content-compact-wrapper">
          <div class="song-item-content-compact-title w-60 flex-shrink-0">
            <n-ellipsis
              class="text-ellipsis"
              line-clamp="1"
              :class="{ 'text-green-500': isPlaying }"
            >
              {{ item.name }}
            </n-ellipsis>
          </div>
          <div class="song-item-content-compact-artist">
            <n-ellipsis line-clamp="1">
              <template v-for="(artist, index) in artists" :key="index">
                <span
                  class="cursor-pointer hover:text-green-500"
                  @click.stop="onArtistClick(artist.id)"
                  >{{ artist.name }}</span
                >
                <span v-if="index < artists.length - 1"> / </span>
              </template>
            </n-ellipsis>
          </div>
        </div>
        <div class="song-item-content-compact-album">
          <n-ellipsis line-clamp="1">{{ item.al?.name || '-' }}</n-ellipsis>
        </div>
        <div class="song-item-content-compact-duration">
          {{ formatDuration(getDuration(item)) }}
        </div>
      </div>
    </template>

    <!-- 操作插槽 -->
    <template #operating>
      <div class="song-item-operating-compact">
        <div
          v-if="favorite"
          class="song-item-operating-like"
          :class="{ 'opacity-0': !isHovering && !isFavorite }"
        >
          <i
            class="iconfont icon-likefill"
            :class="{ 'like-active': isFavorite }"
            @click.stop="onToggleFavorite"
          ></i>
        </div>
        <div
          class="song-item-operating-play animate__animated"
          :class="{
            'bg-green-600': isPlaying,
            animate__flipInY: playLoading,
            'opacity-0': !isHovering && !isPlaying
          }"
          @click="onPlayMusic"
        >
          <i v-if="isPlaying && play" class="iconfont icon-stop"></i>
          <i v-else class="iconfont icon-playfill"></i>
        </div>
        <div
          class="song-item-operating-menu"
          @click.stop="onMenuClick"
          :class="{ 'opacity-0': !isHovering && !isPlaying }"
        >
          <i class="iconfont ri-more-fill"></i>
        </div>
      </div>
    </template>
  </base-song-item>
</template>

<script lang="ts" setup>
import { NCheckbox, NEllipsis } from 'naive-ui';
import { computed, ref } from 'vue';

import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';

import BaseSongItem from './BaseSongItem.vue';

const playerStore = usePlayerStore();

const props = withDefaults(
  defineProps<{
    item: SongResult;
    favorite?: boolean;
    selectable?: boolean;
    selected?: boolean;
    canRemove?: boolean;
    isNext?: boolean;
    index?: number;
  }>(),
  {
    favorite: true,
    selectable: false,
    selected: false,
    canRemove: false,
    isNext: false,
    index: undefined
  }
);

const emit = defineEmits(['play', 'select', 'remove-song']);
const baseItem = ref<InstanceType<typeof BaseSongItem>>();

// 从基础组件获取响应式状态
const play = computed(() => playerStore.isPlay);
const isPlaying = computed(() => baseItem.value?.isPlaying || false);
const playLoading = computed(() => baseItem.value?.playLoading || false);
const isFavorite = computed(() => baseItem.value?.isFavorite || false);
const isHovering = computed(() => baseItem.value?.isHovering || false);
const artists = computed(() => baseItem.value?.artists || []);

// 包装方法，避免直接访问可能为undefined的ref
const onToggleSelect = () => {
  baseItem.value?.toggleSelect();
};
const onArtistClick = (id: number) => baseItem.value?.handleArtistClick(id);
const onToggleFavorite = (event: Event) => {
  baseItem.value?.toggleFavorite(event);
  // 可选：emit 收藏事件
};
const onPlayMusic = () => {
  baseItem.value?.playMusicEvent(props.item);
  emit('play', props.item);
};
const onMenuClick = (event: MouseEvent) => baseItem.value?.handleMenuClick(event);

// 从useSongItem.ts导入格式化时长和获取时长方法
const getDuration = (item: SongResult): number => {
  if (item.duration) return item.duration;
  if (typeof item.dt === 'number') return item.dt;
  return 0;
};

const formatDuration = (ms: number): string => {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
</script>

<style lang="scss" scoped>
.compact-song-item {
  @apply rounded-lg p-2 h-12 mb-1 border-b dark:border-gray-800 border-gray-100;

  &:hover {
    @apply bg-gray-50 dark:bg-gray-700;

    .opacity-0 {
      opacity: 1;
    }
  }

  .song-item-index {
    @apply w-8 text-center text-gray-500 dark:text-gray-400 text-sm;
  }

  .song-item-select {
    @apply mr-3 cursor-pointer;
  }

  .song-item-content-compact {
    @apply flex-1 flex items-center gap-4;

    &-wrapper {
      @apply flex-1 min-w-0 flex items-center;
    }

    &-title {
      @apply text-sm cursor-pointer text-gray-900 dark:text-white flex items-center;
    }

    &-artist {
      @apply w-40 text-sm text-gray-500 dark:text-gray-400 ml-2 flex items-center;
    }

    &-album {
      @apply w-32 flex items-center text-sm text-gray-500 dark:text-gray-400;
    }

    &-duration {
      @apply w-16 flex items-center text-sm text-gray-500 dark:text-gray-400 text-right;
    }
  }

  .song-item-operating-compact {
    @apply border-none bg-transparent gap-2 flex items-center;

    .song-item-operating-like,
    .song-item-operating-play,
    .song-item-operating-menu {
      @apply transition-opacity duration-200;
    }

    .song-item-operating-play {
      @apply w-7 h-7 flex items-center justify-center cursor-pointer rounded-full bg-gray-300 dark:bg-gray-800 border dark:border-gray-700 border-gray-200 text-gray-900 dark:text-white;

      &:hover,
      &.bg-green-600 {
        @apply bg-green-500 border-green-500 text-white;
      }

      .iconfont {
        @apply text-base;
      }
    }

    .song-item-operating-like {
      @apply mr-1 ml-0 cursor-pointer;

      .iconfont {
        @apply text-base transition text-gray-500 dark:text-gray-400 hover:text-red-500;
      }
      .like-active {
        @apply text-red-500 dark:text-red-500;
      }
    }

    .song-item-operating-menu {
      @apply cursor-pointer flex items-center justify-center px-2;

      .iconfont {
        @apply text-xl transition text-gray-500 dark:text-gray-400 hover:text-green-500;
      }
    }

    .opacity-0 {
      opacity: 0;
    }
  }
}

// 全局应用
:deep(.text-ellipsis) {
  width: 100%;
}
</style>
