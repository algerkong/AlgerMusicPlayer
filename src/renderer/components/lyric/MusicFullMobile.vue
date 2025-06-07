<template>
  <n-drawer
    v-model:show="isVisible"
    height="100%"
    placement="bottom"
    :style="{ background: playerStore.playMusic.primaryColor || background }"
    :to="`#layout-main`"
    :z-index="9998"
  >
  
    <div id="mobile-drawer-target" :class="[config.theme, `cover-style-${config.mobileCoverStyle}`]">
      <!-- 顶部控制按钮 -->
      <div v-if="playMusic?.playLoading" class="loading-overlay">
        <i class="ri-loader-4-line loading-icon"></i>
      </div>
      <div
        class="control-btn absolute top-5 left-5"
        :class="{ 'pure-mode': config.pureModeEnabled }"
        @click="closeMusicFull"
      >
        <i class="ri-arrow-down-s-line"></i>
      </div>

      <n-popover trigger="click" placement="bottom">
        <template #trigger>
          <div
            class="control-btn absolute top-5 right-5"
            :class="{ 'pure-mode': config.pureModeEnabled }"
          >
            <i class="ri-settings-3-line"></i>
          </div>
        </template>
        <lyric-settings ref="lyricSettingsRef" />
      </n-popover>

      <!-- 全屏歌词页面 -->
      <transition name="fade">
        <div 
          v-if="showFullLyrics" 
          class="fullscreen-lyrics"
          :class="config.theme"
        >
          <div class="fullscreen-header">
            <div class="song-title">{{ playMusic.name }}</div>
            <div class="artist-name">
              <span v-for="(item, index) in artistList" :key="index">
                {{ item.name }}{{ index < artistList.length - 1 ? ' / ' : '' }}
              </span>
            </div>
          </div>

          <div
            ref="lyricsScrollerRef"
            class="lyrics-scroller"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
            @scroll="handleScroll"
          >
            <div class="lyrics-padding-top"></div>
            <div 
              v-for="(item, index) in lrcArray" 
              :key="index"
              :id="`lyric-line-${index}`"
              class="lyric-line"
              :class="{ 'now-text': index === nowIndex, 'hover-text': item.text }"
              @click="jumpToLyricTime(index)"
            >
              <span :style="getLrcStyle(index)">{{ item.text }}</span>
              <div v-if="config.showTranslation && item.trText" class="translation">
                {{ item.trText }}
              </div>
            </div>
            <div class="lyrics-padding-bottom"></div>
          </div>
        </div>
      </transition>

      <!-- 主要内容区域 -->
      <transition name="fade">
        <div v-if="!showFullLyrics" class="ios-layout-container">
          <!-- 封面区域 -->
          <div
            class="cover-container"
            :class="{ 
              'record-style': config.mobileCoverStyle === 'record',
              'square-style': config.mobileCoverStyle === 'square',
              'full-style': config.mobileCoverStyle === 'full',
              'paused': !play
            }"
            @click="cycleCoverStyle"
          >
            <div class="img-wrapper">
              <n-image
                ref="PicImgRef"
                :src="getImgUrl(playMusic?.picUrl, '500y500')"
                lazy
                preview-disabled
                class="cover-image"
                :class="{ 'full-blend': config.mobileCoverStyle === 'full' }"
              />
            </div>
          </div>

          <div class="px-2">
            <!-- 歌曲信息 -->
            <div class="song-info">
              <h1 class="song-title">{{ playMusic.name }}</h1>
              <p class="song-artist">
                <span
                  v-for="(item, index) in artistList"
                  :key="index"
                  class="artist-name"
                  @click="handleArtistClick(item.id)"
                >
                  {{ item.name }}
                  {{ index < artistList.length - 1 ? ' / ' : '' }}
                </span>
              </p>
            </div>

            <!-- 歌词区域 -->
            <div 
              class="lyrics-container"
              v-if="!config.hideLyrics"
              @click="showFullLyricScreen"
            >
              <div v-if="lrcArray.length > 0" class="lyrics-wrapper">
                <div v-for="(line, idx) in visibleLyrics" :key="idx" class="lyric-line">
                  {{ line.text }}
                  <div v-if="config.showTranslation && line.trText" class="translation">
                    {{ line.trText }}
                  </div>
                </div>
              </div>
              <div v-else class="no-lyrics">
                {{ t('player.lrc.noLrc') }}
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 统一的控制区域 -->
      <div class="unified-controls" :class="{ 'fullscreen-mode': showFullLyrics }">
        <!-- 进度条 (苹果风格) -->
        <div class="progress-container">
          <div class="time-info">
            <span class="current-time">{{ secondToMinute(nowTime) }}</span>
            <span class="total-time">{{ secondToMinute(allTime) }}</span>
          </div>
          <div class="apple-style-progress" @click="handleProgressBarClick">
            <div class="progress-track">
              <div 
                class="progress-fill" 
                :style="{ width: `${(nowTime / Math.max(1, allTime)) * 100}%` }"
              ></div>
              <div 
                class="progress-thumb"
                :class="{ 'active': isThumbDragging }"
                :style="{ left: `${(nowTime / Math.max(1, allTime)) * 100}%` }"
                @touchstart="handleThumbTouchStart"
                @touchmove="handleThumbTouchMove"
                @touchend="handleThumbTouchEnd"
              ></div>
            </div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="control-buttons">
          <!-- 返回按钮，仅在全屏歌词模式下显示 -->
          <div v-if="showFullLyrics" class="back-button" @click.stop="closeFullLyrics">
            <i class="ri-arrow-down-s-line"></i>
          </div>
          <div class="side-button" @click="togglePlayMode">
            <i :class="playModeIcon"></i>
          </div>
          <div class="main-button prev" @click="prevSong">
            <i class="ri-skip-back-fill"></i>
          </div>
          <div class="main-button play-pause" @click="togglePlay">
            <i :class="playIcon"></i>
          </div>
          <div class="main-button next" @click="nextSong">
            <i class="ri-skip-forward-fill"></i>
          </div>
          <div class="side-button" @click="toggleFavorite">
            <i class="ri-heart-3-fill" :class="{ 'favorite': isFavorite }"></i>
          </div>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

import LyricSettings from '@/components/lyric/LyricSettings.vue';
import {
  allTime,
  artistList,
  lrcArray,
  nowIndex,
  nowTime,
  playMusic,
  sound,
  textColors,
  useLyricProgress
} from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { usePlayerStore } from '@/store/modules/player';
import { DEFAULT_LYRIC_CONFIG, LyricConfig } from '@/types/lyric';
import { getImgUrl, secondToMinute } from '@/utils';
import { animateGradient, getHoverBackgroundColor, getTextColors } from '@/utils/linearColor';
import { showBottomToast } from '@/utils/shortcutToast';

const { t } = useI18n();
const playerStore = usePlayerStore();

// 播放控制相关
const play = computed(() => playerStore.isPlay);
const playIcon = computed(() => play.value ? 'ri-pause-fill' : 'ri-play-fill');
const playMode = computed(() => playerStore.playMode);
const playModeIcon = computed(() => {
  switch (playMode.value) {
    case 0:
      return 'ri-repeat-line';
    case 1:
      return 'ri-repeat-one-line';
    case 2:
      return 'ri-shuffle-line';
    default:
      return 'ri-repeat-line';
  }
});

// 喜欢歌曲
const isFavorite = computed(() => {
  return playerStore.favoriteList.includes(playMusic.value.id as number);
});

const toggleFavorite = () => {
  if (isFavorite.value) {
    playerStore.removeFromFavorite(playMusic.value.id as number);
  } else {
    playerStore.addToFavorite(playMusic.value.id as number);
  }
};

// 歌词全屏控制
const showFullLyrics = ref(false);
const isAutoScrollEnabled = ref(true);
const lyricsScrollerRef = ref<HTMLElement | null>(null);
const isTouchScrolling = ref(false);
const touchStartY = ref(0);
const lastScrollTop = ref(0);
const autoScrollTimer = ref<number | null>(null);

// 显示全屏歌词
const showFullLyricScreen = () => {
  showFullLyrics.value = true;
  // 使用多次延迟尝试滚动，确保能够滚动到当前歌词
  nextTick(() => {
    scrollToCurrentLyric(true);
    
    setTimeout(() => {
      scrollToCurrentLyric(true);
    }, 200);
    
    setTimeout(() => {
      scrollToCurrentLyric(true);
    }, 500);
  });
};

// 关闭全屏歌词
const closeFullLyrics = () => {
  showFullLyrics.value = false;
  if (autoScrollTimer.value) {
    clearTimeout(autoScrollTimer.value);
    autoScrollTimer.value = null;
  }
};

// 滚动到当前歌词，添加错误处理和日志
const scrollToCurrentLyric = (immediate = false) => {
  try {
    if (!lyricsScrollerRef.value || !isAutoScrollEnabled.value || isTouchScrolling.value) return;
    
    const activeEl = document.getElementById(`lyric-line-${nowIndex.value}`);
    if (!activeEl) {
      console.log('找不到当前歌词元素');
      return;
    }
    
    const containerRect = lyricsScrollerRef.value.getBoundingClientRect();
    const lineRect = activeEl.getBoundingClientRect();
    
    const scrollTop = lyricsScrollerRef.value.scrollTop + (lineRect.top - containerRect.top) - (containerRect.height / 2) + (lineRect.height / 2);
    
    console.log('滚动到位置:', scrollTop);
    
    lyricsScrollerRef.value.scrollTo({
      top: scrollTop,
      behavior: immediate ? 'auto' : 'smooth'
    });
  } catch (err) {
    console.error('滚动歌词出错:', err);
  }
};

// 监听歌词变化，自动滚动
watch(nowIndex, () => {
  if (showFullLyrics.value && isAutoScrollEnabled.value && !isTouchScrolling.value) {
    nextTick(() => {
      scrollToCurrentLyric();
    });
  }
});

// 当显示状态变化时，触发滚动
watch(showFullLyrics, (newVal) => {
  if (newVal) {
    nextTick(() => {
      setTimeout(() => {
        scrollToCurrentLyric(true);
      }, 300);
    });
  }
});

// 处理滚动事件
const handleScroll = () => {
  if (!isTouchScrolling.value) return;
  
  // 用户手动滚动时，停止自动滚动
  isAutoScrollEnabled.value = false;
  
  // 清除之前的计时器
  if (autoScrollTimer.value) {
    clearTimeout(autoScrollTimer.value);
  }
  
  // 设置新的计时器，5秒后恢复自动滚动
  autoScrollTimer.value = window.setTimeout(() => {
    isAutoScrollEnabled.value = true;
    isTouchScrolling.value = false;
    scrollToCurrentLyric();
  }, 5000);
};

// 触摸相关事件
const handleTouchStart = (e: TouchEvent) => {
  touchStartY.value = e.touches[0].clientY;
  lastScrollTop.value = lyricsScrollerRef.value?.scrollTop || 0;
  isTouchScrolling.value = true;
  
  // 用户开始触摸时，暂时停止自动滚动
  isAutoScrollEnabled.value = false;
};

const handleTouchMove = () => {
  if (!isTouchScrolling.value || !lyricsScrollerRef.value) return;
  // 实际的滚动处理由浏览器默认行为完成
};

const handleTouchEnd = () => {
  // 设置计时器，5秒后恢复自动滚动
  if (autoScrollTimer.value) {
    clearTimeout(autoScrollTimer.value);
  }
  
  autoScrollTimer.value = window.setTimeout(() => {
    isAutoScrollEnabled.value = true;
    isTouchScrolling.value = false;
    scrollToCurrentLyric();
  }, 5000);
};

// 封面样式循环切换
const cycleCoverStyle = () => {
  const styles = ['record', 'square', 'full'];
  const currentIdx = styles.indexOf(config.value.mobileCoverStyle);
  const nextIdx = (currentIdx + 1) % styles.length;
  config.value.mobileCoverStyle = styles[nextIdx] as 'record' | 'square' | 'full';
  
  // 添加动画反馈
  const container = document.querySelector('.cover-container');
  if (container) {
    container.classList.add('style-changing');
    setTimeout(() => {
      container.classList.remove('style-changing');
    }, 500);
  }
};

// 进度条相关
const isThumbDragging = ref(false);
const progressContainerWidth = ref(0);

// 处理进度条点击
const handleProgressBarClick = (e: MouseEvent) => {
  if (!sound.value) return;
  
  const progressBar = e.currentTarget as HTMLElement;
  const rect = progressBar.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  progressContainerWidth.value = rect.width;
  
  const percentage = offsetX / rect.width;
  const newTime = Math.max(0, Math.min(percentage * allTime.value, allTime.value));
  
  sound.value.seek(newTime);
  nowTime.value = newTime;
};

// 处理滑块拖动
const handleThumbTouchStart = (e: TouchEvent) => {
  e.stopPropagation();
  isThumbDragging.value = true;
  
  // 获取进度条宽度
  const target = e.currentTarget as HTMLElement;
  const progressBar = target.parentElement?.parentElement as HTMLElement;
  if (progressBar) {
    progressContainerWidth.value = progressBar.getBoundingClientRect().width;
  }
};

const handleThumbTouchMove = (e: TouchEvent) => {
  if (!isThumbDragging.value || !sound.value) return;
  
  const touch = e.touches[0];
  const target = e.currentTarget as HTMLElement;
  const progressBar = target.parentElement?.parentElement as HTMLElement;
  const rect = progressBar.getBoundingClientRect();
  const offsetX = touch.clientX - rect.left;
  
  // 计算百分比并限制在0-1之间
  const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
  const newTime = percentage * allTime.value;
  
  // 实时更新UI，但不频繁seek
  nowTime.value = newTime;
};

const handleThumbTouchEnd = () => {
  if (!isThumbDragging.value || !sound.value) return;
  
  // 拖动结束时执行seek操作
  sound.value.seek(nowTime.value);
  isThumbDragging.value = false;
};

// 背景相关
const currentBackground = ref('');
const animationFrame = ref<number | null>(null);
const isDark = ref(false);
const lyricSettingsRef = ref<InstanceType<typeof LyricSettings>>();
const config = ref<LyricConfig>({ ...DEFAULT_LYRIC_CONFIG });

// 可见歌词计算
const visibleLyrics = computed(() => {
  const centerIndex = nowIndex.value + 1;
  const numLines = config.value.mobileShowLyricLines;
  const halfLines = Math.floor(numLines / 2);
  
  let startIdx = centerIndex - halfLines;
  let endIdx = centerIndex + halfLines;
  
  // 处理奇偶数行数的情况
  if (numLines % 2 === 0) {
    endIdx -= 1;
  }
  
  // 处理边界情况
  if (startIdx < 0) {
    startIdx = 0;
    endIdx = Math.min(numLines - 1, lrcArray.value.length - 1);
  }
  
  if (endIdx >= lrcArray.value.length) {
    endIdx = lrcArray.value.length - 1;
    startIdx = Math.max(0, endIdx - numLines + 1);
  }
  
  return lrcArray.value.slice(startIdx, endIdx + 1);
});

// 监听设置组件的配置变化
watch(
  () => lyricSettingsRef.value?.config,
  (newConfig) => {
    if (newConfig) {
      config.value = newConfig;
    }
  },
  { deep: true, immediate: true }
);

// 监听本地配置变化，保存到 localStorage
watch(
  () => config.value,
  (newConfig) => {
    localStorage.setItem('music-full-config', JSON.stringify(newConfig));
    if (lyricSettingsRef.value) {
      lyricSettingsRef.value.config = newConfig;
    }
  },
  { deep: true }
);

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  background: {
    type: String,
    default: ''
  }
});

const themeMusic = {
  light: 'linear-gradient(to bottom, #ffffff, #f5f5f5)',
  dark: 'linear-gradient(to bottom, #1a1a1a, #000000)'
};

const emit = defineEmits(['update:modelValue']);

const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// 设置文字颜色
const setTextColors = (background: string) => {
  if (!background) {
    textColors.value = getTextColors();
    document.documentElement.style.setProperty('--hover-bg-color', getHoverBackgroundColor(false));
    document.documentElement.style.setProperty('--text-color-primary', textColors.value.primary);
    document.documentElement.style.setProperty('--text-color-active', textColors.value.active);
    document.documentElement.style.setProperty('--bg-color', 'rgba(25, 25, 25, 1)');
    return;
  }

  // 更新文字颜色
  textColors.value = getTextColors(background);
  isDark.value = textColors.value.active === '#000000';

  document.documentElement.style.setProperty(
    '--hover-bg-color',
    getHoverBackgroundColor(isDark.value)
  );
  document.documentElement.style.setProperty('--text-color-primary', textColors.value.primary);
  document.documentElement.style.setProperty('--text-color-active', textColors.value.active);
  
  // 解析背景颜色用于封面融合
  let bgColor = playerStore.playMusic.primaryColor || 'rgba(25, 25, 25, 1)';
  
  document.documentElement.style.setProperty('--bg-color', bgColor);

  // 处理背景颜色动画
  if (currentBackground.value) {
    if (animationFrame.value) {
      cancelAnimationFrame(animationFrame.value);
    }
    const result = animateGradient(currentBackground.value, background, (gradient) => {
      currentBackground.value = gradient;
    });
    if (typeof result === 'number') {
      animationFrame.value = result;
    }
  } else {
    currentBackground.value = background;
  }
};

// 监听背景变化
watch(
  () => props.background,
  (newBg) => {
    if (config.value.theme === 'default') {
      setTextColors(newBg);
    } else {
      setTextColors(themeMusic[config.value.theme] || props.background);
    }
  },
  { immediate: true }
);

// 组件卸载时清理动画
onBeforeUnmount(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
  if (autoScrollTimer.value) {
    clearTimeout(autoScrollTimer.value);
  }
});

const { navigateToArtist } = useArtist();

const handleArtistClick = (id: number) => {
  isVisible.value = false;
  navigateToArtist(id);
};

// 播放控制功能
const togglePlay = () => {
  try {
    playerStore.setPlay(playMusic.value);
  } catch (error) {
    console.error('播放出错:', error);
  }
};

const nextSong = () => {
  playerStore.nextPlay();
};

const prevSong = () => {
  playerStore.prevPlay();
};

const togglePlayMode = () => {
  playerStore.togglePlayMode();
  showBottomToast([
    t('player.playMode.sequence'),
    t('player.playMode.loop'),
    t('player.playMode.random')
  ][playMode.value]);
};

const closeMusicFull = () => {
  isVisible.value = false;
  playerStore.setMusicFull(false);
};

// 监听主题变化
watch(
  () => config.value.theme,
  (newTheme) => {
    const newBackground = themeMusic[newTheme] || props.background;
    setTextColors(newBackground);
  },
  { immediate: true }
);

// 加载保存的配置
onMounted(() => {
  const savedConfig = localStorage.getItem('music-full-config');
  if (savedConfig) {
    config.value = { ...config.value, ...JSON.parse(savedConfig) };
  }
});

// 当显示状态变化时，更新封面与背景融合效果
watch(isVisible, (newVal) => {
  if (newVal) {
    // 播放器显示时，重新设置背景颜色
    setTextColors(props.background);
  } else {
    showFullLyrics.value = false;
    if (autoScrollTimer.value) {
      clearTimeout(autoScrollTimer.value);
      autoScrollTimer.value = null;
    }
  }
});

// 通过点击跳转到歌词对应时间点
const jumpToLyricTime = (index: number) => {
  if (lrcArray.value[index] && 'time' in lrcArray.value[index] && sound.value) {
    // 使用类型断言确保time属性存在
    const lrcItem = lrcArray.value[index] as { time: number; text: string; trText?: string };
    const time = lrcItem.time / 1000;
    sound.value.seek(time);
    nowTime.value = time;
    
    // 显示反馈动画
    const activeEl = document.getElementById(`lyric-line-${index}`);
    if (activeEl) {
      activeEl.classList.add('clicked');
      setTimeout(() => {
        activeEl.classList.remove('clicked');
      }, 300);
    }
  }
};

// 添加getLrcStyle函数
const { getLrcStyle: originalLrcStyle } = useLyricProgress();

// 修改 getLrcStyle 函数
const getLrcStyle = (index: number) => {
  const colors = textColors.value || getTextColors;
  const originalStyle = originalLrcStyle(index);

  if (index === nowIndex.value) {
    // 当前播放的歌词，使用渐变效果
    return {
      ...originalStyle,
      backgroundImage: originalStyle.backgroundImage
        ?.replace(/#ffffff/g, colors.active)
        .replace(/#ffffff8a/g, `${colors.primary}`),
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent'
    };
  }

  // 非当前播放的歌词，使用普通颜色
  return {
    color: colors.primary
  };
};

defineExpose({
  config
});
</script>

<style scoped lang="scss">
#mobile-drawer-target {
  @apply top-0 left-0 absolute overflow-hidden flex flex-col w-full h-full;
  animation-duration: 300ms;
  
  .control-btn {
    @apply w-9 h-9 flex items-center justify-center rounded cursor-pointer transition-all duration-300 z-[9999];
    background: rgba(142, 142, 142, 0.192);
    backdrop-filter: blur(12px);

    i {
      @apply text-xl;
      color: var(--text-color-active);
    }

    &.pure-mode {
      background: transparent;
      backdrop-filter: none;

      &:not(:hover) {
        i {
          opacity: 0;
        }
      }
    }

    &:hover {
      background: rgba(126, 121, 121, 0.2);
      i {
        opacity: 1;
      }
    }
  }
  
  // 全屏歌词样式
  .fullscreen-lyrics {
    @apply flex flex-col w-full h-full relative;
    
    &.light {
      background: linear-gradient(to bottom, #ffffff, #f5f5f5);
    }
    
    &.dark {
      background: linear-gradient(to bottom, #1a1a1a, #000000);
    }
    
    .fullscreen-header {
      @apply pt-8 pb-4 px-6 flex flex-col items-center fixed top-0 left-0 w-full z-10;
      background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%);
      height: 100px;
      pointer-events: auto;
      
      .song-title {
        @apply text-xl font-semibold text-white text-center mb-1 max-w-full line-clamp-1;
        color: var(--text-color-active);
      }
      
      .artist-name {
        @apply text-sm text-opacity-80 text-center;
        color: var(--text-color-primary);
      }
    }
    
    .lyrics-scroller {
      @apply flex-1 overflow-y-auto px-4;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 10%,
        black 90%,
        transparent 100%
      );
      padding-top: 100px;
      padding-bottom: 200px;
      margin-bottom: 180px; /* 确保底部留出足够空间 */
      
      .lyrics-padding-top {
        height: 70px;
        min-height: 70px;
      }
      
      .lyrics-padding-bottom {
        height: 150px;
        min-height: 150px;
      }
      
      .lyric-line {
        @apply px-6 py-4 cursor-pointer font-bold text-center transition-all duration-300;
        font-size: var(--lyric-font-size, 22px);
        letter-spacing: var(--lyric-letter-spacing, 0);
        line-height: var(--lyric-line-height, 2);
        
        span {
          background-clip: text !important;
          -webkit-background-clip: text !important;
          padding-right: 10px;
        }
        
        .translation {
          @apply font-normal opacity-70;
          color: var(--text-color-primary);
        }
      }
      
      .now-text {
        @apply text-2xl font-semibold;
        
        span {
          background-clip: text !important;
          -webkit-background-clip: text !important;
        }
      }
    }
  }
  
  // 统一的控制区域样式
  .unified-controls {
    @apply fixed bottom-0 left-0 right-0 px-6 pt-6 pb-8 z-[9999];
    background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
    height: 210px;
    pointer-events: auto;
    
    .progress-container {
      @apply w-full mb-6;
      pointer-events: auto;
      
      .time-info {
        @apply flex justify-between items-center mb-2;
        
        .current-time, .total-time {
          @apply text-xs;
          color: var(--text-color-primary);
          opacity: 0.7;
        }
      }
      
      .apple-style-progress {
        @apply w-full h-10 flex items-center relative cursor-pointer;
        
        .progress-track {
          @apply relative w-full h-1.5 bg-white bg-opacity-20 rounded-full;
          
          .progress-fill {
            @apply absolute top-0 left-0 h-full bg-white rounded-full;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
            z-index: 1;
            transition: width 0.1s linear;
          }
          
          .progress-thumb {
            @apply absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
            z-index: 2;
            transition: transform 0.15s ease-out;
            
            &.active {
              transform: translate(-50%, -50%) scale(1.3);
              box-shadow: 0 0 12px rgba(255, 255, 255, 0.9);
            }
            
            &:active {
              transform: translate(-50%, -50%) scale(1.3);
            }
          }
        }
      }
    }
    
    .control-buttons {
      @apply flex items-center justify-between w-full px-4;
      
      .back-button{
        @apply absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center bg-black bg-opacity-30 rounded-2xl;

        i{
          @apply text-4xl;
          color: var(--text-color-primary);
        }
      }
      
      .side-button {
        @apply w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-200;
        
        i {
          @apply text-xl;
          color: var(--text-color-primary);
          
          &.favorite {
            @apply text-red-500;
          }
        }
        
        &:hover {
          i {
            color: var(--text-color-active);
          }
        }
      }
      
      .main-button {
        @apply w-14 h-14 flex items-center justify-center cursor-pointer transition-all duration-200;
        
        i {
          @apply text-2xl;
          color: var(--text-color-primary);
        }
        
        &.play-pause {
          @apply w-16 h-16 bg-white/20 rounded-full;
          
          i {
            @apply text-4xl;
            color: var(--text-color-active);
          }
        }
        
        &:hover:not(.play-pause) {
          i {
            color: var(--text-color-active);
          }
        }
        
        &.play-pause:hover {
          @apply bg-white/30;
        }
      }
    }
  }
  
  // iOS风格布局容器
  .ios-layout-container {
    @apply flex flex-col items-center justify-between w-full h-full pt-10;
    padding-bottom: 180px; /* 为统一控制区域留出空间 */
    
    // 封面样式
    .cover-container {
      @apply relative mb-6 transition-all duration-500;
      
      &.style-changing {
        animation: styleChange 0.5s ease;
      }
      
      .img-wrapper {
        @apply relative overflow-hidden;
      }
      
      &.record-style {
        @apply w-72 h-72 rounded-full overflow-hidden;
        
        .cover-image {
          @apply w-full h-full rounded-full;
          animation: spin 20s linear infinite;
          animation-play-state: running;
        }
        
        &.paused .cover-image {
          animation-play-state: paused;
        }
      }
      
      &.square-style {
        @apply w-72 h-72;
        
        .cover-image {
          @apply w-full h-full rounded-xl shadow-lg;
          transition: transform 0.3s ease-out;
          
          &:active {
            transform: scale(0.95);
          }
        }
      }
      
      &.full-style {
        @apply w-full max-h-[50vh] relative;
        
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(transparent, var(--bg-color, rgba(25, 25, 25, 1)) 70%, var(--bg-color, rgba(25, 25, 25, 1)));
          z-index: 1;
          pointer-events: none;
        }
        
        .cover-image {
          @apply w-full h-auto shadow-lg;
        }
      }
    }
    
    // 歌曲信息
    .song-info {
      @apply flex flex-col items-center mb-5 w-full;
      
      .song-title {
        @apply text-center text-2xl font-bold mb-1 max-w-full;
        color: var(--text-color-active);
      }
      
      .song-artist {
        @apply text-center text-base mb-0;
        color: var(--text-color-primary);
        opacity: 0.8;
        
        .artist-name {
          @apply cursor-pointer;
          
          &:hover {
            @apply underline;
          }
        }
      }
    }
    
    // 歌词区域
    .lyrics-container {
      @apply w-full flex-grow flex flex-col items-center justify-center mb-6 overflow-hidden cursor-pointer;
      
      .lyrics-wrapper {
        @apply w-full flex flex-col items-center justify-center;
        
        .lyric-line {
          @apply text-center py-1 transition-all duration-300 opacity-70;
          color: var(--text-color-primary);
          
          &:nth-child(2) {
            @apply text-lg font-medium opacity-100;
            color: var(--text-color-active);
          }
          
          .translation {
            @apply text-sm opacity-60 mt-1;
          }
        }
      }
      
      .no-lyrics {
        @apply text-center text-base opacity-60;
        color: var(--text-color-primary);
      }
    }
  }
}

// 旋转动画
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 加载动画
.loading-overlay {
  @apply absolute top-0 left-0 w-full h-full flex items-center justify-center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
  
  .loading-icon {
    font-size: 36px;
    color: white;
    animation: spin 1s linear infinite;
  }
}

// 根据封面样式调整容器布局
#mobile-drawer-target.cover-style-record {
  .ios-layout-container .cover-container {
    @apply mt-4;
  }
}

#mobile-drawer-target.cover-style-full {
  .ios-layout-container {
    @apply pt-0;
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes styleChange {
  0% {
    opacity: 0.7;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.03);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes clickPulse {
  0% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0% {
    opacity: 0.9;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.9;
  }
}
</style> 