<template>
  <n-drawer :show="show" height="100vh" placement="bottom" :z-index="999999999">
    <div class="mv-detail">
      <div ref="videoContainerRef" class="video-container" :class="{ 'cursor-hidden': !showCursor }">
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
              <template #rail>
                <div class="progress-rail">
                  <div class="progress-buffer" :style="{ width: `${bufferedProgress}%` }"></div>
                </div>
              </template>
            </n-slider>
          </div>

          <div class="controls-main">
            <div class="left-controls">
              <n-tooltip placement="top">
                <template #trigger>
                  <n-button quaternary circle :disabled="isPrevDisabled" @click="handlePrev">
                    <template #icon>
                      <n-icon size="24">
                        <n-spin v-if="prevLoading" size="small" />
                        <i v-else class="ri-skip-back-line"></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                上一个
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
                {{ isPlaying ? '暂停' : '播放' }}
              </n-tooltip>

              <n-tooltip placement="top">
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
                下一个
              </n-tooltip>

              <div class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</div>
            </div>

            <div class="right-controls">
              <div class="volume-control custom-slider">
                <n-tooltip placement="top">
                  <template #trigger>
                    <n-button quaternary circle @click="toggleMute">
                      <template #icon>
                        <n-icon size="24">
                          <i :class="volume === 0 ? 'ri-volume-mute-line' : 'ri-volume-up-line'"></i>
                        </n-icon>
                      </template>
                    </n-button>
                  </template>
                  {{ volume === 0 ? '取消静音' : '静音' }}
                </n-tooltip>
                <n-slider v-model:value="volume" :min="0" :max="100" :tooltip="false" class="volume-slider" />
              </div>

              <n-tooltip placement="top">
                <template #trigger>
                  <n-button quaternary circle class="play-mode-btn" @click="togglePlayMode">
                    <template #icon>
                      <n-icon size="24">
                        <i :class="playMode === 'single' ? 'ri-repeat-one-line' : 'ri-play-list-line'"></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                {{ playMode === 'single' ? '单曲循环' : '列表循环' }}
              </n-tooltip>

              <n-tooltip placement="top">
                <template #trigger>
                  <n-button quaternary circle @click="toggleFullscreen">
                    <template #icon>
                      <n-icon size="24">
                        <i :class="isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"></i>
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                {{ isFullscreen ? '退出全屏' : '全屏' }}
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
                关闭
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
              {{ playMode === 'single' ? '单曲循环' : '自动播放下一个' }}
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
import { NButton, NIcon, NSlider, NTooltip, useMessage } from 'naive-ui';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStore } from 'vuex';

import { getMvUrl } from '@/api/mv';
import { IMvItem } from '@/type/mv';

type PlayMode = 'single' | 'auto';
const PLAY_MODE = {
  Single: 'single' as PlayMode,
  Auto: 'auto' as PlayMode,
} as const;

const props = defineProps<{
  show: boolean;
  currentMv?: IMvItem;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'next', loading: (value: boolean) => void): void;
  (e: 'prev', loading: (value: boolean) => void): void;
}>();

const store = useStore();
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
  },
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
  if (store.state.playMusicUrl) {
    store.commit('setIsPlay', true);
  }
};

const handleEnded = () => {
  if (playMode.value === PLAY_MODE.Single) {
    // 单曲循环模式，重新加载当前MV
    if (props.currentMv) {
      loadMvUrl(props.currentMv);
    }
  } else {
    // 自动播放模式，触发下一个
    emit('next');
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
      videoContainerRef.value?.webkitRequestFullscreen ||
      videoContainerRef.value?.mozRequestFullScreen ||
      videoContainerRef.value?.msRequestFullscreen,
    exitFullscreen: doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen,
    fullscreenElement:
      doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement,
    fullscreenEnabled:
      doc.fullscreenEnabled || doc.webkitFullscreenEnabled || doc.mozFullScreenEnabled || doc.msFullscreenEnabled,
  };
};

// 切换全屏状态
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

// 在 setup 中初始化 message
const message = useMessage();

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
</script>

<style scoped lang="scss">
.mv-detail {
  @apply w-full h-full bg-black relative;

  .video-container {
    @apply w-full h-full relative;
    transition: cursor 0.3s ease;

    &.cursor-hidden {
      * {
        cursor: none !important;
      }

      // 控制栏区域保持鼠标可见
      .custom-controls {
        * {
          cursor: default !important;
        }

        .n-button {
          cursor: pointer !important;
        }

        .n-slider {
          cursor: pointer !important;
        }
      }
    }

    &:fullscreen,
    &:-webkit-full-screen,
    &:-moz-full-screen,
    &:-ms-fullscreen {
      background: black;
      width: 100vw;
      height: 100vh;

      // 确保全屏时标题栏正确显示
      .mv-detail-title {
        @apply px-8 py-6;

        .title {
          @apply text-xl;
        }
      }

      // 确保全屏时控制栏正确显示
      .custom-controls {
        padding: 20px 24px;
      }
    }

    &::after {
      content: '';
      @apply absolute inset-0 bg-black opacity-0 transition-opacity duration-200;
      pointer-events: none;
    }

    &:active::after {
      @apply opacity-10;
    }

    video {
      @apply w-full h-full;
    }

    .custom-controls {
      @apply absolute bottom-0 left-0 w-full transition-opacity duration-300 ease-in-out;
      background: linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
      padding: 16px 20px;

      &.controls-hidden {
        opacity: 0;
        pointer-events: none;
      }

      .progress-bar {
        @apply mb-4;

        .progress-rail {
          @apply relative w-full h-full;

          .progress-buffer {
            @apply absolute h-full bg-gray-600 rounded-full;
            transition: width 0.2s ease;
          }
        }
      }

      .controls-main {
        @apply flex justify-between items-center;

        .left-controls,
        .right-controls {
          @apply flex items-center gap-4;
        }

        .time-display {
          @apply text-sm text-white ml-2;
        }

        .volume-control {
          @apply flex items-center gap-2;

          .volume-slider {
            width: 80px;
          }
        }

        .n-button {
          @apply text-white;

          &:hover {
            @apply text-green-400;
          }
        }
      }
    }

    .play-hint {
      @apply absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 cursor-pointer;
      z-index: 10;

      .n-button {
        @apply text-white opacity-80 transform transition-all duration-300;

        &:hover {
          @apply opacity-100 scale-110;
        }
      }
    }
  }

  .mv-detail-title {
    @apply absolute w-full left-0 top-0 px-6 py-4 transition-opacity duration-300 z-50;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);

    &.title-hidden {
      opacity: 0;
    }

    .title {
      @apply text-white text-lg font-medium;
      max-width: 80%;
    }
  }
}

.custom-slider {
  :deep(.n-slider) {
    --n-rail-height: 4px;
    --n-rail-color: rgba(255, 255, 255, 0.2);
    --n-fill-color: var(--primary-color);
    --n-handle-size: 12px;
    --n-handle-color: var(--primary-color);

    &:hover {
      --n-rail-height: 6px;
      --n-handle-size: 14px;
    }

    .n-slider-rail {
      @apply overflow-hidden;
    }

    .n-slider-handle {
      @apply transition-opacity duration-200;
      opacity: 0;
    }

    &:hover .n-slider-handle {
      opacity: 1;
    }
  }
}

:root {
  --primary-color: #18a058;
}

// 添加模式提示样式
.mode-hint {
  @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2;
  @apply flex flex-col items-center justify-center;
  @apply bg-black bg-opacity-70 rounded-lg p-4;
  z-index: 20;

  .mode-icon {
    @apply text-white mb-2;
  }

  .mode-text {
    @apply text-white text-sm;
  }
}

// 添加过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 添加 tooltip 样式
:deep(.n-tooltip) {
  padding: 4px 8px;
  font-size: 12px;
}

// 调左侧控制按钮的样式
.left-controls {
  @apply flex items-center gap-2;

  .time-display {
    @apply text-sm text-white ml-4; // 增加时间显示的左边距
  }
}

// 可以添加按钮禁用状态的样式
:deep(.n-button--disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

// 添加加载动画样式
:deep(.n-spin) {
  .n-spin-body {
    @apply text-white;
    width: 20px;
    height: 20px;
  }
}

// 添加视频播放器样式
.video-player {
  @apply w-full h-full cursor-pointer;
}

// 添加点击反馈效果
.video-container {
  &::after {
    content: '';
    @apply absolute inset-0 bg-black opacity-0 transition-opacity duration-200;
    pointer-events: none;
  }

  &:active::after {
    @apply opacity-10;
  }
}

// 添加鼠标隐藏样式
.video-container {
  @apply w-full h-full relative;
  transition: cursor 0.3s ease;

  &.cursor-hidden {
    * {
      cursor: none !important;
    }

    // 控制栏区域保持鼠标可见
    .custom-controls {
      * {
        cursor: default !important;
      }

      .n-button {
        cursor: pointer !important;
      }

      .n-slider {
        cursor: pointer !important;
      }
    }
  }
}
</style>
