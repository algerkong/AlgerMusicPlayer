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
    class="mini-song-item"
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
        <div class="song-item-content-title">
          <n-ellipsis class="text-ellipsis" line-clamp="1" :class="{ 'text-green-500': isPlaying }">
            {{ item.name }}
          </n-ellipsis>
        </div>
        <div class="song-item-content-name">
          <n-ellipsis class="text-ellipsis" line-clamp="1">
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
      <div class="song-item-operating">
        <div v-if="favorite" class="song-item-operating-like">
          <i
            class="iconfont icon-likefill"
            :class="{ 'like-active': isFavorite }"
            @click.stop="onToggleFavorite"
          ></i>
        </div>
        <div
          class="song-item-operating-play bg-gray-300 dark:bg-gray-800 animate__animated"
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
.mini-song-item {
  padding: 0.5rem; /* p-2 */
  border-radius: 0.75rem; /* rounded-xl */

  &:hover {
    background-color: rgb(249 250 251); /* bg-gray-50 */
  }

  .song-item-img {
    width: 2.5rem; /* w-10 */
    height: 2.5rem; /* h-10 */
    margin-right: 0.5rem; /* mr-2 */
    border-radius: 0.75rem; /* rounded-xl */
  }

  .song-item-content {
    flex: 1;

    &-title {
      font-size: 0.875rem; /* text-sm */
      line-height: 1.25rem;
      color: rgb(17 24 39); /* text-gray-900 */
    }

    &-name {
      font-size: 0.75rem; /* text-xs */
      line-height: 1rem;
      color: rgb(107 114 128); /* text-gray-500 */
    }
  }

  .song-item-operating {
    display: flex;
    align-items: center;
    border-radius: 9999px; /* rounded-full */
    margin-left: 1rem; /* ml-4 */
    padding-left: 0.5rem; /* pl-2 */
    border-width: 1px;
    border-color: rgb(229 231 235); /* border-gray-200 */
    background-color: #fff; /* bg-light fallback */

    .iconfont {
      font-size: 1rem; /* text-base */
    }

    &-like {
      margin-right: 0.25rem; /* mr-1 */
      margin-left: 0.25rem; /* ml-1 */
      cursor: pointer;

      .icon-likefill {
        font-size: 1rem;
        transition-property: color;
        transition-duration: 0.15s;
        color: rgb(107 114 128); /* text-gray-500 */

        &:hover {
          color: rgb(239 68 68); /* hover:text-red-500 */
        }
      }

      .like-active {
        color: rgb(239 68 68) !important; /* text-red-500 */
      }
    }

    &-play {
      cursor: pointer;
      border-radius: 9999px; /* rounded-full */
      width: 2rem; /* w-8 */
      height: 2rem; /* h-8 */
      display: flex;
      justify-content: center;
      align-items: center;
      transition-property: all;
      transition-duration: 0.15s;
      border-width: 1px;
      border-color: rgb(229 231 235); /* border-gray-200 */
      color: rgb(17 24 39); /* text-gray-900 */

      &:hover,
      &.bg-green-600 {
        background-color: rgb(34 197 94); /* bg-green-500 = #22c55e */
        border-color: rgb(34 197 94);
        color: white;
      }
    }
  }
}

/* dark mode */
.dark .mini-song-item {
  &:hover {
    background-color: rgb(31 41 55); /* dark:bg-gray-800 */
  }

  .song-item-content {
    &-title {
      color: white;
    }

    &-name {
      color: rgb(156 163 175); /* dark:text-gray-400 */
    }
  }

  .song-item-operating {
    border-color: rgb(55 65 81); /* dark:border-gray-700 */
    background-color: black; /* dark:bg-black */

    &-like .icon-likefill {
      color: rgb(156 163 175); /* dark:text-gray-400 */
    }

    &-play {
      border-color: rgb(55 65 81); /* dark:border-gray-700 */
      color: white; /* dark:text-white */
    }
  }
}
</style>
