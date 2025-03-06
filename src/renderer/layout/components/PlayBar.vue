<template>
  <div
    class="music-play-bar"
    :class="[
      setAnimationClass('animate__bounceInUp'),
      musicFullVisible ? 'play-bar-opcity' : '',
      musicFullVisible && MusicFullRef?.config?.hidePlayBar
        ? 'animate__animated animate__slideOutDown'
        : ''
    ]"
    :style="{
      color: musicFullVisible
        ? textColors.theme === 'dark'
          ? '#000000'
          : '#ffffff'
        : store.state.theme === 'dark'
          ? '#ffffff'
          : '#000000'
    }"
  >
    <div class="music-time custom-slider">
      <n-slider
        v-model:value="timeSlider"
        :step="1"
        :max="allTime"
        :min="0"
        :format-tooltip="formatTooltip"
      ></n-slider>
    </div>
    <div class="play-bar-img-wrapper" @click="setMusicFull">
      <n-image
        :src="getImgUrl(playMusic?.picUrl, '100y100')"
        class="play-bar-img"
        lazy
        preview-disabled
      />
      <div class="hover-arrow">
        <div class="hover-content">
          <!-- <i class="ri-arrow-up-s-line text-3xl" :class="{ 'ri-arrow-down-s-line': musicFullVisible }"></i> -->
          <i
            class="text-3xl"
            :class="musicFullVisible ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'"
          ></i>
          <span class="hover-text">{{
            musicFullVisible ? t('player.playBar.collapse') : t('player.playBar.expand')
          }}</span>
        </div>
      </div>
    </div>
    <div class="music-content">
      <div class="music-content-title">
        <n-ellipsis class="text-ellipsis" line-clamp="1">
          {{ playMusic.name }}
        </n-ellipsis>
      </div>
      <div class="music-content-name">
        <n-ellipsis
          class="text-ellipsis"
          line-clamp="1"
          :tooltip="{
            contentStyle: { maxWidth: '600px' },
            zIndex: 99999
          }"
        >
          <span
            v-for="(artists, artistsindex) in artistList"
            :key="artistsindex"
            class="cursor-pointer hover:text-green-500"
            @click="handleArtistClick(artists.id)"
          >
            {{ artists.name }}{{ artistsindex < artistList.length - 1 ? ' / ' : '' }}
          </span>
        </n-ellipsis>
      </div>
    </div>
    <div class="music-buttons">
      <div class="music-buttons-prev" @click="handlePrev">
        <i class="iconfont icon-prev"></i>
      </div>
      <div class="music-buttons-play" @click="playMusicEvent">
        <i class="iconfont icon" :class="play ? 'icon-stop' : 'icon-play'"></i>
      </div>
      <div class="music-buttons-next" @click="handleNext">
        <i class="iconfont icon-next"></i>
      </div>
    </div>
    <div class="audio-button">
      <div class="audio-volume custom-slider">
        <div class="volume-icon" @click="mute">
          <i class="iconfont" :class="getVolumeIcon"></i>
        </div>
        <div class="volume-slider">
          <n-slider v-model:value="volumeSlider" :step="0.01" :tooltip="false" vertical></n-slider>
        </div>
      </div>
      <n-tooltip v-if="!isMobile" trigger="hover" :z-index="9999999">
        <template #trigger>
          <i class="iconfont" :class="playModeIcon" @click="togglePlayMode"></i>
        </template>
        {{ playModeText }}
      </n-tooltip>
      <n-tooltip v-if="!isMobile" trigger="hover" :z-index="9999999">
        <template #trigger>
          <i
            class="iconfont icon-likefill"
            :class="{ 'like-active': isFavorite }"
            @click="toggleFavorite"
          ></i>
        </template>
        {{ t('player.playBar.like') }}
      </n-tooltip>
      <n-tooltip v-if="isElectron" class="music-lyric" trigger="hover" :z-index="9999999">
        <template #trigger>
          <i
            class="iconfont ri-netease-cloud-music-line"
            :class="{ 'text-green-500': isLyricWindowOpen }"
            @click="openLyricWindow"
          ></i>
        </template>
        {{ t('player.playBar.lyric') }}
      </n-tooltip>
      <n-popover
        trigger="click"
        :z-index="99999999"
        content-class="music-eq"
        raw
        :show-arrow="false"
        :delay="200"
        placement="top"
      >
        <template #trigger>
          <n-tooltip trigger="hover" :z-index="9999999">
            <template #trigger>
              <i class="iconfont ri-equalizer-line" :class="{ 'text-green-500': isEQVisible }"></i>
            </template>
            {{ t('player.playBar.eq') }}
          </n-tooltip>
        </template>
        <eq-control />
      </n-popover>
      <n-popover
        trigger="click"
        :z-index="99999999"
        content-class="music-play"
        raw
        :show-arrow="false"
        :delay="200"
        arrow-wrapper-style=" border-radius:1.5rem"
        @update-show="scrollToPlayList"
      >
        <template #trigger>
          <n-tooltip trigger="manual" :z-index="9999999">
            <template #trigger>
              <i class="iconfont icon-list"></i>
            </template>
            {{ t('player.playBar.playList') }}
          </n-tooltip>
        </template>
        <div class="music-play-list">
          <div class="music-play-list-back"></div>
          <n-virtual-list ref="palyListRef" :item-size="62" item-resizable :items="playList">
            <template #default="{ item }">
              <div class="music-play-list-content">
                <song-item :key="item.id" :item="item" mini></song-item>
              </div>
            </template>
          </n-virtual-list>
        </div>
      </n-popover>
    </div>
    <!-- 播放音乐 -->
    <music-full ref="MusicFullRef" v-model="musicFullVisible" :background="background" />
  </div>
</template>

<script lang="ts" setup>
import { useThrottleFn } from '@vueuse/core';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';

import SongItem from '@/components/common/SongItem.vue';
import EqControl from '@/components/EQControl.vue';
import {
  allTime,
  artistList,
  isLyricWindowOpen,
  nowTime,
  openLyric,
  playMusic,
  sound,
  textColors
} from '@/hooks/MusicHook';
import { audioService } from '@/services/audioService';
import type { SongResult } from '@/type/music';
import { getImgUrl, isElectron, isMobile, secondToMinute, setAnimationClass } from '@/utils';
import { showShortcutToast } from '@/utils/shortcutToast';

import MusicFull from './MusicFull.vue';

const store = useStore();
const { t } = useI18n();
// 是否播放
const play = computed(() => store.state.play as boolean);
// 播放列表
const playList = computed(() => store.state.playList as SongResult[]);
// 背景颜色
const background = ref('#000');

watch(
  () => store.state.playMusic,
  async () => {
    background.value = playMusic.value.backgroundColor as string;
  },
  { immediate: true, deep: true }
);

// 节流版本的 seek 函数
const throttledSeek = useThrottleFn((value: number) => {
  if (!sound.value) return;
  sound.value.seek(value);
  nowTime.value = value;
}, 50); // 50ms 的节流延迟

// 修改 timeSlider 计算属性
const timeSlider = computed({
  get: () => nowTime.value,
  set: throttledSeek
});

const formatTooltip = (value: number) => {
  return `${secondToMinute(value)} / ${secondToMinute(allTime.value)}`;
};

// 音量条
const audioVolume = ref(
  localStorage.getItem('volume') ? parseFloat(localStorage.getItem('volume') as string) : 1
);
const getVolumeIcon = computed(() => {
  // 0 静音 ri-volume-mute-line 0.5 ri-volume-down-line 1 ri-volume-up-line
  if (audioVolume.value === 0) {
    return 'ri-volume-mute-line';
  }
  if (audioVolume.value <= 0.5) {
    return 'ri-volume-down-line';
  }
  return 'ri-volume-up-line';
});

const volumeSlider = computed({
  get: () => audioVolume.value * 100,
  set: (value) => {
    if (!sound.value) return;
    localStorage.setItem('volume', (value / 100).toString());
    sound.value.volume(value / 100);
    audioVolume.value = value / 100;
  }
});

// 静音
const mute = () => {
  if (volumeSlider.value === 0) {
    volumeSlider.value = 30;
  } else {
    volumeSlider.value = 0;
  }
};

// 播放模式
const playMode = computed(() => store.state.playMode);
const playModeIcon = computed(() => {
  switch (playMode.value) {
    case 0:
      return 'ri-repeat-2-line';
    case 1:
      return 'ri-repeat-one-line';
    case 2:
      return 'ri-shuffle-line';
    default:
      return 'ri-repeat-2-line';
  }
});
const playModeText = computed(() => {
  switch (playMode.value) {
    case 0:
      return t('player.playBar.playMode.sequence');
    case 1:
      return t('player.playBar.playMode.loop');
    case 2:
      return t('player.playBar.playMode.random');
    default:
      return t('player.playBar.playMode.sequence');
  }
});

// 切换播放模式
const togglePlayMode = () => {
  store.commit('togglePlayMode');
};

function handleNext() {
  store.commit('nextPlay');
}

function handlePrev() {
  store.commit('prevPlay');
}

const MusicFullRef = ref<any>(null);

// 播放暂停按钮事件
const playMusicEvent = async () => {
  try {
    // 检查是否有有效的音乐对象和 URL
    if (!playMusic.value?.id || !store.state.playMusicUrl) {
      console.warn('No valid music or URL available');
      store.commit('setPlay', playMusic.value);
      return;
    }

    if (play.value) {
      // 暂停播放
      if (audioService.getCurrentSound()) {
        audioService.pause();
        store.commit('setPlayMusic', false);
      }
    } else {
      // 开始播放
      if (audioService.getCurrentSound()) {
        // 如果已经有音频实例，直接播放
        audioService.play();
      } else {
        // 如果没有音频实例，重新创建并播放
        await audioService.play(store.state.playMusicUrl, playMusic.value);
      }
      store.commit('setPlayMusic', true);
    }
  } catch (error) {
    console.error('播放出错:', error);
    store.commit('nextPlay');
  }
};

const musicFullVisible = ref(false);

// 设置musicFull
const setMusicFull = () => {
  musicFullVisible.value = !musicFullVisible.value;
  store.commit('setMusicFull', musicFullVisible.value);
  if (musicFullVisible.value) {
    store.commit('setShowArtistDrawer', false);
  }
};

const palyListRef = useTemplateRef('palyListRef');

const scrollToPlayList = (val: boolean) => {
  if (!val) return;
  setTimeout(() => {
    palyListRef.value?.scrollTo({ top: store.state.playListIndex * 62 });
  }, 50);
};

const isFavorite = computed(() => {
  return store.state.favoriteList.includes(playMusic.value.id);
});

const toggleFavorite = async (e: Event) => {
  e.stopPropagation();
  if (isFavorite.value) {
    store.commit('removeFromFavorite', playMusic.value.id);
  } else {
    store.commit('addToFavorite', playMusic.value.id);
  }
};

const openLyricWindow = () => {
  openLyric();
};

const handleArtistClick = (id: number) => {
  musicFullVisible.value = false;
  store.commit('setCurrentArtistId', id);
};

// 添加全局快捷键处理
if (isElectron) {
  window.electron.ipcRenderer.on('global-shortcut', (_, action: string) => {
    console.log('action', action);
    switch (action) {
      case 'togglePlay':
        playMusicEvent();
        showShortcutToast(
          store.state.play ? t('player.playBar.play') : t('player.playBar.pause'),
          store.state.play ? 'ri-pause-circle-line' : 'ri-play-circle-line'
        );
        break;
      case 'prevPlay':
        handlePrev();
        showShortcutToast(t('player.playBar.prev'), 'ri-skip-back-line');
        break;
      case 'nextPlay':
        handleNext();
        showShortcutToast(t('player.playBar.next'), 'ri-skip-forward-line');
        break;
      case 'volumeUp':
        if (volumeSlider.value < 100) {
          volumeSlider.value = Math.min(volumeSlider.value + 10, 100);
          showShortcutToast(
            `${t('player.playBar.volume')}${volumeSlider.value}%`,
            'ri-volume-up-line'
          );
        }
        break;
      case 'volumeDown':
        if (volumeSlider.value > 0) {
          volumeSlider.value = Math.max(volumeSlider.value - 10, 0);
          showShortcutToast(
            `${t('player.playBar.volume')}${volumeSlider.value}%`,
            'ri-volume-down-line'
          );
        }
        break;
      case 'toggleFavorite':
        toggleFavorite(new Event('click'));
        showShortcutToast(
          isFavorite.value
            ? t('player.playBar.favorite', { name: playMusic.value.name })
            : t('player.playBar.unFavorite', { name: playMusic.value.name }),
          isFavorite.value ? 'ri-heart-fill' : 'ri-heart-line'
        );
        break;
      default:
        console.log('未知的快捷键动作:', action);
        break;
    }
  });
}

// 监听播放栏显示状态
watch(
  () => MusicFullRef.value?.config?.hidePlayBar,
  (newVal) => {
    if (newVal && musicFullVisible.value) {
      // 使用 animate.css 动画，不需要手动设置样式
    }
  }
);

const isEQVisible = ref(false);
</script>

<style lang="scss" scoped>
.text-ellipsis {
  width: 100%;
}

.music-play-bar {
  @apply h-20 w-full absolute bottom-0 left-0 flex items-center box-border px-6 py-2 pt-3;
  @apply bg-light dark:bg-dark shadow-2xl shadow-gray-300;
  z-index: 9999;
  animation-duration: 0.5s !important;

  &.play-bar-opcity {
    @apply bg-transparent !important;
    box-shadow: 0 0 20px 5px #0000001d;
  }

  &.animate__slideOutDown {
    animation-duration: 0.3s !important;
    pointer-events: none;
  }

  .music-content {
    width: 160px;
    @apply ml-4;

    &-title {
      @apply text-base;
    }

    &-name {
      @apply text-xs mt-1 opacity-80;
    }
  }
}

.play-bar-img {
  @apply w-14 h-14 rounded-2xl;
}

.music-buttons {
  @apply mx-6 flex-1 flex justify-center;

  .iconfont {
    @apply text-2xl transition;
    @apply hover:text-green-500;
  }

  .icon {
    @apply text-3xl;
    @apply hover:text-green-500;
  }

  @apply flex items-center;

  > div {
    @apply cursor-pointer;
  }

  &-play {
    @apply flex justify-center items-center w-20 h-12 rounded-full mx-4 transition text-gray-500;
    @apply bg-gray-100 bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-60 hover:bg-gray-200;
  }
}

.audio-volume {
  @apply flex items-center relative;
  &:hover {
    .volume-slider {
      @apply opacity-100 visible;
    }
  }
  .volume-icon {
    @apply cursor-pointer;
  }

  .iconfont {
    @apply text-2xl transition;
    @apply hover:text-green-500;
  }

  .volume-slider {
    @apply absolute opacity-0 invisible transition-all duration-300 bottom-[30px] left-1/2 -translate-x-1/2 h-[180px] px-2 py-4 rounded-xl;
    @apply bg-light dark:bg-gray-800;
    @apply border border-gray-200 dark:border-gray-700;
  }
}

.audio-button {
  @apply flex items-center mx-4;

  .iconfont {
    @apply text-2xl transition cursor-pointer m-4;
    @apply hover:text-green-500;
  }
}

.music-play {
  &-list {
    height: 50vh;
    width: 300px;
    @apply relative rounded-3xl overflow-hidden py-2;
    &-back {
      backdrop-filter: blur(20px);
      @apply absolute top-0 left-0 w-full h-full;
      @apply bg-light dark:bg-black bg-opacity-75;
    }
    &-content {
      @apply mx-2;
    }
  }
}

.mobile {
  .music-play-bar {
    @apply px-4 bottom-[70px] transition-all duration-300;
  }
  .music-time {
    display: none;
  }
  .ri-netease-cloud-music-line {
    display: none;
  }
  .audio-volume {
    display: none;
  }
  .audio-button {
    @apply mx-0;
  }
  .music-buttons {
    @apply m-0;
    &-prev,
    &-next {
      display: none;
    }
    &-play {
      @apply m-0;
    }
  }
  .music-content {
    flex: 1;
  }
}

// 自定义滑块样式
.custom-slider {
  :deep(.n-slider) {
    --n-rail-height: 4px;
    --n-rail-color: theme('colors.gray.200');
    --n-rail-color-dark: theme('colors.gray.700');
    --n-fill-color: theme('colors.green.500');
    --n-handle-size: 12px;
    --n-handle-color: theme('colors.green.500');

    &.n-slider--vertical {
      height: 100%;

      .n-slider-rail {
        width: 4px;
      }

      &:hover {
        .n-slider-rail {
          width: 6px;
        }

        .n-slider-handle {
          width: 14px;
          height: 14px;
        }
      }
    }

    .n-slider-rail {
      @apply overflow-hidden transition-all duration-200;
      @apply bg-gray-500 dark:bg-dark-300 bg-opacity-10 !important;
    }

    .n-slider-handle {
      @apply transition-all duration-200;
      opacity: 0;
    }

    &:hover .n-slider-handle {
      opacity: 1;
    }
  }
}

.play-bar-img-wrapper {
  @apply relative cursor-pointer w-14 h-14;

  .hover-arrow {
    @apply absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 rounded-2xl;
    background: rgba(0, 0, 0, 0.5);

    .hover-content {
      @apply flex flex-col items-center justify-center;

      i {
        @apply text-white mb-0.5;
      }

      .hover-text {
        @apply text-white text-xs scale-90;
      }
    }
  }

  &:hover {
    .hover-arrow {
      @apply opacity-100;
    }
  }
}

.tooltip-content {
  @apply text-sm py-1 px-2;
}

.play-bar-img {
  @apply w-14 h-14 rounded-2xl;
}

.like-active {
  @apply text-red-500 hover:text-red-600 !important;
}

.icon-loop,
.icon-single-loop {
  font-size: 1.5rem;
}

.music-time .n-slider {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0;
  border-radius: 0;
}

.music-eq {
  @apply p-4 rounded-3xl;
  backdrop-filter: blur(20px);
  @apply bg-light dark:bg-black bg-opacity-75;
}
</style>
