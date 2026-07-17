<template>
  <div class="play-bar" :class="{ 'dark-theme': isDarkMode }" ref="playBarRef">
    <div class="container">
      <!-- 顶部进度条和时间 -->
      <div class="top-section">
        <!-- 进度条 -->
        <div
          class="progress-bar"
          :class="{ 'is-dragging': isDragging }"
          @mousedown="handleProgressMouseDown"
          @click.stop="handleProgressClick"
        >
          <div class="progress-track"></div>
          <div class="progress-fill" :style="{ width: `${progressPercentage}%` }"></div>
        </div>

        <!-- 时间显示 -->
        <div class="time-display">
          <span class="current-time">{{ formatTime(displayTime) }}</span>
          <span class="total-time">{{ formatTime(allTime) }}</span>
        </div>
      </div>

      <!-- 主控制区域 -->
      <div class="controls-section">
        <div class="left-controls">
          <button class="control-btn small-btn" @click="togglePlayMode">
            <i class="iconfont" :class="playModeIcon"></i>
          </button>
        </div>

        <div class="center-controls">
          <!-- 上一首 -->
          <button class="control-btn" @click="handlePrev">
            <i class="iconfont icon-prev"></i>
          </button>

          <!-- 播放/暂停 -->
          <button class="control-btn play-btn" @click="playMusicEvent">
            <i class="iconfont" :class="play ? 'icon-stop' : 'icon-play'"></i>
          </button>

          <!-- 下一首 -->
          <button class="control-btn" @click="handleNext">
            <i class="iconfont icon-next"></i>
          </button>
        </div>

        <div class="right-controls">
          <!-- 播放列表按钮 -->
          <button class="control-btn small-btn" @click="openPlayListDrawer">
            <i class="iconfont icon-list"></i>
          </button>
        </div>
      </div>

      <!-- 底部控制区域 -->
      <div class="bottom-section">
        <div class="spacer"></div>
        <!-- 音量控制 -->
        <div class="volume-control">
          <i class="iconfont" :class="getVolumeIcon" @click="mute"></i>
          <div class="volume-slider">
            <n-slider
              v-model:value="volumeSlider"
              :step="1"
              :tooltip="false"
              :disabled="isMuted"
              @wheel.prevent="handleVolumeWheel"
            ></n-slider>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { allTime, nowTime } from '@/hooks/MusicHook';
import { usePlaybackControl } from '@/hooks/usePlaybackControl';
import { usePlayBarChrome } from '@/hooks/usePlayBarChrome';
import { usePlayMode } from '@/hooks/usePlayMode';
import { useVolumeControl } from '@/hooks/useVolumeControl';
import { audioService } from '@/services/audioService';
import { secondToMinute } from '@/utils';

const props = withDefaults(
  defineProps<{
    isDark: boolean;
  }>(),
  {
    isDark: false
  }
);

const playBarRef = ref<HTMLElement | null>(null);

const { isPlaying: play, playMusicEvent, handleNext, handlePrev } = usePlaybackControl();
const { playerStore, openPlayListDrawer } = usePlayBarChrome();
const { playModeIcon, togglePlayMode } = usePlayMode();

const {
  isMuted,
  volumeSlider,
  volumeIcon: getVolumeIcon,
  mute,
  handleVolumeWheel
} = useVolumeControl();

// 进度条控制
const isDragging = ref(false);
const dragProgress = ref(0); // 拖拽时的预览进度 (0-100)

const progressPercentage = computed(() => {
  if (isDragging.value) {
    return dragProgress.value;
  }
  if (allTime.value === 0) return 0;
  return (nowTime.value / allTime.value) * 100;
});

const displayTime = computed(() => {
  if (isDragging.value) {
    return (dragProgress.value / 100) * allTime.value;
  }
  return nowTime.value;
});

const calculateProgress = (clientX: number, element: HTMLElement): number => {
  const rect = element.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return percent * 100;
};

const seekToProgress = (percentage: number) => {
  const targetTime = (percentage / 100) * allTime.value;
  audioService.seek(targetTime);
  // 不立即更新 nowTime,让音频服务的回调来更新,避免不同步
};

// 鼠标按下开始拖拽
const handleProgressMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return; // 只响应左键

  const target = e.currentTarget as HTMLElement;
  isDragging.value = true;
  dragProgress.value = calculateProgress(e.clientX, target);

  const handleMouseMove = (moveEvent: MouseEvent) => {
    if (isDragging.value) {
      dragProgress.value = calculateProgress(moveEvent.clientX, target);
    }
  };

  const handleMouseUp = () => {
    if (isDragging.value) {
      // 拖拽结束,执行跳转
      seekToProgress(dragProgress.value);
      isDragging.value = false;
    }
    // 移除事件监听
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // 防止文本选择
  e.preventDefault();
};

// 点击进度条跳转
const handleProgressClick = (e: MouseEvent) => {
  // 如果正在拖拽,不处理点击事件
  if (isDragging.value) return;

  const target = e.currentTarget as HTMLElement;
  const percentage = calculateProgress(e.clientX, target);
  seekToProgress(percentage);
};

const formatTime = (seconds: number) => secondToMinute(seconds);

const isDarkMode = computed(() => props.isDark);

// 主题颜色应用函数
const applyThemeColor = (colorValue: string) => {
  if (!colorValue || !playBarRef.value) return;

  console.log('应用主题色:', colorValue);
  const playBarElement = playBarRef.value;

  // 解析RGB值
  const rgbMatch = colorValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);

  if (rgbMatch) {
    const [_, r, g, b] = rgbMatch.map(Number);

    // 计算颜色亮度 (0-255)
    // 使用加权平均值公式: 0.299*R + 0.587*G + 0.114*B
    const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    console.log(`主题色亮度: ${brightness}/255`);

    playBarElement.style.setProperty('--fill-color', colorValue);

    // 亮度自适应处理
    if (brightness > 200) {
      // 非常亮的颜色
      // 深化主色以增加对比度
      const darkenedColor = `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`;
      playBarElement.style.setProperty('--fill-color-alt', darkenedColor);
      playBarElement.style.setProperty('--fill-color-transparent', `rgba(${r}, ${g}, ${b}, 0.5)`); // 提高透明度
      playBarElement.style.setProperty('--text-on-fill', '#000000'); // 亮色背景上用黑色文字
      playBarElement.style.setProperty('--high-contrast-color', '#000000'); // 高对比度颜色
      playBarElement.classList.add('light-theme-color');
      playBarElement.classList.remove('dark-theme-color');
    } else if (brightness < 50) {
      // 非常暗的颜色
      // 提亮主色以增加可见性
      const lightenedColor = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`;
      playBarElement.style.setProperty('--fill-color-alt', lightenedColor);
      playBarElement.style.setProperty('--fill-color-transparent', `rgba(${r}, ${g}, ${b}, 0.7)`); // 提高透明度
      playBarElement.style.setProperty('--text-on-fill', '#ffffff'); // 暗色背景上用白色文字
      playBarElement.style.setProperty('--high-contrast-color', '#ffffff'); // 高对比度颜色
      playBarElement.classList.add('dark-theme-color');
      playBarElement.classList.remove('light-theme-color');
    } else {
      // 普通亮度颜色，正常处理
      playBarElement.style.setProperty('--fill-color-alt', colorValue); // 保持一致
      playBarElement.style.setProperty('--fill-color-transparent', `rgba(${r}, ${g}, ${b}, 0.25)`);
      // 根据亮度决定文本颜色
      const textColor = brightness > 125 ? '#000000' : '#ffffff';
      playBarElement.style.setProperty('--text-on-fill', textColor);
      playBarElement.style.setProperty('--high-contrast-color', textColor);
      playBarElement.classList.remove('light-theme-color');
      playBarElement.classList.remove('dark-theme-color');
    }

    const lightenedColor = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
    playBarElement.style.setProperty('--fill-color-light', lightenedColor);
  } else {
    // 无法解析RGB值时的默认设置
    playBarElement.style.setProperty('--fill-color', colorValue);
    playBarElement.style.setProperty('--fill-color-transparent', `${colorValue}40`);
    playBarElement.style.setProperty('--fill-color-light', `${colorValue}80`);
    playBarElement.style.setProperty('--fill-color-alt', colorValue);
    playBarElement.style.setProperty('--text-on-fill', '#ffffff');
    playBarElement.style.setProperty('--high-contrast-color', '#ffffff');
  }
};

// 封面 primaryColor 或全局 --primary-color
watch(
  () => playerStore.playMusic.primaryColor,
  (newVal) => {
    const fallback =
      typeof getComputedStyle !== 'undefined'
        ? getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()
        : '';
    const color = (newVal as string) || fallback;
    if (color) applyThemeColor(color);
  },
  { immediate: true }
);

onMounted(() => {
  setTimeout(() => {
    const fromStore = playerStore.playMusic?.primaryColor as string | undefined;
    const fromCss = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color')
      .trim();
    const color = fromStore || fromCss;
    if (color) applyThemeColor(color);
  }, 50);
});
</script>

<style lang="scss" scoped>
.play-bar {
  @apply w-full;
  border-radius: 12px;
  transition: all 0.3s ease;

  /* 默认变量 */
  --text-on-fill: #ffffff;
  --high-contrast-color: #ffffff;

  /* 默认跟 --primary-color；有 primaryColor 时 applyThemeColor 覆盖 */
  &.dark-theme {
    --text-color: #333333;
    --muted-color: rgba(0, 0, 0, 0.6);
    --track-color: rgba(0, 0, 0, 0.2);
    --track-color-hover: rgba(0, 0, 0, 0.4);
    --fill-color: var(--primary-color, #22c55e);
    --fill-color-alt: var(--primary-color, #22c55e);
    --fill-color-transparent: rgba(255, 255, 255, 0.25);
    --fill-color-light: rgba(255, 255, 255, 0.45);
    --button-bg: rgba(0, 0, 0, 0.1);
    --button-hover: rgba(0, 0, 0, 0.2);
  }

  &:not(.dark-theme) {
    --text-color: #f1f1f1;
    --muted-color: rgba(255, 255, 255, 0.6);
    --track-color: rgba(255, 255, 255, 0.1);
    --track-color-hover: rgba(255, 255, 255, 0.2);
    --fill-color: var(--primary-color, #22c55e);
    --fill-color-alt: var(--primary-color, #22c55e);
    --fill-color-transparent: rgba(255, 255, 255, 0.25);
    --fill-color-light: rgba(255, 255, 255, 0.45);
    --button-bg: rgba(255, 255, 255, 0.05);
    --button-hover: rgba(255, 255, 255, 0.1);
  }

  /* 极亮主题色适配 */
  &.light-theme-color {
    .progress-fill {
      box-shadow:
        0 0 8px var(--fill-color-transparent),
        inset 0 0 0 1px rgba(0, 0, 0, 0.1);
    }

    .control-btn.play-btn {
      box-shadow:
        0 3px 8px var(--fill-color-transparent),
        0 1px 2px rgba(0, 0, 0, 0.3);
      color: var(--text-on-fill);
    }

    .volume-control .iconfont:hover {
      color: var(--fill-color-alt);
    }
  }

  /* 极暗主题色适配 */
  &.dark-theme-color {
    .progress-fill {
      box-shadow:
        0 0 10px var(--fill-color-transparent),
        inset 0 0 0 1px rgba(255, 255, 255, 0.2);
    }

    .control-btn.play-btn {
      box-shadow:
        0 3px 12px var(--fill-color-transparent),
        0 0 0 1px rgba(255, 255, 255, 0.2);

      .iconfont {
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      }
    }

    .volume-control .iconfont:hover {
      color: var(--fill-color-light);
    }
  }
}

.container {
  @apply flex flex-col;
}

.top-section {
  @apply mb-3;

  .progress-bar {
    @apply relative cursor-pointer h-2 mb-2 w-full;
    user-select: none;

    .progress-track {
      @apply absolute inset-0 rounded-full transition-all duration-150;
      background-color: var(--track-color);
    }

    .progress-fill {
      @apply absolute top-0 left-0 h-full rounded-full transition-all duration-150;
      background: linear-gradient(90deg, var(--fill-color), var(--fill-color-light));
      box-shadow: 0 0 8px var(--fill-color-transparent);
    }

    &:hover {
      .progress-track {
        background-color: var(--track-color-hover);
      }

      .progress-fill {
        box-shadow: 0 0 12px var(--fill-color-transparent);
      }
    }
  }

  .time-display {
    @apply flex justify-between text-base;
    color: var(--muted-color);

    .time-separator {
      @apply mx-1;
    }

    .current-time {
      opacity: 0.8;
      transition: opacity 0.3s ease;

      &:hover {
        opacity: 1;
      }
    }
  }
}

.controls-section {
  @apply flex items-center justify-between mb-4;

  .left-controls,
  .right-controls {
    @apply flex items-center;
  }

  .center-controls {
    @apply flex items-center justify-center space-x-6;
  }
}

.bottom-section {
  @apply flex items-center justify-between mt-2;
}

.control-btn {
  @apply flex items-center justify-center rounded-full outline-none border-0 transition-all duration-200;
  color: var(--text-color);
  background: transparent;
  width: 32px;
  height: 32px;
  cursor: pointer;

  &:hover {
    background-color: var(--button-bg);
    transform: scale(1.05);
  }

  &:active {
    background-color: var(--button-hover);
    transform: scale(0.95);
  }

  &.play-btn {
    background: linear-gradient(145deg, var(--fill-color), var(--fill-color-alt));
    color: var(--text-on-fill);
    width: 46px;
    height: 46px;
    box-shadow: 0 3px 8px var(--fill-color-transparent);

    &:hover {
      box-shadow: 0 4px 12px var(--fill-color-transparent);
    }

    .iconfont {
      font-size: 1.25rem;
    }
  }

  &.small-btn {
    @apply text-2xl;
    width: 28px;
    height: 28px;
  }

  .iconfont {
    @apply text-2xl;
  }
}

.volume-control {
  @apply flex items-center space-x-2;
  color: var(--text-color);

  .iconfont {
    @apply cursor-pointer text-base;
    transition:
      transform 0.2s ease,
      color 0.2s ease;

    &:hover {
      transform: scale(1.1);
      color: var(--fill-color);
    }
  }

  .volume-slider {
    @apply w-24;

    :deep(.n-slider) {
      --n-rail-height: 3px;
      --n-fill-color: var(--fill-color);
      --n-rail-color: var(--track-color);
      --n-handle-size: 12px;

      .n-slider-rail {
        @apply rounded-full;
      }

      .n-slider-rail__fill {
        background: linear-gradient(90deg, var(--fill-color), var(--fill-color-light));
        box-shadow: 0 0 6px var(--fill-color-transparent);
      }

      .n-slider-handle {
        @apply opacity-0 transition-opacity duration-200;
        background: white;
        box-shadow:
          0 0 6px var(--fill-color-transparent),
          0 0 0 1px var(--high-contrast-color);
        border: 2px solid var(--fill-color);
      }

      &:hover .n-slider-handle {
        @apply opacity-100;
      }
    }
  }
}

.spacer {
  flex: 1;
}

.like-active {
  color: var(--fill-color);
  text-shadow: 0 0 8px var(--fill-color-transparent);
}

.intelligence-active {
  color: var(--primary-color, #22c55e);
}
</style>
