<template>
  <n-drawer
    :show="show"
    height="100%"
    placement="bottom"
    :z-index="999999999"
    :to="`#layout-main`"
    :trap-focus="false"
  >
    <div
      ref="containerRef"
      class="group relative h-full w-full bg-black overflow-hidden"
      :class="{ 'cursor-none': !showCursor && isPlaying }"
      @mousemove="handleMouseMove"
      @click="handleContainerClick"
      @dblclick="handleDoubleClick"
    >
      <!-- Video Player -->
      <video
        ref="videoRef"
        :src="mvUrl"
        class="h-full w-full object-contain"
        crossorigin="anonymous"
        playsinline
        @ended="handleEnded"
        @timeupdate="handleTimeUpdate"
        @loadedmetadata="handleLoadedMetadata"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @waiting="isBuffering = true"
        @playing="isBuffering = false"
      ></video>

      <!-- Loading / Buffering Indicator -->
      <div
        v-if="playLoading || isBuffering"
        class="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
      >
        <n-spin size="large" stroke="#10b981" />
      </div>

      <!-- Mobile: Center Play Button Overlay -->
      <div
        v-if="isMobile && showControls && !playLoading && !isBuffering"
        class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
      >
        <div
          class="bg-black/40 backdrop-blur-sm rounded-full p-4 pointer-events-auto transition-transform active:scale-95"
          @click.stop="togglePlay"
        >
          <n-icon size="48" color="white">
            <i :class="isPlaying ? 'ri-pause-fill' : 'ri-play-fill'"></i>
          </n-icon>
        </div>
      </div>

      <!-- Play Hint (Desktop) -->
      <div
        v-if="autoPlayBlocked && !isMobile"
        class="absolute inset-0 flex items-center justify-center bg-black/50 z-30 cursor-pointer"
        @click="togglePlay"
      >
        <n-button
          quaternary
          circle
          size="large"
          class="!text-white hover:!text-green-500 scale-150"
        >
          <template #icon>
            <n-icon size="48"><i class="ri-play-circle-line"></i></n-icon>
          </template>
        </n-button>
      </div>

      <!-- Top Bar (Title & Close) -->
      <div
        class="absolute top-0 left-0 right-0 p-4 z-[9999999] transition-all duration-300 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto"
        :class="{ '-translate-y-full opacity-0': !showControls }"
        style="-webkit-app-region: drag"
        @click.stop
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <div style="-webkit-app-region: no-drag">
              <n-button
                quaternary
                circle
                class="!text-white hover:!bg-white/10"
                @click.stop="handleClose"
              >
                <template #icon>
                  <n-icon size="28"><i class="ri-close-line"></i></n-icon>
                </template>
              </n-button>
            </div>
            <div class="text-white truncate font-medium text-lg">
              {{ currentMv?.name }}
            </div>

            <div v-if="currentMv?.artistName" class="text-gray-300 text-sm truncate">
              - {{ currentMv.artistName }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Mobile: More Menu (Optional) -->
          </div>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div
        class="absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-6 pt-12 px-4 md:px-6"
        :class="{ 'translate-y-full opacity-0': !showControls }"
        @click.stop
      >
        <!-- Progress Bar -->
        <div class="group/slider relative h-6 w-full flex items-center mb-2 cursor-pointer">
          <n-slider
            v-model:value="progress"
            :min="0"
            :max="100"
            :tooltip="false"
            :step="0.01"
            class="mv-slider"
            @update:value="handleProgressChange"
            @dragstart="isDragging = true"
            @dragend="isDragging = false"
          >
            <template #thumb>
              <div
                class="w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/slider:scale-100 transition-transform duration-200"
              ></div>
            </template>
          </n-slider>
          <!-- Time Display (Mobile Overlay) -->
          <div
            v-if="isDragging"
            class="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded"
          >
            {{ formatTime((progress / 100) * duration) }}
          </div>
        </div>

        <!-- Controls Row -->
        <div class="flex items-center justify-between">
          <!-- Left: Play/Pause/Nav (Desktop) -->
          <div class="flex items-center gap-2 md:gap-4">
            <!-- Mobile: Only Time -->
            <div v-if="isMobile" class="text-xs text-gray-300 font-mono">
              {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
            </div>

            <!-- Desktop Controls -->
            <template v-else>
              <n-button
                quaternary
                circle
                class="!text-white hover:!text-green-400"
                @click="handlePrev"
                :disabled="!props.currentMv"
              >
                <template #icon
                  ><n-icon size="24"><i class="ri-skip-back-line"></i></n-icon
                ></template>
              </n-button>

              <n-button
                quaternary
                circle
                class="!text-white hover:!text-green-400"
                @click="togglePlay"
              >
                <template #icon>
                  <n-icon size="32">
                    <i :class="isPlaying ? 'ri-pause-fill' : 'ri-play-fill'"></i>
                  </n-icon>
                </template>
              </n-button>

              <n-button
                quaternary
                circle
                class="!text-white hover:!text-green-400"
                @click="handleNext"
                :disabled="!props.currentMv"
              >
                <template #icon
                  ><n-icon size="24"><i class="ri-skip-forward-line"></i></n-icon
                ></template>
              </n-button>

              <div class="text-xs text-gray-300 font-mono ml-2">
                {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
              </div>
            </template>
          </div>

          <!-- Right: Volume/Mode/Fullscreen -->
          <div class="flex items-center gap-2 md:gap-4">
            <!-- Play Mode -->
            <n-tooltip trigger="hover" placement="top">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  class="!text-white hover:!text-green-400"
                  @click="togglePlayMode"
                >
                  <template #icon>
                    <n-icon size="20">
                      <i
                        :class="playMode === 'single' ? 'ri-repeat-one-line' : 'ri-play-list-line'"
                      ></i>
                    </n-icon>
                  </template>
                </n-button>
              </template>
              {{ playMode === 'single' ? t('player.modeHint.single') : t('player.modeHint.list') }}
            </n-tooltip>

            <!-- Volume (Desktop Only) -->
            <div v-if="!isMobile" class="group/volume flex items-center relative">
              <n-button
                quaternary
                circle
                class="!text-white hover:!text-green-400"
                @click="toggleMute"
              >
                <template #icon>
                  <n-icon size="20">
                    <i :class="volume === 0 ? 'ri-volume-mute-line' : 'ri-volume-up-line'"></i>
                  </n-icon>
                </template>
              </n-button>
              <div
                class="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 ease-in-out ml-2"
              >
                <n-slider
                  v-model:value="volume"
                  :min="0"
                  :max="100"
                  :tooltip="false"
                  class="mv-volume-slider"
                />
              </div>
            </div>

            <!-- Fullscreen -->
            <n-button
              quaternary
              circle
              class="!text-white hover:!text-green-400"
              @click="toggleFullscreen"
            >
              <template #icon>
                <n-icon size="20">
                  <i :class="isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"></i>
                </n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </div>

      <!-- Mode Switch Toast -->
      <transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <div
          v-if="showModeHint"
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur px-6 py-4 rounded-xl flex flex-col items-center gap-2 pointer-events-none z-50"
        >
          <n-icon size="32" class="text-green-500">
            <i :class="playMode === 'single' ? 'ri-repeat-one-line' : 'ri-play-list-line'"></i>
          </n-icon>
          <span class="text-white text-sm font-medium">
            {{ playMode === 'single' ? t('player.modeHint.single') : t('player.modeHint.list') }}
          </span>
        </div>
      </transition>

      <!-- Double Tap Toast -->
      <transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 scale-50"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-50"
      >
        <div
          v-if="doubleTapAction"
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center text-white/90"
        >
          <n-icon size="48"
            ><i
              :class="doubleTapAction === 'forward' ? 'ri-forward-10-line' : 'ri-replay-10-line'"
            ></i
          ></n-icon>
          <span class="text-sm font-bold">{{
            doubleTapAction === 'forward' ? '+10s' : '-10s'
          }}</span>
        </div>
      </transition>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints, useFullscreen, useIdle } from '@vueuse/core';
import { NButton, NIcon, NSlider, NSpin, NTooltip } from 'naive-ui';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getMvUrl } from '@/api/mv';
import { IMvItem } from '@/types/mv';

const { t } = useI18n();
const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('md');

type PlayMode = 'single' | 'auto';
const PLAY_MODE = {
  Single: 'single' as PlayMode,
  Auto: 'auto' as PlayMode
} as const;

const props = withDefaults(
  defineProps<{
    show: boolean;
    currentMv?: IMvItem;
    noList?: boolean;
  }>(),
  {
    show: false,
    currentMv: undefined,
    noList: false
  }
);

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'next', loading: (value: boolean) => void): void;
  (e: 'prev', loading: (value: boolean) => void): void;
}>();

// Refs
const containerRef = ref<HTMLElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

// State
const mvUrl = ref<string>();
const playMode = ref<PlayMode>(PLAY_MODE.Auto);
const isPlaying = ref(false);
const isBuffering = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const progress = ref(0);
const volume = ref(100);
const playLoading = ref(false);
const autoPlayBlocked = ref(false);
const isDragging = ref(false);
const showModeHint = ref(false);
const doubleTapAction = ref<'forward' | 'rewind' | null>(null);

// Controls Visibility Logic
const { idle } = useIdle(3000); // 3 seconds idle
const showControls = computed(() => {
  if (!isPlaying.value) return true; // Always show when paused
  if (isDragging.value) return true;
  if (isMobile.value) return !idle.value;
  return !idle.value || showCursor.value; // Desktop logic
});

const showCursor = ref(true);
let cursorTimer: NodeJS.Timeout | null = null;

const { isFullscreen, toggle: toggleFullscreenState } = useFullscreen(containerRef);

// Methods
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const togglePlay = () => {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play().catch(() => {
      autoPlayBlocked.value = true;
    });
  } else {
    videoRef.value.pause();
  }
};

const toggleMute = () => {
  if (!videoRef.value) return;
  volume.value = volume.value === 0 ? 100 : 0;
};

const handleProgressChange = (value: number) => {
  if (!videoRef.value || !duration.value) return;
  const newTime = (value / 100) * duration.value;
  videoRef.value.currentTime = newTime;
};

const handleTimeUpdate = () => {
  if (!videoRef.value) return;
  currentTime.value = videoRef.value.currentTime;
  if (!isDragging.value) {
    progress.value = (currentTime.value / duration.value) * 100;
  }
};

const handleLoadedMetadata = () => {
  if (!videoRef.value) return;
  duration.value = videoRef.value.duration;
};

const handleEnded = () => {
  if (playMode.value === PLAY_MODE.Single) {
    if (videoRef.value) {
      videoRef.value.currentTime = 0;
      videoRef.value.play();
    }
  } else {
    emit('next', (loading) => {
      playLoading.value = loading;
    });
  }
};

const handlePrev = () => {
  emit('prev', (loading) => {
    playLoading.value = loading;
  });
};

const handleNext = () => {
  emit('next', (loading) => {
    playLoading.value = loading;
  });
};

const togglePlayMode = () => {
  playMode.value = playMode.value === PLAY_MODE.Auto ? PLAY_MODE.Single : PLAY_MODE.Auto;
  showModeHint.value = true;
  setTimeout(() => {
    showModeHint.value = false;
  }, 1500);
};

const toggleFullscreen = () => {
  toggleFullscreenState();
};

const handleClose = () => {
  emit('update:show', false);
};

const loadMvUrl = async (mv: IMvItem) => {
  playLoading.value = true;
  autoPlayBlocked.value = false;
  try {
    const res = await getMvUrl(mv.id);
    mvUrl.value = res.data.data.url;
    await nextTick();
    if (videoRef.value) {
      try {
        await videoRef.value.play();
      } catch (error) {
        console.warn('Auto-play blocked:', error);
        autoPlayBlocked.value = true;
      }
    }
  } catch (error) {
    console.error('Failed to load MV:', error);
  } finally {
    playLoading.value = false;
  }
};

// Mouse/Touch Interaction
const handleMouseMove = () => {
  showCursor.value = true;
  if (cursorTimer) clearTimeout(cursorTimer);
  cursorTimer = setTimeout(() => {
    if (isPlaying.value && !isDragging.value) {
      showCursor.value = false;
    }
  }, 3000);
};

const handleContainerClick = () => {
  if (isMobile.value) {
    // logic handled by UI overlay
  } else {
    togglePlay();
  }
};

const handleDoubleClick = (e: MouseEvent) => {
  if (!videoRef.value) return;
  const width = containerRef.value?.clientWidth || 0;
  const x = e.clientX;

  // Left side double click -> rewind 10s
  // Right side double click -> forward 10s
  // Center -> Toggle Fullscreen (standard behavior) but let's stick to 10s skip for utility

  if (x < width / 3) {
    videoRef.value.currentTime = Math.max(0, videoRef.value.currentTime - 10);
    doubleTapAction.value = 'rewind';
  } else if (x > (width * 2) / 3) {
    videoRef.value.currentTime = Math.min(duration.value, videoRef.value.currentTime + 10);
    doubleTapAction.value = 'forward';
  } else {
    toggleFullscreen();
    return;
  }

  setTimeout(() => {
    doubleTapAction.value = null;
  }, 500);
};

// Watchers
watch(volume, (newVolume) => {
  if (videoRef.value) videoRef.value.volume = newVolume / 100;
});

watch(
  () => props.currentMv,
  async (newMv) => {
    if (newMv) await loadMvUrl(newMv);
  }
);

watch(
  () => props.show,
  (show) => {
    if (!show && videoRef.value) {
      videoRef.value.pause();
    }
  }
);

onUnmounted(() => {
  if (cursorTimer) clearTimeout(cursorTimer);
});
</script>

<style scoped>
/* Custom Slider Styles to override Naive UI default for cleaner look */
.mv-slider {
  --n-rail-height: 4px !important;
  --n-rail-color: rgba(255, 255, 255, 0.2) !important;
  --n-rail-color-hover: rgba(255, 255, 255, 0.3) !important;
  --n-fill-color: #10b981 !important;
  --n-fill-color-hover: #34d399 !important;
  --n-handle-size: 12px !important;
  --n-handle-color: #fff !important;
}

.mv-volume-slider {
  --n-rail-height: 4px !important;
  --n-rail-color: rgba(255, 255, 255, 0.2) !important;
  --n-fill-color: #fff !important;
  --n-handle-size: 10px !important;
}

/* Hide cursor when needed */
.cursor-none {
  cursor: none;
}
</style>
