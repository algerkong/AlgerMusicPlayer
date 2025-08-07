<template>
  <div
    class="lyric-window"
    :class="[lyricSetting.theme, { lyric_lock: lyricSetting.isLock }]"
    @mousedown="handleMouseDown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="drag-overlay"></div>
    <!-- 顶部控制栏 -->
    <div class="control-bar" :class="{ 'control-bar-show': showControls }">
      <div class="font-size-controls">
        <n-button-group>
          <div class="control-button" @click="decreaseFontSize">
            <i class="ri-subtract-line"></i>
          </div>
          <div class="control-button" @click="increaseFontSize">
            <i class="ri-add-line"></i>
          </div>
        </n-button-group>
        <div>{{ staticData.playMusic.name }}</div>
      </div>
      <!-- 添加播放控制按钮 -->
      <div class="play-controls">
        <div class="control-button" @click="handlePrev">
          <i class="ri-skip-back-fill"></i>
        </div>
        <div class="control-button play-button" @click="handlePlayPause">
          <i :class="dynamicData.isPlay ? 'ri-pause-fill' : 'ri-play-fill'"></i>
        </div>
        <div class="control-button" @click="handleNext">
          <i class="ri-skip-forward-fill"></i>
        </div>
      </div>
      <div class="control-buttons">
        <div class="control-button" @click="checkTheme">
          <i v-if="lyricSetting.theme === 'light'" class="ri-sun-line"></i>
          <i v-else class="ri-moon-line"></i>
        </div>
        <div
          class="control-button theme-color-button"
          :class="{ active: showThemeColorPanel }"
          @click="toggleThemeColorPanel"
        >
          <i class="ri-palette-line"></i>
        </div>
        <!-- <div class="control-button" @click="handleTop">
          <i class="ri-pushpin-line" :class="{ active: lyricSetting.isTop }"></i>
        </div> -->
        <div id="lyric-lock" class="control-button" @click="handleLock">
          <i v-if="lyricSetting.isLock" class="ri-lock-line"></i>
          <i v-else class="ri-lock-unlock-line"></i>
        </div>
        <div class="control-button" @click="handleClose">
          <i class="ri-close-line"></i>
        </div>
      </div>
    </div>

    <!-- 主题色选择面板 -->
    <theme-color-panel
      :visible="showThemeColorPanel"
      :current-color="currentHighlightColor"
      :theme="lyricSetting.theme"
      @color-change="handleColorChange"
      @close="handleThemeColorPanelClose"
    />

    <!-- 歌词显示区域 -->
    <div ref="containerRef" class="lyric-container">
      <div class="lyric-scroll">
        <div class="lyric-wrapper" :style="wrapperStyle">
          <template v-if="staticData.lrcArray?.length > 0">
            <div
              v-for="(line, index) in staticData.lrcArray"
              :key="index"
              class="lyric-line"
              :style="getDynamicLineStyle(line)"
              :class="{
                'lyric-line-current': index === currentIndex,
                'lyric-line-passed': index < currentIndex,
                'lyric-line-next': index === currentIndex + 1
              }"
            >
              <div class="lyric-text" :style="{ fontSize: `${fontSize}px` }">
                <span class="lyric-text-inner" :style="getLyricStyle(index)">
                  {{ line.text || '' }}
                </span>
              </div>
              <div
                v-if="line.trText"
                class="lyric-translation"
                :style="{ fontSize: `${fontSize * 0.6}px` }"
              >
                {{ line.trText }}
              </div>
            </div>
          </template>
          <div v-else class="lyric-empty">无歌词</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import ThemeColorPanel from '@/components/lyric/ThemeColorPanel.vue';
import { SongResult } from '@/types/music';
import {
  getCurrentLyricThemeColor,
  loadLyricThemeColor,
  saveLyricThemeColor,
  validateColor
} from '@/utils/linearColor';

defineOptions({
  name: 'Lyric'
});
const windowData = window as any;
const containerRef = ref<HTMLElement | null>(null);
const containerHeight = ref(0);
const lineHeight = ref(60);
const currentIndex = ref(0);
// 字体大小控制
const fontSize = ref(24); // 默认字体大小
const fontSizeStep = 2; // 每次整的步长
const animationFrameId = ref<number | null>(null);
const lastUpdateTime = ref(performance.now());

// 静态数据
const staticData = ref<{
  lrcArray: Array<{ text: string; trText: string }>;
  lrcTimeArray: number[];
  allTime: number;
  playMusic: SongResult;
}>({
  lrcArray: [],
  lrcTimeArray: [],
  allTime: 0,
  playMusic: {} as SongResult
});

// 动态数据
const dynamicData = ref({
  nowTime: 0,
  startCurrentTime: 0,
  nextTime: 0,
  isPlay: true
});

// 安全加载歌词设置
const loadLyricSettings = () => {
  try {
    const stored = localStorage.getItem('lyricData');
    if (stored) {
      const parsed = JSON.parse(stored);

      // 验证 highlightColor 字段
      let validatedHighlightColor = parsed.highlightColor;
      if (validatedHighlightColor && !validateColor(validatedHighlightColor)) {
        console.warn('Invalid stored highlight color, removing it');
        validatedHighlightColor = undefined;
      }

      // 确保所有必需字段存在并有效
      return {
        isTop: parsed.isTop ?? false,
        theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'dark',
        isLock: parsed.isLock ?? false,
        highlightColor: validatedHighlightColor
      };
    }
  } catch (error) {
    console.error('Failed to load lyric settings:', error);
  }

  // 返回默认设置
  return {
    isTop: false,
    theme: 'dark' as 'light' | 'dark',
    isLock: false,
    highlightColor: undefined as string | undefined
  };
};

const lyricSetting = ref(loadLyricSettings());

let hideControlsTimer: number | null = null;

const isHovering = ref(false);

// 主题色相关状态
const showThemeColorPanel = ref(false);
const currentHighlightColor = ref('#1db954');

// 计算是否栏
const showControls = computed(() => {
  if (lyricSetting.value.isLock) {
    return isHovering.value;
  }
  return true;
});

// 清除隐藏定时器
const clearHideTimer = () => {
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer);
    hideControlsTimer = null;
  }
};

// 处理鼠标进入窗口
const handleMouseEnter = () => {
  if (lyricSetting.value.isLock) {
    isHovering.value = true;
    windowData.electron.ipcRenderer.send('set-ignore-mouse', true);
  } else {
    windowData.electron.ipcRenderer.send('set-ignore-mouse', false);
  }
};

// 处理鼠标离开窗口
const handleMouseLeave = () => {
  if (!lyricSetting.value.isLock) return;
  isHovering.value = false;
  windowData.electron.ipcRenderer.send('set-ignore-mouse', false);

  // 强制重置背景色
  const lyricWindow = document.querySelector('.lyric-window') as HTMLElement;
  if (lyricWindow) {
    lyricWindow.style.background = 'transparent';
    // 使用 requestAnimationFrame 确保在下一帧重置
    requestAnimationFrame(() => {
      lyricWindow.style.background = 'transparent';
    });
  }
};

// 监听锁定状态变化
watch(
  () => lyricSetting.value.isLock,
  (newLock: boolean) => {
    if (newLock) {
      isHovering.value = false;
    }
  }
);

onMounted(() => {
  // 初始化时，如果是锁定状态，确保控制栏隐藏
  if (lyricSetting.value.isLock) {
    isHovering.value = false;
  }
});

onUnmounted(() => {
  clearHideTimer();
});

// 计算歌词滚动位置
const wrapperStyle = computed(() => {
  if (!containerHeight.value) {
    return {
      transform: 'translateY(0)',
      transition: 'none'
    };
  }

  // 计算容器中心点
  const containerCenter = containerHeight.value / 2;

  // 计算每行的实际高度
  const getLineHeight = (line: { text: string; trText: string }) => {
    const baseHeight = lineHeight.value;
    if (line.trText) {
      const extraHeight = Math.round(fontSize.value * 0.6 * 1.4);
      return baseHeight + extraHeight;
    }
    return baseHeight;
  };

  // 计算当前行之前所有行的累积高度
  let accumulatedHeight = containerHeight.value * 0.2; // 顶部padding
  for (let i = 0; i < currentIndex.value; i++) {
    if (i < staticData.value.lrcArray.length) {
      accumulatedHeight += getLineHeight(staticData.value.lrcArray[i]);
    } else {
      accumulatedHeight += lineHeight.value;
    }
  }

  // 加上当前行的一半高度，使其居中
  const currentLineHeight =
    currentIndex.value < staticData.value.lrcArray.length
      ? getLineHeight(staticData.value.lrcArray[currentIndex.value])
      : lineHeight.value;
  accumulatedHeight += currentLineHeight;

  // 计算偏移量，使当前行居中
  const targetOffset = containerCenter - accumulatedHeight;

  // 计算内容总高度（包含padding）
  let contentHeight = containerHeight.value * 0.4; // 上下padding总和
  for (const line of staticData.value.lrcArray) {
    contentHeight += getLineHeight(line);
  }

  // 计算最小和最大偏移量
  const minOffset = -(contentHeight - containerHeight.value);
  const maxOffset = 0;

  // 限制偏移量在合理范围内
  const finalOffset = Math.min(maxOffset, Math.max(minOffset, targetOffset));

  return {
    transform: `translateY(${finalOffset}px)`,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };
});

// 新增：根据是否有翻译文本动态计算每行的样式
const getDynamicLineStyle = (line: { text: string; trText: string }) => {
  // 默认行高
  const defaultHeight = lineHeight.value;

  // 如果有翻译文本，增加额外高度
  if (line.trText) {
    // 计算翻译文本的额外高度 (字体大小的0.6倍 * 行高比例1.4)
    const extraHeight = Math.round(fontSize.value * 0.6 * 1.4);
    return {
      height: `${defaultHeight + extraHeight}px`
    };
  }

  return {
    height: `${defaultHeight}px`
  };
};

// 更新容器高度和行高
const updateContainerHeight = () => {
  if (!containerRef.value) return;

  // 更新容器高度
  containerHeight.value = containerRef.value.clientHeight;

  // 计算基础行高(字体大小的2.5倍)
  const baseLineHeight = fontSize.value * 2.5;

  // 计算最大允许行高(容器高度的1/4)
  const maxAllowedHeight = containerHeight.value / 3;

  // 设置行高(不小于40px,不大于最大允许高度)
  lineHeight.value = Math.min(maxAllowedHeight, Math.max(40, baseLineHeight));
};

// 处理字体大小变化
const handleFontSizeChange = async () => {
  // 先保存字体大小
  saveFontSize();

  // 更新容器高度和行高
  updateContainerHeight();
};

// 增加字体大小
const increaseFontSize = async () => {
  if (fontSize.value < 48) {
    fontSize.value += fontSizeStep;
    await handleFontSizeChange();
  }
};

// 减小字体大小
const decreaseFontSize = async () => {
  if (fontSize.value > 12) {
    fontSize.value -= fontSizeStep;
    await handleFontSizeChange();
  }
};

// 保存字体大小到本地存储
const saveFontSize = () => {
  localStorage.setItem('lyricFontSize', fontSize.value.toString());
};

// 监听容器大小变化
onMounted(() => {
  const resizeObserver = new ResizeObserver(() => {
    updateContainerHeight();
  });

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }

  onUnmounted(() => {
    resizeObserver.disconnect();
  });
});
// 实际播放时间
const actualTime = ref(0);

// 计算当前行的进度
const currentProgress = computed(() => {
  const { startCurrentTime, nextTime } = dynamicData.value;
  if (!startCurrentTime || !nextTime) return 0;

  const duration = nextTime - startCurrentTime;
  const elapsed = actualTime.value - startCurrentTime;
  return Math.min(Math.max(elapsed / duration, 0), 1);
});

// 获取歌词样式
const getLyricStyle = (index: number) => {
  if (index !== currentIndex.value) return {};

  const progress = currentProgress.value * 100;

  // 使用更清晰的渐变实现
  return {
    background: `linear-gradient(to right, var(--highlight-color) ${progress}%, var(--text-color) ${progress}%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    // 优化字体渲染，减少发虚
    textRendering: 'optimizeLegibility' as const,
    WebkitFontSmoothing: 'antialiased' as const,
    MozOsxFontSmoothing: 'grayscale' as const,
    // 使用 transform 而不是直接的 transition 来提高性能
    transform: 'translateZ(0)', // 启用硬件加速
    backfaceVisibility: 'hidden' as const, // 减少渲染问题
    transition: 'background 0.1s linear'
  };
};

// 时间偏移量（毫秒）
const TIME_OFFSET = 400;

// 更新动画
const updateProgress = () => {
  if (!dynamicData.value.isPlay) {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
    return;
  }

  // 计算实际时间，添加偏移量
  const timeDiff = (performance.now() - lastUpdateTime.value) / 1000;
  actualTime.value = dynamicData.value.nowTime + timeDiff + TIME_OFFSET / 1000;

  // 继续动画
  animationFrameId.value = requestAnimationFrame(updateProgress);
};

// 记录上次更新时间

// 监听据更新
watch(
  () => dynamicData.value,
  (newData: any) => {
    // 更新最后更新时间
    lastUpdateTime.value = performance.now();

    // 更新实际时间，包含偏移量
    actualTime.value = newData.nowTime + TIME_OFFSET / 1000;

    // 如果正在播放且没有动画，启动动画
    if (newData.isPlay && !animationFrameId.value) {
      updateProgress();
    }
  },
  { deep: true }
);

// 监听播放状态变化
watch(
  () => dynamicData.value.isPlay,
  (isPlaying: boolean) => {
    if (isPlaying) {
      lastUpdateTime.value = performance.now();
      updateProgress();
    } else if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
  }
);

// 修改数据更新处
const handleDataUpdate = (parsedData: {
  type?: string;
  nowTime: number;
  startCurrentTime: number;
  nextTime: number;
  isPlay: boolean;
  nowIndex: number;
  lrcArray?: Array<{ text: string; trText: string }>;
  lrcTimeArray?: number[];
  allTime?: number;
  playMusic?: SongResult;
}) => {
  // 确保数据存在且格式正确
  if (!parsedData) {
    console.error('Invalid update data received:', parsedData);
    return;
  }

  // 根据数据类型处理
  if (parsedData.type === 'update') {
    // 增量更新，只更新动态数据
    dynamicData.value = {
      ...dynamicData.value,
      nowTime: parsedData.nowTime || dynamicData.value.nowTime,
      isPlay: typeof parsedData.isPlay === 'boolean' ? parsedData.isPlay : dynamicData.value.isPlay
    };

    // 更新索引（如果提供）
    if (typeof parsedData.nowIndex === 'number') {
      currentIndex.value = parsedData.nowIndex;
    }
    return;
  }

  // 完整更新或空歌词提示
  // 更新静态数据
  staticData.value = {
    lrcArray: parsedData.lrcArray || [],
    lrcTimeArray: parsedData.lrcTimeArray || [],
    allTime: parsedData.allTime || 0,
    playMusic: parsedData.playMusic || ({} as SongResult)
  };

  // 更新动态数据
  dynamicData.value = {
    nowTime: parsedData.nowTime || 0,
    startCurrentTime: parsedData.startCurrentTime || 0,
    nextTime: parsedData.nextTime || 0,
    isPlay: parsedData.isPlay
  };

  // 更新索引
  if (typeof parsedData.nowIndex === 'number') {
    currentIndex.value = parsedData.nowIndex;
  }
};

onMounted(() => {
  // 加载保存的字体大小
  const savedFontSize = localStorage.getItem('lyricFontSize');
  if (savedFontSize) {
    fontSize.value = Number(savedFontSize);
    lineHeight.value = fontSize.value * 2.5;
  }

  // 初始化容器高度
  updateContainerHeight();
  window.addEventListener('resize', updateContainerHeight);

  // 监听歌词数据
  windowData.electron.ipcRenderer.on('receive-lyric', (_, data) => {
    try {
      const parsedData = JSON.parse(data);
      handleDataUpdate(parsedData);
    } catch (error) {
      console.error('Error parsing lyric data:', error);
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight);
});

const checkTheme = () => {
  if (lyricSetting.value.theme === 'light') {
    lyricSetting.value.theme = 'dark';
  } else {
    lyricSetting.value.theme = 'light';
  }
};

// 主题色相关函数
const toggleThemeColorPanel = () => {
  showThemeColorPanel.value = !showThemeColorPanel.value;
};

const handleColorChange = (color: string) => {
  // 验证颜色有效性
  if (!validateColor(color)) {
    console.error('Invalid color received:', color);
    return;
  }

  try {
    currentHighlightColor.value = color;
    updateThemeColorWithTransition(color);

    // 更新 lyricSetting 中的 highlightColor
    lyricSetting.value.highlightColor = color;

    // 同时保存到专用的主题色存储
    saveLyricThemeColor(color);
  } catch (error) {
    console.error('Failed to handle color change:', error);
    // 恢复到默认颜色
    const defaultColor = getCurrentLyricThemeColor(lyricSetting.value.theme);
    currentHighlightColor.value = defaultColor;
    updateThemeColorWithTransition(defaultColor);
  }
};

const handleThemeColorPanelClose = () => {
  showThemeColorPanel.value = false;
};

// 导出重置函数以供将来使用
const resetThemeColor = () => {
  // 重置到默认颜色
  const defaultColor = getCurrentLyricThemeColor(lyricSetting.value.theme);

  // 更新所有相关状态
  currentHighlightColor.value = defaultColor;
  lyricSetting.value.highlightColor = undefined;
  updateThemeColorWithTransition(defaultColor);

  // 清除专用存储
  try {
    const settings = loadLyricSettings();
    delete settings.highlightColor;
    saveLyricSettings(settings);
  } catch (error) {
    console.error('Failed to reset theme color:', error);
  }
};

// 验证和修复颜色设置
const validateAndFixColorSettings = () => {
  try {
    // 检查当前高亮颜色是否有效
    if (currentHighlightColor.value && !validateColor(currentHighlightColor.value)) {
      console.warn('Current highlight color is invalid, resetting to default');
      const defaultColor = getCurrentLyricThemeColor(lyricSetting.value.theme);
      currentHighlightColor.value = defaultColor;
      lyricSetting.value.highlightColor = undefined;
      updateCSSVariable('--lyric-highlight-color', defaultColor);
    }

    // 检查 lyricSetting 中的颜色是否有效
    if (lyricSetting.value.highlightColor && !validateColor(lyricSetting.value.highlightColor)) {
      console.warn('Stored highlight color is invalid, removing it');
      lyricSetting.value.highlightColor = undefined;
    }
  } catch (error) {
    console.error('Failed to validate color settings:', error);
    // 完全重置到默认状态
    const defaultColor = getCurrentLyricThemeColor(lyricSetting.value.theme);
    currentHighlightColor.value = defaultColor;
    lyricSetting.value.highlightColor = undefined;
    updateCSSVariable('--lyric-highlight-color', defaultColor);
  }
};

// 暴露函数
defineExpose({
  resetThemeColor,
  validateAndFixColorSettings
});

const updateCSSVariable = (name: string, value: string) => {
  document.documentElement.style.setProperty(name, value);
};

const updateThemeColorWithTransition = (newColor: string) => {
  // 添加过渡类
  const lyricWindow = document.querySelector('.lyric-window');
  if (lyricWindow) {
    lyricWindow.classList.add('color-transitioning');
  }

  // 更新CSS变量
  updateCSSVariable('--lyric-highlight-color', newColor);

  // 移除过渡类
  setTimeout(() => {
    if (lyricWindow) {
      lyricWindow.classList.remove('color-transitioning');
    }
  }, 300);
};

const initializeThemeColor = () => {
  // 优先从 lyricSetting 中读取颜色
  let savedColor = lyricSetting.value.highlightColor;

  // 如果 lyricSetting 中没有，则从专用存储中读取
  if (!savedColor) {
    savedColor = loadLyricThemeColor();
    // 如果从专用存储中读取到了颜色，同步到 lyricSetting
    if (savedColor) {
      lyricSetting.value.highlightColor = savedColor;
    }
  }

  if (savedColor) {
    const optimizedColor = getCurrentLyricThemeColor(lyricSetting.value.theme);
    currentHighlightColor.value = optimizedColor;
    updateCSSVariable('--lyric-highlight-color', optimizedColor);
  } else {
    // 如果没有保存的颜色，使用默认颜色
    const defaultColor = getCurrentLyricThemeColor(lyricSetting.value.theme);
    currentHighlightColor.value = defaultColor;
    updateCSSVariable('--lyric-highlight-color', defaultColor);
  }
};

// const handleTop = () => {
//   lyricSetting.value.isTop = !lyricSetting.value.isTop;
//   windowData.electron.ipcRenderer.send('top-lyric', lyricSetting.value.isTop);
// };

const handleLock = () => {
  lyricSetting.value.isLock = !lyricSetting.value.isLock;
  windowData.electron.ipcRenderer.send('set-ignore-mouse', lyricSetting.value.isLock);
};

const handleClose = () => {
  windowData.electron.ipcRenderer.send('close-lyric');
};

// 安全保存歌词设置
const saveLyricSettings = (settings: typeof lyricSetting.value) => {
  try {
    localStorage.setItem('lyricData', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save lyric settings:', error);
  }
};

watch(
  () => lyricSetting.value,
  (newValue) => {
    saveLyricSettings(newValue);
  },
  { deep: true }
);

// 监听主题切换，自动调整颜色
watch(
  () => lyricSetting.value.theme,
  (newTheme) => {
    if (currentHighlightColor.value) {
      const optimizedColor = getCurrentLyricThemeColor(newTheme);
      currentHighlightColor.value = optimizedColor;
      updateThemeColorWithTransition(optimizedColor);
    }
  }
);

// 添加拖动相关变量
const isDragging = ref(false);
const startPosition = ref({ x: 0, y: 0 });
const lastMoveTime = ref(0);
const moveThrottleMs = 10; // 限制拖动事件发送频率，提高性能

// 处理鼠标按下事件
const handleMouseDown = (e: MouseEvent) => {
  // 如果点击的是控制按钮区域或窗口被锁定，不处理拖动
  if (
    lyricSetting.value.isLock ||
    (e.target as HTMLElement).closest('.control-buttons') ||
    (e.target as HTMLElement).closest('.font-size-controls') ||
    (e.target as HTMLElement).closest('.play-controls')
  ) {
    return;
  }

  // 只响应鼠标左键
  if (e.button !== 0) return;

  isDragging.value = true;
  startPosition.value = { x: e.screenX, y: e.screenY };
  lastMoveTime.value = performance.now();

  // 发送拖动开始信号到主进程
  windowData.electron.ipcRenderer.send('lyric-drag-start');

  // 添加全局鼠标事件监听
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return;

    // 时间节流，避免过于频繁的更新
    const now = performance.now();
    if (now - lastMoveTime.value < moveThrottleMs) return;
    lastMoveTime.value = now;

    const deltaX = e.screenX - startPosition.value.x;
    const deltaY = e.screenY - startPosition.value.y;

    // 只有在实际移动时才发送事件
    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      // 发送移动事件到主进程
      windowData.electron.ipcRenderer.send('lyric-drag-move', { deltaX, deltaY });
      startPosition.value = { x: e.screenX, y: e.screenY };
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.value) return;
    isDragging.value = false;

    // 发送拖动结束信号到主进程
    windowData.electron.ipcRenderer.send('lyric-drag-end');

    // 移除事件监听
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // 添加全局事件监听
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// 组件卸载时清理
onUnmounted(() => {
  isDragging.value = false;
});

onMounted(() => {
  const lyricLock = document.getElementById('lyric-lock');
  if (lyricLock) {
    lyricLock.onmouseenter = () => {
      if (lyricSetting.value.isLock) {
        windowData.electron.ipcRenderer.send('set-ignore-mouse', false);
      }
    };
    lyricLock.onmouseleave = () => {
      if (lyricSetting.value.isLock) {
        windowData.electron.ipcRenderer.send('set-ignore-mouse', true);
      }
    };
  }

  // 初始化主题色
  initializeThemeColor();

  // 验证和修复颜色设置
  validateAndFixColorSettings();
});

// 添加播放控制相关的函数
const handlePlayPause = () => {
  windowData.electron.ipcRenderer.send('control-back', 'playpause');
};

const handlePrev = () => {
  windowData.electron.ipcRenderer.send('control-back', 'prev');
};

const handleNext = () => {
  windowData.electron.ipcRenderer.send('control-back', 'next');
};
</script>

<style scoped>
html,
body,
#app {
  background-color: transparent !important;
  box-shadow: none !important;
  border: none !important;
}
</style>

<style lang="scss" scoped>
.lyric-window {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: transparent !important;
  user-select: none;
  transition: background-color 0.3s ease;
  cursor: default;
  border-radius: 14px;

  &.color-transitioning {
    .lyric-text-inner {
      transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    .control-button {
      i {
        transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
    }
  }

  &:hover {
    .control-bar {
      &-show {
        opacity: 1;
        visibility: visible;
      }
    }
  }

  &:active {
    cursor: grabbing;
  }

  &.dark {
    --text-color: #ffffff;
    --text-secondary: #ffffffea;
    --highlight-color: var(--lyric-highlight-color, #1ed760);
    --control-bg: rgba(124, 124, 124, 0.3);
    &:hover:not(.lyric_lock) {
      background: rgba(44, 44, 44, 0.466) !important;
    }
  }

  &.light {
    --text-color: #383838;
    --text-secondary: #282828ae;
    --highlight-color: var(--lyric-highlight-color, #1db954);
    --control-bg: rgba(38, 38, 38, 0.532);
    &:hover:not(.lyric_lock) {
      background: rgba(0, 0, 0, 0.434) !important;
    }
  }
}

.control-bar {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: start;
  padding: 0 20px;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease;
  z-index: 100;

  .font-size-controls {
    -webkit-app-region: no-drag;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .play-controls {
    position: absolute;
    top: 0px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 16px;
    -webkit-app-region: no-drag;

    .play-button {
      width: 36px;
      height: 36px;
      i {
        font-size: 24px;
      }
    }
  }

  .control-buttons {
    -webkit-app-region: no-drag;
  }
}

.control-buttons {
  display: flex;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.control-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  color: var(--text-color);
  transition: all 0.2s ease;
  &:hover {
    background: var(--control-bg);
  }

  i {
    font-size: 20px;
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.3);

    &.active {
      color: var(--highlight-color);
    }
  }

  &.theme-color-button {
    &.active {
      background: var(--control-bg);

      i {
        color: var(--highlight-color);
      }
    }
  }
}

.lyric-container {
  position: absolute;
  top: 80px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 100;
}

.lyric-scroll {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
}

.lyric-wrapper {
  will-change: transform;
  padding: 20vh 0;
  transform-origin: center center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.lyric-line {
  padding: 4px 20px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &.lyric-line-current {
    transform: scale(1.05);
    opacity: 1;

    // 当前播放歌词的特殊样式
    .lyric-text {
      // 移除阴影，避免干扰渐变效果
      text-shadow: none;

      .lyric-text-inner {
        // 为渐变文字添加轻微的外发光
        filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
        // 确保渐变效果清晰
        -webkit-font-smoothing: antialiased;
      }
    }
  }

  &.lyric-line-passed {
    opacity: 0.6;
  }
}

.lyric-text {
  font-weight: 600;
  margin-bottom: 2px;
  color: var(--text-color);
  white-space: pre-wrap;
  word-break: break-all;
  transition: transform 0.2s ease;
  line-height: 1.4;
  // 优化字体渲染
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  // 为非当前播放的歌词添加阴影效果
  text-shadow:
    0 0 2px rgba(0, 0, 0, 0.8),
    0 1px 1px rgba(0, 0, 0, 0.6),
    0 0 4px rgba(255, 255, 255, 0.2);

  .lyric-text-inner {
    transition: background 0.3s ease;
  }
}

.lyric-translation {
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  transition: font-size 0.2s ease;
  line-height: 1.4;

  // 为翻译文本也添加阴影效果，但稍微轻一些
  text-shadow:
    0 0 2px rgba(0, 0, 0, 0.7),
    0 1px 1px rgba(0, 0, 0, 0.5),
    0 0 4px rgba(255, 255, 255, 0.2),
    1px 1px 1px rgba(0, 0, 0, 0.4),
    -1px -1px 1px rgba(0, 0, 0, 0.4);
}

.lyric-empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 16px;
  padding: 20px;

  // 为空歌词提示也添加阴影效果
  text-shadow:
    0 0 2px rgba(0, 0, 0, 0.7),
    0 1px 1px rgba(0, 0, 0, 0.5),
    0 0 4px rgba(255, 255, 255, 0.2);
}

body {
  background-color: transparent !important;
  margin: 0;
}

.lyric-content {
  transition: font-size 0.2s ease;
}

.lyric-line-current {
  opacity: 1;
}

.control-bar {
  .control-buttons {
    .control-button {
      &:not(:has(.ri-lock-line)):not(:has(.ri-lock-unlock-line)) {
        .lyric_lock & {
          display: none;
        }
      }
    }
  }

  .lyric_lock & .font-size-controls {
    display: none;
  }

  .lyric_lock & .play-controls {
    display: none;
  }
}

.lyric_lock {
  background: transparent;
  &:hover {
    background: transparent;
  }

  #lyric-lock {
    position: absolute;
    top: 0;
    right: 72px;
    background: var(--control-bg);
  }
}
</style>
