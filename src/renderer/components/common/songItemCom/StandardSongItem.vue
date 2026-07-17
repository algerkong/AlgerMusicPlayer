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
        v-if="view?.coverUrl"
        :src="getImgUrl(view.coverUrl, '100y100')"
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
          <n-ellipsis class="text-ellipsis" line-clamp="1" :class="{ 'text-primary': isPlaying }"
            >{{ view?.title || item.name }}
            <span v-if="view?.subtitle" class="text-neutral-400 dark:text-neutral-500"
              >（{{ view.subtitle }}）</span
            ></n-ellipsis
          >
          <span v-if="view?.isVip" class="song-badge song-badge--vip" title="VIP">VIP</span>
          <span v-if="view?.isOriginal" class="song-badge song-badge--original" title="原唱"
            >原唱</span
          >
          <span v-if="view?.isLimitedFree" class="song-badge song-badge--free" title="限免"
            >限免</span
          >
          <span v-if="view?.isDigital" class="song-badge song-badge--digital" title="数字专辑"
            >数字</span
          >
        </div>
        <div class="song-item-content-name">
          <n-ellipsis class="text-ellipsis" line-clamp="1">
            <template v-for="(artist, index) in displayArtists" :key="index">
              <span
                class="cursor-pointer hover:text-primary"
                @click.stop="onArtistClick(artist.id)"
                >{{ artist.name }}</span
              >
              <span v-if="index < displayArtists.length - 1"> / </span>
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
          :class="{ 'bg-primary': isPlaying, animate__flipInY: playLoading }"
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  songItemShellDefaults,
  useSongItemShell,
  type SongItemShellProps
} from '@/hooks/useSongItemShell';
import { getImgUrl } from '@/utils';

import BaseSongItem from './BaseSongItem.vue';

const { t } = useI18n();

const props = withDefaults(defineProps<SongItemShellProps>(), songItemShellDefaults);
const emit = defineEmits(['play', 'select', 'remove-song']);

const {
  baseItem,
  play,
  isPlaying,
  playLoading,
  isFavorite,
  artists,
  view,
  onToggleSelect,
  onImageLoad,
  onArtistClick,
  onToggleFavorite,
  onPlayMusic,
  onPlayNext
} = useSongItemShell(props, emit);

const displayArtists = computed(() => view.value?.artists || artists.value || []);
</script>

<style lang="scss" scoped>
.standard-song-item {
  &:hover {
    @apply bg-light-100 dark:bg-dark-100;
  }

  .song-item-img {
    @apply w-12 h-12 rounded-xl mr-4;
  }

  .song-item-content {
    @apply flex-1 min-w-0;

    &-title {
      @apply text-base text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0;

      .text-ellipsis {
        @apply min-w-0 flex-1;
      }
    }

    &-name {
      @apply text-xs text-gray-500 dark:text-gray-400;
    }
  }

  .song-badge {
    flex-shrink: 0;
    font-size: 0.65rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.02em;
    padding: 0.2rem 0.35rem;
    border-radius: 0.25rem;
  }

  .song-badge--vip {
    color: #92400e;
    background: linear-gradient(135deg, #fde68a 0%, #fbbf24 100%);
    border: 1px solid rgba(217, 119, 6, 0.35);
  }

  .song-badge--original {
    color: #166534;
    background: rgba(34, 197, 94, 0.14);
    border: 1px solid rgba(34, 197, 94, 0.35);
  }

  .song-badge--free {
    color: #1d4ed8;
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(59, 130, 246, 0.35);
  }

  .song-badge--digital {
    color: #6b21a8;
    background: rgba(168, 85, 247, 0.14);
    border: 1px solid rgba(168, 85, 247, 0.35);
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
        @apply text-xl transition text-gray-500 dark:text-gray-400;
        &:hover {
          color: var(--primary-color, #22c55e);
        }
      }
    }

    .like-active {
      @apply text-red-500 dark:text-red-500;
    }

    &-play {
      @apply cursor-pointer rounded-full w-10 h-10 flex justify-center items-center transition
             border dark:border-gray-700 border-gray-200 text-gray-900 dark:text-white;

      &:hover,
      &.bg-primary {
        background-color: var(--primary-color, #22c55e);
        border-color: var(--primary-color, #22c55e);
        color: #fff;
      }
    }
  }

  .song-item-select {
    @apply mr-3 cursor-pointer;
  }
}
</style>
