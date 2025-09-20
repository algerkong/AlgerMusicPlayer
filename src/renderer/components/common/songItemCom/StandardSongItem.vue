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
    class="standard-song-item"
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
          <n-ellipsis
            class="text-ellipsis"
            line-clamp="1"
            :class="{ 'text-green-500': isPlaying }"
            >{{ item.name }}</n-ellipsis
          >
        </div>
        <div class="song-item-content-name flex items-center">
          <div class="song-tags mr-2">
              <span v-if="getHighestQuality(item)" :class="getQualityClass(getHighestQuality(item))">
                {{ getHighestQuality(item) }}
              </span>
            <span v-if="item.fee === 1" class="song-tag vip-tag">VIP</span>
          </div>
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
        <n-tooltip v-if="isNext" trigger="hover" :z-index="9999999" :delay="400">
          <template #trigger>
            <div class="song-item-operating-next" @click.stop="onPlayNext">
              <i class="iconfont ri-skip-forward-fill"></i>
            </div>
          </template>
          {{ t('songItem.menu.playNext') }}
        </n-tooltip>
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
import { NCheckbox, NEllipsis, NImage, NTooltip } from 'naive-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';

import BaseSongItem from './BaseSongItem.vue';

const { t } = useI18n();
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

// 从playerStore和baseItem获取响应式状态
const play = computed(() => playerStore.isPlay);
const isPlaying = computed(() => baseItem.value?.isPlaying || false);
const playLoading = computed(() => baseItem.value?.playLoading || false);
const isFavorite = computed(() => baseItem.value?.isFavorite || false);
const artists = computed(() => baseItem.value?.artists || []);

// 包装方法，避免直接访问可能为undefined的ref
const onToggleSelect = () => {
  baseItem.value?.toggleSelect();
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
const onPlayNext = () => {
  baseItem.value?.handlePlayNext();
};
// ==================== 音质判断逻辑 ====================
/**
 * 判断歌曲的最高音质
 * @param song 歌曲对象
 */
const getHighestQuality = (song: SongResult): 'Hi-Res' | 'SQ' | 'HQ' | null => {
  if (song.hr && song.hr.size > 0) return 'Hi-Res';
  if (song.sq && song.sq.size > 0) return 'SQ';
  if (song.h && song.h.size > 0) return 'HQ';
  return null;
};

/**
 * 根据音质获取对应的CSS类
 * @param quality 音质字符串
 */
const getQualityClass = (quality: string | null): string => {
  if (!quality) return '';
  switch (quality) {
    case 'Hi-Res': return 'song-tag hires-tag';
    case 'SQ': return 'song-tag sq-tag';
    case 'HQ': return 'song-tag hq-tag';
    default: return '';
  }
};
// ============================================================
</script>

<style lang="scss" scoped>
.standard-song-item {
  &:hover {
    @apply bg-light-100 dark:bg-dark-100;
  }

  .song-item-img {
    @apply w-12 h-12 rounded-2xl mr-4;
  }

  .song-item-content {
    @apply flex-1;

    &-title {
      @apply text-base text-gray-900 dark:text-white;
    }

    &-name {
      @apply text-xs text-gray-500 dark:text-gray-400;
    }
  }

  .song-item-operating {
    @apply flex items-center rounded-full ml-4 border dark:border-gray-700 border-gray-200 bg-light dark:bg-black;

    .iconfont {
      @apply text-xl;
    }

    .icon-likefill {
      @apply text-xl transition text-gray-500 dark:text-gray-400 hover:text-red-500;
    }

    &-like {
      @apply mr-2 cursor-pointer ml-4 transition-all;
    }

    &-next {
      @apply mr-2 cursor-pointer transition-all;

      .iconfont {
        @apply text-xl transition text-gray-500 dark:text-gray-400 hover:text-green-500;
      }
    }

    .like-active {
      @apply text-red-500 dark:text-red-500;
    }

    &-play {
      @apply cursor-pointer rounded-full w-10 h-10 flex justify-center items-center transition
             border dark:border-gray-700 border-gray-200 text-gray-900 dark:text-white;

      &:hover,
      &.bg-green-600 {
        @apply bg-green-500 border-green-500 text-white;
      }
    }
  }

  .song-item-select {
    @apply mr-3 cursor-pointer;
  }
}

// ==================== 标签样式 ====================
.song-tags {
  @apply flex items-center flex-shrink-0;
}

.song-tag {
  @apply text-xs px-1 py-0.5 rounded border;
  transform: scale(0.85);
  transform-origin: left center;
  letter-spacing: 0.5px;
  background-color: transparent !important;
}

.hires-tag {
  @apply text-red-600 border-red-500/80 dark:text-red-400 dark:border-red-500/70;
}

.sq-tag {
  @apply text-amber-600 border-amber-500/80 dark:text-amber-400 dark:border-amber-500/70;
}

.hq-tag {
  @apply text-green-600 border-green-500/80 dark:text-green-400 dark:border-green-500/70;
}

.vip-tag {
  @apply text-purple-600 border-purple-500/80 dark:text-purple-400 dark:border-purple-500/70;
}

.compact-song-item .song-item-content-compact-artist {
  @apply flex items-center;
  .song-tags {
    margin-right: 2px;
  }
}

.standard-song-item .song-item-content-name {
  @apply flex items-center;
  .song-tags {
    margin-right: 4px;
  }
}
// ======================================================
</style>
