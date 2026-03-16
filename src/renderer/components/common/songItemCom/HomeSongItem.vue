<template>
  <div
    class="home-song-card group flex cursor-pointer items-center gap-3 md:gap-4 rounded-xl md:rounded-2xl p-2 md:p-2.5 transition-all duration-300 hover:bg-light-200 dark:hover:bg-dark-200"
    @click="onPlayMusic"
    @contextmenu.prevent="onMenuClick"
  >
    <!-- Album Cover -->
    <div
      class="cover relative h-14 w-14 md:h-16 md:w-16 flex-shrink-0 overflow-hidden rounded-lg md:rounded-xl bg-neutral-100 dark:bg-neutral-800 shadow-sm"
    >
      <n-image
        v-if="item.picUrl"
        :src="getImgUrl(item.picUrl, '200y200')"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        preview-disabled
        :img-props="{
          crossorigin: 'anonymous',
          loading: 'lazy',
          alt: item.name
        }"
      />
      <div
        class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <i class="iconfont icon-playfill text-lg md:text-xl text-white drop-shadow-lg"></i>
      </div>
    </div>

    <!-- Song Info -->
    <div class="song-info flex flex-col overflow-hidden flex-1 min-w-0">
      <n-ellipsis
        class="song-name text-sm md:text-base font-semibold text-neutral-800 dark:text-neutral-100 transition-colors duration-200 group-hover:text-primary dark:group-hover:text-white"
        :class="{ 'text-green-500': isPlaying }"
      >
        {{ item.name }}
      </n-ellipsis>
      <n-ellipsis
        class="artist-name text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5"
      >
        <template v-for="(artist, index) in artists" :key="index">
          <span class="cursor-pointer hover:text-green-500" @click.stop="onArtistClick(artist.id)">
            {{ artist.name }}
          </span>
          <span v-if="index < artists.length - 1"> / </span>
        </template>
      </n-ellipsis>
    </div>

    <!-- More Button -->
    <button
      class="more-btn flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover:bg-white dark:group-hover:bg-neutral-800 group-hover:opacity-100 hover:scale-110 active:scale-95"
      @click.stop="onMenuClick"
    >
      <i class="ri-more-fill text-sm text-neutral-600 dark:text-neutral-300"></i>
    </button>

    <!-- Dropdown Menu -->
    <song-item-dropdown
      v-if="isElectron"
      :item="item"
      :show="showDropdown"
      :x="dropdownX"
      :y="dropdownY"
      :is-favorite="isFavorite"
      :is-dislike="isDislike"
      :can-remove="canRemove"
      @update:show="showDropdown = $event"
      @play="onPlayMusic"
      @play-next="handlePlayNext"
      @download="downloadMusic"
      @download-lyric="downloadLyric(item)"
      @toggle-favorite="toggleFavorite"
      @toggle-dislike="toggleDislike"
      @remove="$emit('remove-song', $event)"
    />
  </div>
</template>

<script lang="ts" setup>
import { NEllipsis, NImage } from 'naive-ui';

import { useSongItem } from '@/hooks/useSongItem';
import type { SongResult } from '@/types/music';
import { getImgUrl, isElectron } from '@/utils';

import SongItemDropdown from './SongItemDropdown.vue';

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

// 使用公共逻辑
const {
  isPlaying,
  isFavorite,
  isDislike,
  artists,
  showDropdown,
  dropdownX,
  dropdownY,
  playMusicEvent,
  toggleFavorite,
  toggleDislike,
  handlePlayNext,
  handleMenuClick,
  handleArtistClick,
  downloadMusic,
  downloadLyric
} = useSongItem(props);

const onPlayMusic = () => {
  playMusicEvent(props.item);
  emit('play', props.item);
};

const onArtistClick = (id: number) => handleArtistClick(id);
const onMenuClick = (event: MouseEvent) => handleMenuClick(event);
</script>

<style lang="scss" scoped>
.home-song-card {
  // 所有样式都已在模板中通过 Tailwind 类定义
}
</style>
