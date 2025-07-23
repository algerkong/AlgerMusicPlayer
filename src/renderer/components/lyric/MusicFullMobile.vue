<template>
  <n-drawer
    v-model:show="isVisible"
    height="100%"
    placement="bottom"
    :style="{ background: playerStore.playMusic.primaryColor || background }"
    :to="`#layout-main`"
    :z-index="9998"
  >
    <div
      id="mobile-drawer-target"
      :class="[
        config.theme,
        `cover-style-${config.mobileCoverStyle}`,
        { 'is-landscape': isLandscape },
        { 'is-dark': isDark }
      ]"
    >
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

      <!-- 全屏歌词页面 - 竖屏模式下 -->
      <transition name="fade">
        <div v-if="showFullLyrics && !isLandscape" class="fullscreen-lyrics" :class="config.theme">
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

      <!-- 主要内容区域 - 竖屏模式下的普通布局 -->
      <transition name="fade">
        <div v-if="!showFullLyrics && !isLandscape" class="ios-layout-container">
          <!-- 封面区域 -->
          <div
            class="cover-container"
            :class="{
              'record-style': config.mobileCoverStyle === 'record',
              'square-style': config.mobileCoverStyle === 'square',
              'full-style': config.mobileCoverStyle === 'full',
              paused: !play
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

          <div class="px-2 flex-1 flex flex-col justify-around w-[85%]">
            <!-- 歌曲信息 -->
            <div class="song-info">
              <div class="song-title-container">
                <h1 class="song-title">{{ playMusic.name }}</h1>
              </div>
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
              <div class="favorite-icon" @click="toggleFavorite">
                <i class="ri-heart-3-fill" :class="{ favorite: isFavorite }"></i>
              </div>
            </div>

            <!-- 歌词区域 -->
            <div class="lyrics-container" v-if="!config.hideLyrics" @click="showFullLyricScreen">
              <div v-if="lrcArray.length > 0" class="lyrics-wrapper">
                <div v-for="(line, idx) in visibleLyrics" :key="idx" class="lyric-line">
                  {{ line.text }}
                </div>
              </div>
              <div v-else class="no-lyrics">
                {{ t('player.lrc.noLrc') }}
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 横屏模式布局 -->
      <div v-if="isLandscape" class="landscape-layout">
        <!-- 左侧封面和进度条 -->
        <div class="landscape-left-section">
          <div
            class="landscape-cover-container cover-container"
            :class="{
              'record-style': config.mobileCoverStyle === 'record',
              'square-style': config.mobileCoverStyle === 'square',
              'full-style': config.mobileCoverStyle === 'full',
              paused: !play
            }"
            @click="cycleCoverStyle"
          >
            <div class="img-wrapper">
              <n-image
                :src="getImgUrl(playMusic?.picUrl, '500y500')"
                lazy
                preview-disabled
                class="cover-image"
                :class="{ 'full-blend': config.mobileCoverStyle === 'full' }"
              />
            </div>
          </div>

          <!-- 左侧进度条 -->
          <div class="landscape-progress-container">
            <div class="time-info">
              <span class="current-time">{{ secondToMinute(nowTime) }}</span>
              <span class="total-time">{{ secondToMinute(allTime) }}</span>
            </div>
            <div
              class="apple-style-progress"
              @click="handleProgressBarClick"
              @mousedown="handleMouseDown"
            >
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :style="{ width: `${(nowTime / Math.max(1, allTime)) * 100}%` }"
                ></div>
                <div
                  class="progress-thumb"
                  :class="{ active: isThumbDragging || isMouseDragging }"
                  :style="{ left: `${(nowTime / Math.max(1, allTime)) * 100}%` }"
                  @touchstart="handleThumbTouchStart"
                  @touchmove="handleThumbTouchMove"
                  @touchend="handleThumbTouchEnd"
                  @mousedown="handleMouseDown"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧歌词区域 -->
        <div class="landscape-lyrics-section">
          <!-- 歌曲信息放置在顶部 -->
          <div class="landscape-song-info">
            <div class="flex flex-col flex-1">
              <h1 class="song-title">{{ playMusic.name }}</h1>
              <p class="song-artist">
                <span
                  v-for="(item, index) in artistList"
                  :key="index"
                  class="artist-name"
                  @click="handleArtistClick(item.id)"
                >
                  {{ item.name }}{{ index < artistList.length - 1 ? ' / ' : '' }}
                </span>
              </p>
            </div>
            <div class="favorite-icon landscape" @click="toggleFavorite">
              <i class="ri-heart-3-fill" :class="{ favorite: isFavorite }"></i>
            </div>
          </div>

          <!-- 歌词滚动区域 -->
          <div
            ref="landscapeLyricsRef"
            class="landscape-lyrics-scroller"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
            @scroll="handleScroll"
          >
            <div class="lyrics-padding-top"></div>
            <div
              v-for="(item, index) in lrcArray"
              :key="index"
              :id="`landscape-lyric-line-${index}`"
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

          <!-- 右下角控制按钮 -->
          <div class="landscape-main-controls">
            <div class="main-button prev" @click="prevSong">
              <i class="ri-skip-back-fill"></i>
            </div>
            <div class="main-button play-pause" @click="togglePlay">
              <i :class="playIcon"></i>
            </div>
            <div class="main-button next" @click="nextSong">
              <i class="ri-skip-forward-fill"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- 竖屏模式的控制区域 -->
      <div
        v-if="!isLandscape"
        class="unified-controls"
        :class="{ 'fullscreen-mode': showFullLyrics }"
      >
        <!-- 进度条 (苹果风格) -->
        <div class="progress-container">
          <div class="time-info">
            <span class="current-time">{{ secondToMinute(nowTime) }}</span>
            <span class="total-time">{{ secondToMinute(allTime) }}</span>
          </div>
          <div
            class="apple-style-progress"
            @click="handleProgressBarClick"
            @mousedown="handleMouseDown"
          >
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${(nowTime / Math.max(1, allTime)) * 100}%` }"
              ></div>
              <div
                class="progress-thumb"
                :class="{ active: isThumbDragging || isMouseDragging }"
                :style="{ left: `${(nowTime / Math.max(1, allTime)) * 100}%` }"
                @touchstart="handleThumbTouchStart"
                @touchmove="handleThumbTouchMove"
                @touchend="handleThumbTouchEnd"
                @mousedown="handleMouseDown"
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
          <div class="side-button" @click="showPlaylist">
            <i class="iconfont icon-list"></i>
          </div>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

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
const playIcon = computed(() => (play.value ? 'ri-pause-fill' : 'ri-play-fill'));
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
// 打开播放列表
const showPlaylist = () => {
  playerStore.setPlayListDrawerVisible(true);
};

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

// 横屏检测相关
const { width, height } = useWindowSize();
const isLandscape = computed(() => width.value > height.value);
const landscapeLyricsRef = ref<HTMLElement | null>(null);

// 监听横屏变化
watch(isLandscape, (newVal) => {
  if (newVal) {
    // 横屏模式下，确保歌词容器可见并滚动到当前歌词
    nextTick(() => {
      setTimeout(() => {
        scrollToCurrentLyric(true, landscapeLyricsRef.value);
      }, 300);
    });
  }
});

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
const scrollToCurrentLyric = (immediate = false, customScrollerRef?: HTMLElement | null) => {
  try {
    const scrollerRef = customScrollerRef || lyricsScrollerRef.value;
    if (!scrollerRef) {
      console.log('歌词容器引用不存在');
      return;
    }

    // 如果用户正在手动滚动，不打断他们的操作
    if (isTouchScrolling.value && !immediate) {
      return;
    }

    const prefix = customScrollerRef ? 'landscape-' : '';
    const activeEl = document.getElementById(`${prefix}lyric-line-${nowIndex.value}`);
    if (!activeEl) {
      console.log(`找不到当前歌词元素: ${prefix}lyric-line-${nowIndex.value}`);
      return;
    }

    const containerRect = scrollerRef.getBoundingClientRect();
    const lineRect = activeEl.getBoundingClientRect();

    // 优化滚动位置计算，确保当前歌词在视图中央
    const scrollTop =
      scrollerRef.scrollTop +
      (lineRect.top - containerRect.top) -
      containerRect.height / 2 +
      lineRect.height / 2;

    console.log(`滚动到歌词 #${nowIndex.value}, 位置: ${scrollTop}px`);

    scrollerRef.scrollTo({
      top: scrollTop,
      behavior: immediate ? 'auto' : 'smooth'
    });
  } catch (err) {
    console.error('滚动歌词出错:', err);
  }
};

// 监听歌词变化，自动滚动
watch(nowIndex, (newIndex, oldIndex) => {
  console.log(`歌词索引变化: ${oldIndex} -> ${newIndex}`);

  // 在竖屏全屏歌词模式下滚动
  if (showFullLyrics.value) {
    nextTick(() => {
      scrollToCurrentLyric(false);
    });
  }
  // 在横屏模式下滚动
  else if (isLandscape.value) {
    nextTick(() => {
      scrollToCurrentLyric(false, landscapeLyricsRef.value);
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

// 监听音乐播放时间变化，触发歌词滚动更新
watch(nowTime, () => {
  // 只有当系统不是由于用户手动拖动进度条而更新时间时才触发滚动
  if (!isThumbDragging.value && !isTouchScrolling.value) {
    // 在竖屏全屏歌词模式下滚动
    if (showFullLyrics.value) {
      scrollToCurrentLyric(false);
    }
    // 在横屏模式下滚动
    else if (isLandscape.value) {
      scrollToCurrentLyric(false, landscapeLyricsRef.value);
    }
  }
});

// 处理滚动事件
const handleScroll = () => {
  if (!isTouchScrolling.value) return;

  // 用户手动滚动时，临时停止自动滚动
  isAutoScrollEnabled.value = false;

  // 清除之前的计时器
  if (autoScrollTimer.value) {
    clearTimeout(autoScrollTimer.value);
  }

  // 设置新的计时器，3秒后恢复自动滚动
  autoScrollTimer.value = window.setTimeout(() => {
    isAutoScrollEnabled.value = true;
    isTouchScrolling.value = false;

    // 滚动到当前歌词
    if (showFullLyrics.value) {
      scrollToCurrentLyric(false);
    } else if (isLandscape.value) {
      scrollToCurrentLyric(false, landscapeLyricsRef.value);
    }
  }, 3000);
};

// 触摸相关事件
const handleTouchStart = (e: TouchEvent) => {
  touchStartY.value = e.touches[0].clientY;

  // 根据当前模式获取正确的滚动容器
  const scrollerRef = showFullLyrics.value
    ? lyricsScrollerRef.value
    : isLandscape.value
      ? landscapeLyricsRef.value
      : lyricsScrollerRef.value;

  lastScrollTop.value = scrollerRef?.scrollTop || 0;
  isTouchScrolling.value = true;

  // 用户开始触摸时，暂时停止自动滚动
  isAutoScrollEnabled.value = false;

  // 清除之前可能存在的计时器
  if (autoScrollTimer.value) {
    clearTimeout(autoScrollTimer.value);
    autoScrollTimer.value = null;
  }
};

const handleTouchMove = () => {
  if (!isTouchScrolling.value) return;
  // 实际的滚动处理由浏览器默认行为完成
};

const handleTouchEnd = () => {
  // 设置计时器，3秒后恢复自动滚动
  if (autoScrollTimer.value) {
    clearTimeout(autoScrollTimer.value);
  }

  autoScrollTimer.value = window.setTimeout(() => {
    isAutoScrollEnabled.value = true;
    isTouchScrolling.value = false;

    // 恢复自动滚动到当前歌词
    if (showFullLyrics.value) {
      scrollToCurrentLyric(true);
    } else if (isLandscape.value) {
      scrollToCurrentLyric(true, landscapeLyricsRef.value);
    }
  }, 3000);
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

// 鼠标拖动进度条相关变量
const isMouseDragging = ref(false);

// 处理进度条点击
const handleProgressBarClick = (e: MouseEvent) => {
  if (!sound.value) return;

  e.stopPropagation(); // 阻止事件冒泡
  const progressBar = e.currentTarget as HTMLElement;
  const rect = progressBar.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  progressContainerWidth.value = rect.width;

  const percentage = offsetX / rect.width;
  const newTime = Math.max(0, Math.min(percentage * allTime.value, allTime.value));

  console.log(`进度条点击: ${percentage.toFixed(2)}, 新时间: ${newTime.toFixed(2)}`);

  sound.value.seek(newTime);
  nowTime.value = newTime;
};

// 鼠标按下事件
const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return; // 只处理左键点击

  e.preventDefault();
  e.stopPropagation();
  isMouseDragging.value = true;

  // 立即更新位置
  const progressBar = (e.currentTarget as HTMLElement).closest(
    '.apple-style-progress'
  ) as HTMLElement;
  if (progressBar) {
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = percentage * allTime.value;

    nowTime.value = newTime;
    console.log(`鼠标按下，位置: ${percentage.toFixed(2)}, 时间: ${newTime.toFixed(2)}秒`);
  }

  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// 鼠标移动事件
const handleMouseMove = (e: MouseEvent) => {
  if (!isMouseDragging.value || !sound.value) return;

  e.preventDefault();

  // 查找当前视图中的进度条元素
  const progressBar = isLandscape.value
    ? document.querySelector('.landscape-left-section .apple-style-progress')
    : document.querySelector('.unified-controls .apple-style-progress');

  if (!progressBar) return;

  const rect = (progressBar as HTMLElement).getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
  const newTime = percentage * allTime.value;

  nowTime.value = newTime;
  console.log(`鼠标移动，位置: ${percentage.toFixed(2)}, 时间: ${newTime.toFixed(2)}秒`);
};

// 鼠标释放事件
const handleMouseUp = (e: MouseEvent) => {
  if (!isMouseDragging.value || !sound.value) return;

  e.preventDefault();

  // 释放时跳转到指定位置
  sound.value.seek(nowTime.value);
  console.log(`鼠标释放，跳转到: ${nowTime.value.toFixed(2)}秒`);

  isMouseDragging.value = false;

  // 移除全局事件监听
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

// 处理滑块拖动
const handleThumbTouchStart = (e: TouchEvent) => {
  e.preventDefault(); // 阻止默认行为
  e.stopPropagation(); // 阻止事件冒泡
  isThumbDragging.value = true;

  // 获取进度条宽度
  const target = e.currentTarget as HTMLElement;
  const progressBar = target.parentElement?.parentElement as HTMLElement;
  if (progressBar) {
    progressContainerWidth.value = progressBar.getBoundingClientRect().width;
    console.log(`进度条宽度: ${progressContainerWidth.value}px`);
  }
};

const handleThumbTouchMove = (e: TouchEvent) => {
  if (!isThumbDragging.value || !sound.value) return;

  e.preventDefault(); // 阻止默认行为

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

  console.log(`thumb拖动: ${percentage.toFixed(2)}, 时间: ${newTime.toFixed(2)}`);
};

const handleThumbTouchEnd = (e: TouchEvent) => {
  if (!isThumbDragging.value || !sound.value) return;

  e.preventDefault(); // 阻止默认行为
  e.stopPropagation(); // 阻止事件冒泡

  // 拖动结束时执行seek操作
  console.log(`拖动结束，跳转到: ${nowTime.value.toFixed(2)}秒`);
  sound.value.seek(nowTime.value);
  isThumbDragging.value = false;
};

// 背景相关
const currentBackground = ref('');
const animationFrame = ref<number | null>(null);
const isDark = ref(false);
const config = ref<LyricConfig>({ ...DEFAULT_LYRIC_CONFIG });

// 可见歌词计算
const visibleLyrics = computed(() => {
  const centerIndex = nowIndex.value;
  const numLines = 3;
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

  // 清理鼠标事件监听
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
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
  showBottomToast(
    [t('player.playMode.sequence'), t('player.playMode.loop'), t('player.playMode.random')][
      playMode.value
    ]
  );
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

  // 初始化自动滚动状态
  isAutoScrollEnabled.value = true;
  isTouchScrolling.value = false;

  // 等待DOM元素渲染完成后初始化歌词滚动
  nextTick(() => {
    if (isVisible.value) {
      // 在横屏模式下
      if (isLandscape.value) {
        setTimeout(() => {
          scrollToCurrentLyric(true, landscapeLyricsRef.value);
        }, 500);
      }
      // 在全屏歌词模式下
      else if (showFullLyrics.value) {
        setTimeout(() => {
          scrollToCurrentLyric(true);
        }, 500);
      }
    }
  });
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

    // 更新播放位置
    sound.value.seek(time);
    nowTime.value = time;

    // 显示反馈动画 - 处理两种模式下的歌词行
    const normalEl = document.getElementById(`lyric-line-${index}`);
    const landscapeEl = document.getElementById(`landscape-lyric-line-${index}`);

    // 根据当前模式获取正确的元素并添加动画效果
    const activeEl = isLandscape.value ? landscapeEl : normalEl;

    if (activeEl) {
      activeEl.classList.add('clicked');
      setTimeout(() => {
        activeEl.classList.remove('clicked');
      }, 300);
    }

    // 如果歌词索引没有变化（例如点击当前行），手动触发滚动
    if (nowIndex.value === index) {
      if (isLandscape.value && !showFullLyrics.value) {
        scrollToCurrentLyric(true, landscapeLyricsRef.value);
      } else if (showFullLyrics.value) {
        scrollToCurrentLyric(true);
      }
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
</script>

<style scoped lang="scss">
#mobile-drawer-target {
  @apply top-0 left-0 absolute overflow-hidden flex flex-col w-full h-full;
  animation-duration: 300ms;

  // 通用控制按钮样式
  .main-button {
    @apply flex items-center justify-center cursor-pointer transition-all duration-200 rounded-full;

    i {
      @apply text-2xl;
      color: var(--text-color-active);
    }

    &.play-pause {
      i {
        @apply text-4xl;
      }
    }

    &:hover {
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  // 通用进度条样式
  .apple-style-progress {
    @apply relative flex items-center cursor-pointer;
    touch-action: none; // 确保触摸事件正常工作

    .progress-track {
      @apply relative w-full h-2 bg-white bg-opacity-20 rounded-full;

      .progress-fill {
        @apply absolute top-0 left-0 h-full bg-white rounded-full;
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
        z-index: 1;
        transition: width 0.1s linear;
      }

      .progress-thumb {
        @apply absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white;
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

  // 通用唱片样式
  .record-style-common {
    @apply rounded-full overflow-hidden relative;
    aspect-ratio: 1/1;

    &::before {
      content: '';
      @apply absolute top-0 left-0 w-full h-full rounded-full z-10;
      background: radial-gradient(
        circle at center,
        transparent 38%,
        rgba(0, 0, 0, 0.15) 38%,
        rgba(0, 0, 0, 0.15) 39%,
        rgba(255, 255, 255, 0.1) 39%,
        rgba(255, 255, 255, 0.1) 39.5%,
        rgba(0, 0, 0, 0.08) 39.5%,
        rgba(0, 0, 0, 0.08) 40.5%,
        rgba(0, 0, 0, 0.2) 40.5%,
        rgba(0, 0, 0, 0.2) 41.5%,
        rgba(0, 0, 0, 0.6) 41.5%,
        rgba(0, 0, 0, 0.6) 100%
      );
      pointer-events: none;
      animation: spin 20s linear infinite;
      animation-play-state: running;
    }

    &::after {
      content: '';
      @apply absolute w-6 h-6 rounded-full bg-gray-900 z-20;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.4);
    }

    &.paused {
      &::before,
      &::after {
        animation-play-state: paused;
      }
    }

    .img-wrapper {
      @apply rounded-full overflow-hidden border-solid border-black z-0;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);

      &::after {
        content: '';
        @apply absolute top-0 left-0 w-full h-full rounded-full z-[2];
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.05) 0%,
          rgba(255, 255, 255, 0) 50%,
          rgba(0, 0, 0, 0.05) 100%
        );
        pointer-events: none;
      }
    }

    .cover-image {
      @apply w-full h-full rounded-full border-[2px] border-gray-900;
      animation: spin 20s linear infinite;
      animation-play-state: running;
    }

    &.paused .cover-image {
      animation-play-state: paused;
    }
  }

  // 通用时间显示样式
  .time-info {
    @apply flex justify-between items-center mb-2;

    .current-time,
    .total-time {
      @apply text-sm;
      color: var(--text-color-primary);
      opacity: 0.8;
    }
  }

  // 通用收藏按钮样式
  .favorite-icon {
    @apply cursor-pointer transition-all duration-200;

    i {
      @apply text-xl;
      color: var(--text-color-primary);

      &.favorite {
        @apply text-red-500 !important;
      }
    }

    &:hover {
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.9);
    }

    &.landscape {
      i {
        @apply text-3xl;
      }
    }
  }

  // 通用歌曲信息样式
  .song-info-common {
    @apply z-[9995];

    .song-title {
      @apply font-bold line-clamp-1;
      color: var(--text-color-active);
    }

    .song-artist {
      @apply font-medium line-clamp-1;
      color: var(--text-color-primary);
      opacity: 0.9;

      .artist-name {
        @apply cursor-pointer;

        &:hover {
          @apply underline;
        }
      }
    }
  }

  // 横屏模式布局
  &.is-landscape {
    .landscape-layout {
      @apply flex flex-row w-full h-full overflow-hidden px-8 gap-4;

      // 左侧区域
      .landscape-left-section {
        @apply h-full flex flex-col items-center justify-center pt-6 pb-6 px-3 relative;
        width: 35%;
        min-width: 320px;
        max-width: 480px;

        // 封面
        .landscape-cover-container {
          @apply flex-shrink-0 mx-auto mb-4 z-[9995];
          width: 85%;
          max-width: 260px;
          min-width: 180px;

          &.record-style {
            @extend .record-style-common;

            .img-wrapper {
              @apply border-[20px];
              width: 90%;
              height: 90%;
            }
          }
        }

        // 左侧进度条
        .landscape-progress-container {
          @apply mt-0 mb-2 px-2 w-full max-w-md;

          .apple-style-progress {
            height: 48px; // 增加高度使更容易点击

            .progress-thumb {
              @apply w-5 h-5;
            }
          }
        }
      }

      // 右侧区域
      .landscape-lyrics-section {
        @apply h-full flex-1 flex flex-col relative;

        // 歌曲信息
        .landscape-song-info {
          @apply flex justify-between items-center pt-5 z-[9995] px-4;
          @extend .song-info-common;

          .song-title {
            @apply text-2xl mb-1;
          }

          .song-artist {
            @apply text-base;
          }
        }

        // 歌词滚动区域
        .landscape-lyrics-scroller {
          @apply h-full w-full overflow-y-auto pt-24 pb-24;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          mask-image: linear-gradient(
            to bottom,
            transparent 5%,
            black 15%,
            black 85%,
            transparent 95%
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            transparent 5%,
            black 15%,
            black 85%,
            transparent 95%
          );
        }

        // 控制按钮
        .landscape-main-controls {
          @apply fixed bottom-6 right-6 flex items-center z-[10000];

          .main-button {
            @apply mx-2;
            width: 54px;
            height: 54px;
            background-color: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(8px);
            border-radius: 50%;

            &.play-pause {
              width: 70px;
              height: 70px;
              background-color: rgba(255, 255, 255, 0.25);
            }
          }
        }
      }
    }
  }

  // 竖屏模式布局
  &:not(.is-landscape) {
    .ios-layout-container {
      @apply flex flex-col items-center justify-between w-full h-full pt-10;
      padding-bottom: 180px; // 为控制区域留出空间

      // 封面样式
      .cover-container {
        @apply relative mb-6 transition-all duration-500 border-gray-900 z-[9995];

        &.style-changing {
          animation: styleChange 0.5s ease;
        }

        &.record-style {
          @extend .record-style-common;
          @apply w-72 h-72;

          .img-wrapper {
            @apply border-[40px];
            width: 90%;
            height: 90%;
          }
        }
      }

      // 歌曲信息
      .song-info {
        @apply flex flex-col items-center mb-5 w-full z-[9995];
        @extend .song-info-common;

        .song-title-container {
          @apply w-full text-center;

          .song-title {
            @apply text-2xl inline-block;
          }
        }

        .song-artist {
          @apply text-base mb-2;
        }

        .ri-heart-3-fill {
          @apply text-2xl;
        }
      }
    }

    // 统一控制区域
    .unified-controls {
      @apply fixed bottom-0 left-0 right-0 px-6 pt-6 pb-6;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
      height: 230px;
      pointer-events: auto;
      z-index: 10000 !important;

      .progress-container {
        @apply w-full mb-6;

        .apple-style-progress {
          height: 40px;

          .progress-thumb {
            @apply w-4 h-4;
          }
        }
      }

      .control-buttons {
        @apply flex items-center justify-between w-full px-4;

        .side-button {
          @apply w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-200;

          i {
            @apply text-2xl;
            color: var(--text-color-primary);
          }

          &:hover {
            i {
              color: var(--text-color-active);
            }
          }
        }

        .main-button {
          @apply w-14 h-14;

          i {
            @apply text-3xl;
          }

          &.play-pause {
            @apply w-16 h-16 bg-white/15 rounded-full backdrop-blur-sm;

            i {
              @apply text-4xl;
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
  z-index: 9999999999;

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

.favorite-icon {
  @apply cursor-pointer transition-all duration-200;

  i {
    @apply text-xl;
    color: var(--text-color-primary);

    &.favorite {
      @apply text-red-500 !important;
    }
  }

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }

  &.landscape {
    @apply mt-2;
    i {
      @apply text-2xl;
    }
  }
}

// 歌曲标题容器样式
.song-title-container {
  @apply w-full flex items-center justify-center relative;

  .song-title {
    @apply text-center text-2xl font-bold max-w-[80%] truncate;
    color: var(--text-color-active);
  }
}

// 通用歌词样式
.lyric-line {
  @apply cursor-pointer transition-all duration-300;
  font-weight: 500;
  letter-spacing: var(--lyric-letter-spacing, 0);
  line-height: var(--lyric-line-height, 1.6);
  color: var(--text-color-primary);
  opacity: 0.8;

  span {
    background-clip: text !important;
    -webkit-background-clip: text !important;
  }

  &.now-text {
    @apply font-bold py-4;
    color: var(--text-color-active);
    opacity: 1;
  }

  &.clicked {
    animation: clickPulse 0.3s ease-in-out;
  }

  .translation {
    @apply font-normal opacity-70 mt-1 text-base;
  }
}

// 全屏歌词相关样式
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
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%);
    height: 100px;
    pointer-events: auto;

    .song-title {
      @apply text-xl font-semibold text-center mb-1 max-w-full line-clamp-1;
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
    margin-bottom: 180px;
    margin-top: 90px;

    .lyrics-padding-top {
      height: 70px;
      min-height: 70px;
    }

    .lyrics-padding-bottom {
      height: 150px;
      min-height: 150px;
    }

    .lyric-line {
      @apply px-6 py-4 text-center;
      font-size: var(--lyric-font-size, 22px);

      span {
        padding-right: 10px;
      }
    }

    .now-text {
      @apply text-2xl;
    }
  }
}

// 必要的控制按钮样式
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

#mobile-drawer-target {
  // 横屏模式下的歌词样式
  &.is-landscape {
    .landscape-lyrics-section {
      .landscape-lyrics-scroller {
        .lyrics-padding-top {
          height: 30px;
          min-height: 30px;
        }

        .lyrics-padding-bottom {
          height: 100px;
          min-height: 100px;
        }

        .lyric-line {
          @apply px-4 py-3 text-left;
          font-size: 26px;
        }

        .now-text {
          @apply text-3xl;
        }
      }
    }
  }

  .unified-controls {
    &.fullscreen-mode {
      background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
    }

    .back-button {
      @apply absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center bg-black bg-opacity-30 rounded-2xl;

      i {
        @apply text-4xl;
        color: var(--text-color-primary);
      }
    }
  }

  .ios-layout-container {
    .lyrics-container {
      @apply w-full flex-grow flex flex-col items-center justify-center mb-6 overflow-hidden cursor-pointer;

      .lyrics-wrapper {
        @apply w-full flex flex-col items-center justify-center;

        .lyric-line {
          @apply text-center py-1 transition-all duration-300 opacity-70;

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

.cover-container {
  // 方形封面样式
  &.square-style {
    @apply w-[85%] shadow-2xl shadow-black/50 rounded-xl overflow-hidden mt-8 aspect-square;

    .cover-image {
      @apply w-full h-full;
      transition: transform 0.3s ease-out;

      &:active {
        transform: scale(0.95);
      }
    }
  }

  // 全屏封面样式
  &.full-style {
    @apply w-full max-h-[50vh] relative overflow-hidden;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40%;
      background: linear-gradient(
        transparent,
        var(--bg-color, rgba(25, 25, 25, 1)) 70%,
        var(--bg-color, rgba(25, 25, 25, 1))
      );
      z-index: 1;
      pointer-events: none;
    }

    .cover-image {
      @apply w-full h-auto shadow-lg;

      &.full-blend {
        mix-blend-mode: luminosity;
      }
    }
  }
}

.is-dark {
  .square-style {
    @apply shadow-2xl shadow-black/50;
  }
}
</style>
