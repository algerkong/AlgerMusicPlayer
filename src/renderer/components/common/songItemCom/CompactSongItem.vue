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
        :class="{ 'text-primary': isPlaying }"
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
          <div class="song-item-content-compact-title">
            <n-ellipsis class="text-ellipsis" line-clamp="1" :class="{ 'text-primary': isPlaying }">
              {{ item.name }}
              <span
                v-if="item.tns?.length || item.alia?.length"
                class="text-neutral-400 dark:text-neutral-500"
                >（{{ item.tns?.[0] || item.alia?.[0] }}）</span
              >
            </n-ellipsis>
          </div>
          <div class="song-item-content-compact-artist">
            <n-ellipsis line-clamp="1">
              <template v-for="(artist, index) in artists" :key="index">
                <span
                  class="cursor-pointer hover:text-primary"
                  @click.stop="onArtistClick(artist.id)"
                  >{{ artist.name }}</span
                >
                <span v-if="index < artists.length - 1"> / </span>
              </template>
            </n-ellipsis>
          </div>
        </div>
        <div class="song-item-content-compact-album">
          <n-ellipsis line-clamp="1">{{ view?.albumName || '-' }}</n-ellipsis>
        </div>
        <div class="song-item-content-compact-duration">
          {{ durationLabel }}
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
            'bg-primary': isPlaying,
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
import { computed } from 'vue';

import {
  songItemShellDefaults,
  useSongItemShell,
  type SongItemShellProps
} from '@/hooks/useSongItemShell';
import { toPlayableView } from '@/utils/playableView';

import BaseSongItem from './BaseSongItem.vue';

const props = withDefaults(defineProps<SongItemShellProps>(), songItemShellDefaults);
const emit = defineEmits(['play', 'select', 'remove-song']);

const {
  baseItem,
  play,
  isPlaying,
  playLoading,
  isFavorite,
  isHovering,
  artists,
  onToggleSelect,
  onArtistClick,
  onToggleFavorite,
  onPlayMusic,
  onMenuClick
} = useSongItemShell(props, emit);

/** P1：展示用 PlayableView；时长文本已格式化 */
const view = computed(() => toPlayableView(props.item));
const durationLabel = computed(() => view.value?.durationText || '--:--');
</script>

<style lang="scss" scoped>
.compact-song-item {
  @apply rounded-xl p-2 h-12 mb-1 border-b dark:border-gray-800 border-gray-100;

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
    @apply flex-1 flex items-center gap-2;

    &-wrapper {
      @apply flex-[2] flex items-center gap-2 min-w-0;
    }

    &-title {
      @apply flex-[2.5] min-w-0 text-sm cursor-pointer text-gray-900 dark:text-white flex items-center;
    }

    &-artist {
      @apply flex-[1.5] min-w-0 text-sm text-gray-500 dark:text-gray-400 flex items-center;
    }

    &-album {
      @apply flex-[1.5] min-w-0 text-sm text-gray-500 dark:text-gray-400 flex items-center;
    }

    &-duration {
      @apply w-14 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end;
    }
  }

  .song-item-operating-compact {
    @apply border-none bg-transparent gap-3 flex items-center justify-end min-w-[160px];

    .song-item-operating-like,
    .song-item-operating-play,
    .song-item-operating-menu {
      @apply transition-opacity duration-200;
    }

    .song-item-operating-play {
      @apply w-7 h-7 flex items-center justify-center cursor-pointer rounded-full bg-gray-300 dark:bg-gray-800 border dark:border-gray-700 border-gray-200 text-gray-900 dark:text-white;

      &:hover,
      &.bg-primary {
        background-color: var(--primary-color, #22c55e);
        border-color: var(--primary-color, #22c55e);
        color: #fff;
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
        @apply text-xl transition text-gray-500 dark:text-gray-400;
        &:hover {
          color: var(--primary-color, #22c55e);
        }
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
