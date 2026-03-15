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
    class="list-song-item"
    ref="baseItem"
  >
    <!-- 选择框插槽 -->
    <template #select>
      <div v-if="baseItem && selectable" class="song-item-select" @click.stop="onToggleSelect">
        <n-checkbox :checked="selected" />
      </div>
    </template>

    <!-- 图片插槽 -->
    <template #image>
      <n-image
        v-if="item.picUrl"
        :src="getImgUrl(item.picUrl, '100y100')"
        class="song-item-img"
        preview-disabled
        :img-props="{
          crossorigin: 'anonymous'
        }"
        @load="onImageLoad"
      />
    </template>

    <!-- 内容插槽 -->
    <template #content>
      <div class="song-item-content">
        <div class="song-item-content-wrapper">
          <n-ellipsis
            class="song-item-content-title text-ellipsis"
            line-clamp="1"
            :class="{ 'text-green-500': isPlaying }"
          >
            {{ item.name }}
          </n-ellipsis>
          <div class="song-item-content-divider">-</div>
          <n-ellipsis class="song-item-content-name text-ellipsis" line-clamp="1">
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
    </template>

    <!-- 操作插槽 -->
    <template #operating>
      <div class="song-item-operating-list">
        <div v-if="favorite" class="song-item-operating-list-like">
          <i
            class="iconfont icon-likefill"
            :class="{ 'like-active': isFavorite }"
            @click.stop="onToggleFavorite"
          ></i>
        </div>
        <div
          class="song-item-operating-list-play bg-gray-300 dark:bg-gray-800 animate__animated"
          :class="{ 'bg-green-600': isPlaying, animate__flipInY: playLoading }"
          @click="onPlayMusic"
        >
          <i v-if="isPlaying && play" class="iconfont icon-stop"></i>
          <i v-else class="iconfont icon-playfill"></i>
        </div>
      </div>
    </template>
  </base-song-item>
</template>

<script lang="ts" setup>
import { NCheckbox, NEllipsis, NImage } from 'naive-ui';
import { computed, ref } from 'vue';

import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';

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
const artists = computed(() => baseItem.value?.artists || []);

// 包装方法，避免直接访问可能为undefined的ref
const onToggleSelect = () => {
  baseItem.value?.toggleSelect();
  emit('select', props.item.id, !props.selected);
};
const onImageLoad = (event: Event) => baseItem.value?.imageLoad(event);
const onArtistClick = (id: number) => baseItem.value?.handleArtistClick(id);
const onToggleFavorite = (event: Event) => {
  baseItem.value?.toggleFavorite(event);
};
const onPlayMusic = () => {
  baseItem.value?.playMusicEvent(props.item);
  emit('play', props.item);
};
</script>

<style lang="scss" scoped>
.list-song-item {
  padding: 0.5rem; /* p-2 */
  border-radius: 0.75rem; /* rounded-xl */
  margin-bottom: 0.5rem; /* mb-2 */
  border-width: 1px;
  border-color: rgb(229 231 235); /* border-gray-200 */

  &:hover {
    background-color: rgb(249 250 251); /* bg-gray-50 */
  }

  .song-item-img {
    width: 2.5rem; /* w-10 */
    height: 2.5rem; /* h-10 */
    border-radius: 0.75rem; /* rounded-xl */
    margin-right: 0.75rem; /* mr-3 */
  }

  .song-item-content {
    display: flex;
    align-items: center;
    flex: 1;

    &-wrapper {
      display: flex;
      align-items: center;
      flex: 1;
      font-size: 0.875rem; /* text-sm */
      line-height: 1.25rem;
    }

    &-title {
      flex-shrink: 0;
      max-width: 45%;
      color: rgb(17 24 39); /* text-gray-900 */
    }

    &-divider {
      margin-left: 0.5rem; /* mx-2 */
      margin-right: 0.5rem;
      color: rgb(107 114 128); /* text-gray-500 */
    }

    &-name {
      flex: 1;
      min-width: 0;
      color: rgb(107 114 128); /* text-gray-500 */
    }
  }

  .song-item-operating-list {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* gap-2 */

    &-like {
      cursor: pointer;
      transition-property: transform;
      transition-duration: 0.15s;

      &:hover {
        transform: scale(1.1); /* hover:scale-110 */
      }

      .iconfont {
        font-size: 1rem;
        color: rgb(107 114 128); /* text-gray-500 */

        &:hover {
          color: rgb(239 68 68); /* hover:text-red-500 */
        }
      }

      .like-active {
        color: rgb(239 68 68) !important;
      }
    }

    &-play {
      width: 1.75rem; /* w-7 */
      height: 1.75rem; /* h-7 */
      cursor: pointer;
      transition-property: transform;
      transition-duration: 0.15s;
      border-radius: 9999px;
      display: flex;
      justify-content: center;
      align-items: center;

      &:hover {
        transform: scale(1.1); /* hover:scale-110 */
      }

      .iconfont {
        font-size: 1rem; /* text-base */
      }

      &.bg-green-600 {
        background-color: rgb(34 197 94);
        color: white;
      }
    }
  }
}

/* dark mode */
.dark .list-song-item {
  border-color: rgb(31 41 55); /* dark:border-gray-800 */

  &:hover {
    background-color: rgb(31 41 55); /* dark:bg-gray-800 */
  }

  .song-item-content {
    &-title {
      color: white;
    }

    &-divider,
    &-name {
      color: rgb(156 163 175); /* dark:text-gray-400 */
    }
  }

  .song-item-operating-list-like .iconfont {
    color: rgb(156 163 175); /* dark:text-gray-400 */
  }
}
</style>
