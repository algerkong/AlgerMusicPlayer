<template>
  <n-drawer :show="show" height="100%" placement="bottom" :z-index="999999999" :to="`#layout-main`">
    <div class="mv-detail">
      <div
        ref="videoContainerRef"
        class="video-container"
        :class="{ 'cursor-hidden': !showCursor }"
      >
        <video
          ref="videoRef"
          :src="mvUrl"
          class="video-player"
          @ended="handleEnded"
          @timeupdate="handleTimeUpdate"
          @loadedmetadata="handleLoadedMetadata"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @click="togglePlay"
        ></video>

        <div v-if="autoPlayBlocked" class="play-hint" @click="togglePlay">
          <n-button quaternary circle size="large">
            <template #icon>
              <n-icon size="48">
                <i class="ri-play-circle-line"></i>
              </n-icon>
            </template>
          </n-button>
        </div>

        <div class="custom-controls" :class="{ 'controls-hidden': !showControls }">
          <div class="progress-bar custom-slider">
            <n-slider
              v-model:value="progress"
              :min="0"
              :max="100"
              :tooltip="false"
              :step="0.1"
              @update:value="handleProgressChange"
            >
            </n-slider>
          </div>

          <div class="controls-main">
            <div class="left-controls">
              <n-tooltip v-if="!props.noList" placement="top">
                <template #trigger>
                  <n-button quaternary circle @click="handlePrev">
                    <template #icon>
                      <n-icon size="24">
                        <n-spin v-if="prevLoading" size="small" />
                        <i v-else class="ri-skip-back-line"></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                {{ t('player.previous') }}
              </n-tooltip>

              <n-tooltip placement="top">
                <template #trigger>
                  <n-button quaternary circle @click="togglePlay">
                    <template #icon>
                      <n-icon size="24">
                        <n-spin v-if="playLoading" size="small" />
                        <i v-else :class="isPlaying ? 'ri-pause-line' : 'ri-play-line'"></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                {{ isPlaying ? t('player.pause') : t('player.play') }}
              </n-tooltip>

              <n-tooltip v-if="!props.noList" placement="top">
                <template #trigger>
                  <n-button quaternary circle @click="handleNext">
                    <template #icon>
                      <n-icon size="24">
                        <n-spin v-if="nextLoading" size="small" />
                        <i v-else class="ri-skip-forward-line"></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                {{ t('player.next') }}
              </n-tooltip>

              <div class="time-display">
                {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
              </div>
            </div>

            <div class="right-controls">
              <div v-if="!isMobile" class="volume-control custom-slider">
                <n-tooltip placement="top">
                  <template #trigger>
                    <n-button quaternary circle @click="toggleMute">
                      <template #icon>
                        <n-icon size="24">
                          <i
                            :class="volume === 0 ? 'ri-volume-mute-line' : 'ri-volume-up-line'"
                          ></i>
                        </n-icon>
                      </template>
                    </n-button>
                  </template>
                  {{ volume === 0 ? t('player.unmute') : t('player.mute') }}
                </n-tooltip>
                <n-slider
                  v-model:value="volume"
                  :min="0"
                  :max="100"
                  :tooltip="false"
                  class="volume-slider"
                />
              </div>

              <n-tooltip v-if="!props.noList" placement="top">
                <template #trigger>
                  <n-button quaternary circle class="play-mode-btn" @click="togglePlayMode">
                    <template #icon>
                      <n-icon size="24">
                        <i
                          :class="
                            playMode === 'single' ? 'ri-repeat-one-line' : 'ri-play-list-line'
                          "
                        ></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                {{
                  playMode === 'single' ? t('player.modeHint.single') : t('player.modeHint.list')
                }}
              </n-tooltip>

              <n-tooltip placement="top">
                <template #trigger>
                  <n-button quaternary circle @click="toggleFullscreen">
                    <template #icon>
                      <n-icon size="24">
                        <i
                          :class="isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"
                        ></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                {{ isFullscreen ? t('player.fullscreen.exit') : t('player.fullscreen.enter') }}
              </n-tooltip>

              <n-tooltip placement="top">
                <template #trigger>
                  <n-button quaternary circle @click="handleClose">
                    <template #icon>
                      <n-icon size="24">
                        <i class="ri-close-line"></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                {{ t('player.close') }}
              </n-tooltip>
            </div>
          </div>
        </div>

        <!-- 添加模式切换提示 -->
        <transition name="fade">
          <div v-if="showModeHint" class="mode-hint">
            <n-icon size="48" class="mode-icon">
              <i :class="playMode === 'single' ? 'ri-repeat-one-line' : 'ri-play-list-line'"></i>
            </n-icon>
            <div class="mode-text">
              {{ playMode === 'single' ? t('player.modeHint.single') : t('player.modeHint.list') }}
            </div>
          </div>
        </transition>
      </div>

      <div class="mv-detail-title" :class="{ 'title-hidden': !showControls }">
        <div class="title">
          <n-ellipsis>{{ currentMv?.name }}</n-ellipsis>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSlider, NTooltip } from 'naive-ui';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getMvUrl } from '@/api/mv';
import { IMvItem } from '@/types/mv';

const { t } = useI18n();
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

const mvUrl = ref<string>();
const playMode = ref<PlayMode>(PLAY_MODE.Auto);

const videoRef = ref<HTMLVideoElement>();
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const progress = ref(0);
const bufferedProgress = ref(0);
const volume = ref(100);
const showControls = ref(true);
let controlsTimer: NodeJS.Timeout | null = null;

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const togglePlay = () => {
  if (!videoRef.value) return;
  if (isPlaying.value) {
    videoRef.value.pause();
  } else {
    videoRef.value.play();
  }
  resetCursorTimer();
};

const toggleMute = () => {
  if (!videoRef.value) return;
  if (volume.value === 0) {
    volume.value = 100;
  } else {
    volume.value = 0;
  }
};

watch(volume, (newVolume) => {
  if (videoRef.value) {
    videoRef.value.volume = newVolume / 100;
  }
});

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

  if (videoRef.value.buffered.length > 0) {
    bufferedProgress.value = (videoRef.value.buffered.end(0) / duration.value) * 100;
  }
};

const handleLoadedMetadata = () => {
  if (!videoRef.value) return;
  duration.value = videoRef.value.duration;
};

const resetControlsTimer = () => {
  if (controlsTimer) {
    clearTimeout(controlsTimer);
  }
  showControls.value = true;
  controlsTimer = setTimeout(() => {
    if (isPlaying.value) {
      showControls.value = false;
    }
  }, 3000);
};

const handleMouseMove = () => {
  resetControlsTimer();
  resetCursorTimer();
};

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  if (controlsTimer) {
    clearTimeout(controlsTimer);
  }
  if (cursorTimer) {
    clearTimeout(cursorTimer);
  }
});

// 监听 currentMv 的变化
watch(
  () => props.currentMv,
  async (newMv) => {
    if (newMv) {
      await loadMvUrl(newMv);
    }
  }
);

const autoPlayBlocked = ref(false);

const playLoading = ref(false);

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
        console.warn('自动播放失败，可能需要用户交互:', error);
        autoPlayBlocked.value = true;
      }
    }
  } catch (error) {
    console.error('加载MV地址失败:', error);
  } finally {
    playLoading.value = false;
  }
};

const handleClose = () => {
  emit('update:show', false);
};

const handleEnded = () => {
  if (playMode.value === PLAY_MODE.Single) {
    // 单曲循环模式，重新加载当前MV
    if (props.currentMv) {
      loadMvUrl(props.currentMv);
    }
  } else {
    // 自动播放模式，触发下一个
    emit('next', (value: boolean) => {
      nextLoading.value = value;
    });
  }
};

const togglePlayMode = () => {
  playMode.value = playMode.value === PLAY_MODE.Auto ? PLAY_MODE.Single : PLAY_MODE.Auto;
  showModeHint.value = true;
  setTimeout(() => {
    showModeHint.value = false;
  }, 1500);
};

const isDragging = ref(false);

// 添加全屏相关的状态和方法
const videoContainerRef = ref<HTMLElement>();
const isFullscreen = ref(false);

// 检查是否支持全屏API
const checkFullscreenAPI = () => {
  const doc = document as any;
  return {
    requestFullscreen:
      videoContainerRef.value?.requestFullscreen ||
      (videoContainerRef.value as any)?.webkitRequestFullscreen ||
      (videoContainerRef.value as any)?.mozRequestFullScreen ||
      (videoContainerRef.value as any)?.msRequestFullscreen,
    exitFullscreen:
      doc.exitFullscreen ||
      doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.msExitFullscreen,
    fullscreenElement:
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement,
    fullscreenEnabled:
      doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.msFullscreenEnabled
  };
};

// 修改切换全屏状态的方法
const toggleFullscreen = async () => {
  const api = checkFullscreenAPI();

  if (!api.fullscreenEnabled) {
    console.warn('全屏API不可用');
    return;
  }

  try {
    if (!api.fullscreenElement) {
      await videoContainerRef.value?.requestFullscreen();
      isFullscreen.value = true;
    } else {
      await document.exitFullscreen();
      isFullscreen.value = false;
    }
  } catch (error) {
    console.error('切换全屏失败:', error);
  }
};

// 监听全屏状态变化
const handleFullscreenChange = () => {
  const api = checkFullscreenAPI();
  isFullscreen.value = !!api.fullscreenElement;
};

// 在组件挂载时添加全屏变化监听
onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
});

// 在组件卸载时移除监听
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
});

// 添加键盘快捷键支持
const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  }
};

onMounted(() => {
  // 添加到现有的 onMounted 中
  document.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  // 添加到现有的 onUnmounted 中
  document.removeEventListener('keydown', handleKeyPress);
});

// 添加提示状态
const showModeHint = ref(false);

// 添加加载状态
const prevLoading = ref(false);
const nextLoading = ref(false);

// 添加处理函数
const handlePrev = () => {
  prevLoading.value = true;
  emit('prev', (value: boolean) => {
    prevLoading.value = value;
  });
};

const handleNext = () => {
  nextLoading.value = true;
  emit('next', (value: boolean) => {
    nextLoading.value = value;
  });
};

// 添加鼠标显示状态
const showCursor = ref(true);
let cursorTimer: NodeJS.Timeout | null = null;

// 添加重置鼠标计时器的函数
const resetCursorTimer = () => {
  if (cursorTimer) {
    clearTimeout(cursorTimer);
  }
  showCursor.value = true;
  if (isPlaying.value && !showControls.value) {
    cursorTimer = setTimeout(() => {
      showCursor.value = false;
    }, 3000);
  }
};

// 监听播放状态变化
watch(isPlaying, (newValue) => {
  if (!newValue) {
    showCursor.value = true;
    if (cursorTimer) {
      clearTimeout(cursorTimer);
    }
  } else {
    resetCursorTimer();
  }
});

// 添加控制栏状态监听
watch(showControls, (newValue) => {
  if (newValue) {
    showCursor.value = true;
    if (cursorTimer) {
      clearTimeout(cursorTimer);
    }
  } else {
    resetCursorTimer();
  }
});

const isMobile = computed(() => false); // TODO: 从 settings store 获取
</script>

<style scoped lang="scss">
.mv-detail {
  @apply h-full bg-light dark:bg-black;

  &-title {
    @apply fixed top-0 left-0 right-0 p-4 z-10 transition-opacity duration-300;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);

    .title {
      @apply text-white text-lg font-bold;
    }
  }
}

.video-container {
  @apply h-full w-full relative;

  .video-player {
    @apply h-full w-full object-contain bg-black;
  }

  .play-hint {
    @apply absolute inset-0 flex items-center justify-center bg-black bg-opacity-50;
    .n-button {
      @apply text-white hover:text-green-500 transition-colors;
    }
  }

  .custom-controls {
    @apply absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);

    .controls-main {
      @apply flex justify-between items-center;

      .left-controls,
      .right-controls {
        @apply flex items-center gap-2;

        .n-button {
          @apply text-white hover:text-green-500 transition-colors;
        }

        .time-display {
          @apply text-white text-sm ml-4;
        }
      }
    }
  }
}

.mode-hint {
  @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center;

  .mode-icon {
    @apply text-white mb-2;
  }

  .mode-text {
    @apply text-white text-sm;
  }
}

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

.progress-bar {
  @apply mb-4;

  .progress-rail {
    @apply relative w-full h-1 bg-gray-600;

    .progress-buffer {
      @apply absolute top-0 left-0 h-full bg-gray-400;
    }
  }
}

.volume-control {
  @apply flex items-center gap-2;

  .volume-slider {
    width: 100px;
  }
}

.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

.cursor-hidden {
  cursor: none;
}

.title-hidden {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
