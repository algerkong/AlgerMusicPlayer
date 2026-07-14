<template>
  <n-drawer
    v-model:show="isVisible"
    height="100%"
    placement="bottom"
    :style="drawerBaseStyle"
    :to="`#layout-main`"
    :z-index="9998"
    drawer-class="music-full-drawer"
    :show-mask="false"
    :mask-closable="false"
  >
    <!-- 背景层（用于图片模糊和明暗效果） -->
    <div
      v-if="
        config.useCustomBackground && config.backgroundMode === 'image' && config.backgroundImage
      "
      class="background-layer"
      :style="backgroundImageStyle"
    ></div>
    <div
      id="drawer-target"
      :class="[config.theme]"
      class="relative z-10"
      @mousemove="bumpChrome"
      @mousedown="bumpChrome"
    >
      <!-- 左侧关闭：鼠标静止自动隐藏，一动就显示 -->
      <div
        class="control-left absolute top-8 left-8 z-[9999]"
        :class="{ 'chrome-hidden': !chromeVisible }"
      >
        <div class="control-btn" @click="closeMusicFull">
          <i class="ri-arrow-down-s-line"></i>
        </div>
      </div>

      <!-- 右侧全屏：同上 idle 隐藏（设置入口已移除） -->
      <div
        class="control-right absolute top-8 right-8 z-[9999]"
        :class="{ 'chrome-hidden': !chromeVisible }"
      >
        <div class="control-btn" @click="toggleFullScreen">
          <i :class="isFullScreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"></i>
        </div>
      </div>

      <div class="content-wrapper" :style="{ width: `${config.contentWidth}%` }">
        <!-- 左侧：封面区域 -->
        <div
          v-if="!config.hideCover"
          class="left-side"
          :class="{ 'only-cover': config.hideLyrics }"
        >
          <div class="img-container">
            <cover3-d
              ref="PicImgRef"
              :src="getImgUrl(playMusic?.picUrl, '500y500')"
              :loading="playMusic?.playLoading"
              :max-tilt="12"
              :scale="1.03"
              :shine-intensity="0.25"
            />
          </div>
          <div class="music-info">
            <div class="music-content-name">{{ playMusic.name }}</div>
            <div class="music-content-singer">
              <n-ellipsis
                class="text-ellipsis"
                line-clamp="2"
                :tooltip="{
                  contentStyle: { maxWidth: '600px' },
                  zIndex: 99999
                }"
              >
                <span
                  v-for="(item, index) in artistList"
                  :key="index"
                  class="cursor-pointer hover:text-primary"
                  @click="handleArtistClick(item.id)"
                >
                  {{ item.name }}
                  {{ index < artistList.length - 1 ? ' / ' : '' }}
                </span>
              </n-ellipsis>
            </div>
            <simple-play-bar class="mt-4" :isDark="textColors.theme === 'dark'" />
          </div>
        </div>

        <!-- 右侧：歌词区域 -->
        <div
          class="right-side"
          :class="{
            center: config.centerLyrics,
            hide: config.hideLyrics,
            'full-width': config.hideCover
          }"
        >
          <scroll-area
            ref="lrcSider"
            class="music-lrc h-full"
            @mouseover="mouseOverLayout"
            @mouseleave="mouseLeaveLayout"
          >
            <!-- 歌曲信息 -->
            <div class="music-lrc-container">
              <div
                v-if="config.hideCover"
                class="music-info-header"
                :style="{ textAlign: config.centerLyrics ? 'center' : 'left' }"
              >
                <div class="music-info-name">{{ playMusic.name }}</div>
                <div class="music-info-singer">
                  <span
                    v-for="(item, index) in artistList"
                    :key="index"
                    class="cursor-pointer hover:text-primary"
                    @click="handleArtistClick(item.id)"
                  >
                    {{ item.name }}
                    {{ index < artistList.length - 1 ? ' / ' : '' }}
                  </span>
                </div>
              </div>
              <!-- 无时间戳歌词提示 -->
              <div v-if="!supportAutoScroll" class="music-lrc-text no-scroll-tip">
                <span>{{ t('player.lrc.noAutoScroll') }}</span>
              </div>
              <div
                v-for="(item, index) in lrcArray"
                :id="`music-lrc-text-${index}`"
                :key="index"
                class="music-lrc-text"
                :class="{
                  'now-text': index === nowIndex,
                  'hover-text': item.text && item.startTime !== -1
                }"
                @click="item.startTime !== -1 ? setAudioTime(index) : null"
              >
                <!-- 逐字：始终同一 clip 渐变路径，词间不闪 -->
                <div
                  v-if="item.hasWordByWord && item.words && item.words.length > 0"
                  class="word-by-word-lyric"
                >
                  <template v-for="(word, wordIndex) in item.words" :key="wordIndex">
                    <span class="lyric-word" :style="getWordStyle(index, wordIndex, word)"
                      >{{ word.text }}<template v-if="word.space">&nbsp;</template></span
                    >
                  </template>
                </div>
                <span v-else :style="getLrcStyle(index)">{{ item.text }}</span>
                <div v-if="item.trText" class="music-lrc-text-tr">
                  {{ item.trText }}
                </div>
              </div>

              <!-- 无歌词 -->
              <div v-if="!lrcArray.length" class="music-lrc-text">
                <span>{{ t('player.lrc.noLrc') }}</span>
              </div>
            </div>
            <!-- 歌词右下角矫正按钮组件 -->
            <lyric-correction-control
              v-if="!isMobile"
              :correction-time="correctionTime"
              @adjust="adjustCorrectionTime"
            />
          </scroll-area>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import Cover3D from '@/components/cover/Cover3D.vue';
import LyricCorrectionControl from '@/components/lyric/LyricCorrectionControl.vue';
import SimplePlayBar from '@/components/player/SimplePlayBar.vue';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  adjustCorrectionTime,
  artistList,
  correctionTime,
  getLyricClockSec,
  lrcArray,
  nowIndex,
  playMusic,
  setAudioTime,
  textColors,
  useLyricProgress
} from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { useLyricBackground } from '@/hooks/useLyricBackground';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { DEFAULT_LYRIC_CONFIG, LyricConfig } from '@/types/lyric';
import { getImgUrl, isMobile } from '@/utils';
import { getTextColors } from '@/utils/linearColor';
import { getActiveLineWordStyle, getInactiveLineWordStyle } from '@/utils/lyricWordStyle';

const { t } = useI18n();
// 定义 refs
const lrcSider = ref<any>(null);
const isMouse = ref(false);
/** 顶栏控件：静止隐藏，鼠标一动显示 */
const chromeVisible = ref(true);
let chromeIdleTimer: ReturnType<typeof setTimeout> | null = null;
const CHROME_IDLE_MS = 2200;

const bumpChrome = () => {
  if (isMobile.value) {
    chromeVisible.value = true;
    return;
  }
  chromeVisible.value = true;
  if (chromeIdleTimer) clearTimeout(chromeIdleTimer);
  chromeIdleTimer = setTimeout(() => {
    chromeVisible.value = false;
  }, CHROME_IDLE_MS);
};

const { currentBackground, applyBackground } = useLyricBackground();

// 计算自定义背景样式
const customBackgroundStyle = computed(() => {
  if (!config.value.useCustomBackground) {
    return null;
  }

  switch (config.value.backgroundMode) {
    case 'solid':
      return config.value.solidColor;
    case 'gradient': {
      const { colors, direction } = config.value.gradientColors;
      return `linear-gradient(${direction}, ${colors.join(', ')})`;
    }
    case 'image':
      if (!config.value.backgroundImage) return null;
      // 构建完整的背景样式，包括滤镜效果
      return config.value.backgroundImage;
    case 'css':
      return config.value.customCss || null;
    default:
      return null;
  }
});

// drawer 基础样式（非图片模式）
const drawerBaseStyle = computed(() => {
  // 图片模式时不设置背景，使用单独的背景层
  if (config.value.useCustomBackground && config.value.backgroundMode === 'image') {
    return { background: 'transparent' };
  }
  // 其他模式正常设置背景
  if (config.value.useCustomBackground && customBackgroundStyle.value) {
    return { background: customBackgroundStyle.value };
  }
  return { background: currentBackground.value || props.background };
});

// 背景图片层样式（只在图片模式下使用）
const backgroundImageStyle = computed(() => {
  const blur = config.value.imageBlur || 0;
  const brightness = config.value.imageBrightness || 100;
  return {
    backgroundImage: `url(${config.value.backgroundImage})`,
    filter: `blur(${blur}px) brightness(${brightness}%)`
  };
});
const showStickyHeader = ref(false);
const isSongChanging = ref(false);
const isFullScreen = ref(false);

/** 大屏设置 UI 已删除；保留默认配置（可从旧 localStorage 读入字号等） */
const config = ref<LyricConfig>({ ...DEFAULT_LYRIC_CONFIG });

const supportAutoScroll = computed(() => {
  return lrcArray.value.length > 0 && lrcArray.value[0].startTime !== -1;
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

/** shadcn ScrollArea 真正滚的是 viewport */
const getLrcScrollEl = (): HTMLElement | null => {
  const comp = lrcSider.value as {
    getViewport?: () => HTMLElement | null;
    viewport?: HTMLElement;
  } | null;
  if (!comp) return null;
  if (typeof comp.getViewport === 'function') {
    return comp.getViewport();
  }
  return comp.viewport ?? null;
};

let lrcScrollAnimId = 0;

/** 缓动滚到目标：逐字时盯着看，别用浏览器默认 snap 一下 */
const softScrollTo = (el: HTMLElement, targetTop: number, durationMs = 1100) => {
  if (lrcScrollAnimId) {
    cancelAnimationFrame(lrcScrollAnimId);
    lrcScrollAnimId = 0;
  }
  const startTop = el.scrollTop;
  const delta = targetTop - startTop;
  if (Math.abs(delta) < 1) return;

  const startTs = performance.now();
  // easeInOutCubic：起停都软
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const tick = (now: number) => {
    const p = Math.min(1, (now - startTs) / durationMs);
    el.scrollTop = startTop + delta * ease(p);
    if (p < 1) {
      lrcScrollAnimId = requestAnimationFrame(tick);
    } else {
      lrcScrollAnimId = 0;
    }
  };
  lrcScrollAnimId = requestAnimationFrame(tick);
};

// 歌词滚动方法
const lrcScroll = (behavior: ScrollBehavior | 'soft' = 'soft', forceTop: boolean = false) => {
  if (!isVisible.value || !lrcSider.value || !supportAutoScroll.value) return;

  const scrollEl = getLrcScrollEl();
  if (!scrollEl) return;

  if (forceTop) {
    if (behavior === 'instant' || behavior === 'auto') {
      scrollEl.scrollTop = 0;
    } else {
      softScrollTo(scrollEl, 0, 700);
    }
    return;
  }

  if (isMouse.value) return;

  const nowEl = document.querySelector(`#music-lrc-text-${nowIndex.value}`) as HTMLElement;
  if (nowEl) {
    const containerHeight = scrollEl.clientHeight;
    const elementTop = nowEl.offsetTop;
    // 当前句略偏上一点（40%），更像盯着逐字在读
    const scrollTop = elementTop - containerHeight * 0.4 + nowEl.clientHeight / 2;

    if (behavior === 'instant' || behavior === 'auto') {
      scrollEl.scrollTop = scrollTop;
    } else {
      // 换行滚动加长到 ~1.1s，避免生硬跳
      softScrollTo(scrollEl, scrollTop, 1100);
    }
  }
};

const debouncedLrcScroll = useDebounceFn(() => lrcScroll('soft'), 80);

const mouseOverLayout = () => {
  if (isMobile.value) {
    return;
  }
  isMouse.value = true;
};

const mouseLeaveLayout = () => {
  if (isMobile.value) {
    return;
  }
  setTimeout(() => {
    isMouse.value = false;
    lrcScroll();
  }, 2000);
};

watch(nowIndex, () => {
  // 歌曲切换时不自动滚动
  if (isSongChanging.value) return;
  debouncedLrcScroll();
});

watch(
  () => isVisible.value,
  () => {
    if (isVisible.value) {
      nextTick(() => {
        lrcScroll('instant');
      });
    }
  }
);

const targetBackground = computed(() => {
  if (config.value.useCustomBackground && customBackgroundStyle.value) {
    if (typeof customBackgroundStyle.value === 'string') {
      return customBackgroundStyle.value;
    }
  }
  if (config.value.theme !== 'default') {
    return themeMusic[config.value.theme] || props.background;
  }
  return props.background;
});

// 监听目标背景变化并更新文字颜色
watch(
  targetBackground,
  (newBg) => {
    if (newBg) {
      applyBackground(newBg);
    }
  },
  { immediate: true }
);

const { getLrcStyle: originalLrcStyle } = useLyricProgress();

const getLrcStyle = (index: number) => {
  const colors = textColors.value || getTextColors();
  const originalStyle = originalLrcStyle(index);

  if (index === nowIndex.value) {
    // 当前播放的歌词
    if (originalStyle.backgroundImage) {
      // 有渐变进度时，使用渐变效果
      return {
        ...originalStyle,
        backgroundImage: originalStyle.backgroundImage
          .replace(/#ffffff/g, colors.active)
          .replace(/#ffffff8a/g, `${colors.primary}`),
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent'
      };
    } else {
      return {
        color: colors.primary
      };
    }
  }

  // 非当前播放的歌词，使用普通颜色
  return {
    color: colors.primary
  };
};

// 逐字：当前行全程同一绘制路径（clip 渐变 0→1），词切完不换 solid 色 → 不闪
const getWordStyle = (lineIndex: number, _wordIndex: number, word: any) => {
  const colors = textColors.value || getTextColors();
  if (lineIndex !== nowIndex.value) {
    return getInactiveLineWordStyle(colors);
  }
  return getActiveLineWordStyle(getLyricClockSec() * 1000, word, colors);
};

const settingsStore = useSettingsStore();

const { navigateToArtist } = useArtist();

const handleArtistClick = (id: number) => {
  isVisible.value = false;
  navigateToArtist(id);
};

const setData = computed(() => settingsStore.setData);

// 监听字体变化并更新 CSS 变量
watch(
  () => [setData.value.fontFamily, setData.value.fontScope],
  ([newFont, fontScope]) => {
    const defaultFonts =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    // 如果不是歌词模式或全局模式，使用默认字体
    if (fontScope !== 'lyric' && fontScope !== 'global') {
      document.documentElement.style.setProperty('--current-font-family', defaultFonts);
      return;
    }

    if (newFont === 'system-ui') {
      document.documentElement.style.setProperty('--current-font-family', defaultFonts);
    } else {
      // 处理多个字体，确保每个字体名都被正确引用
      const fontList = newFont.split(',').map((font) => {
        const trimmedFont = font.trim();
        // 如果字体名包含空格或特殊字符，添加引号（如果还没有引号的话）
        return /[\s'"()]/.test(trimmedFont) && !/^['"].*['"]$/.test(trimmedFont)
          ? `"${trimmedFont}"`
          : trimmedFont;
      });

      // 将选择的字体和默认字体组合
      document.documentElement.style.setProperty(
        '--current-font-family',
        `${fontList.join(', ')}, ${defaultFonts}`
      );
    }
  },
  { immediate: true }
);

// 监听滚动事件
const handleScroll = () => {
  if (!config.value.hideCover) return;
  const el = getLrcScrollEl();
  if (!el) return;
  showStickyHeader.value = el.scrollTop > 100;
};

const playerStore = usePlayerStore();

const closeMusicFull = () => {
  // 退出全屏模式
  if (isFullScreen.value && document.fullscreenElement) {
    document.exitFullscreen();
  }
  isVisible.value = false;
  playerStore.setMusicFull(false);
};

// 全屏切换方法
const toggleFullScreen = async () => {
  try {
    if (!document.fullscreenElement) {
      // 进入全屏
      await document.documentElement.requestFullscreen();
      isFullScreen.value = true;
    } else {
      // 退出全屏
      await document.exitFullscreen();
      isFullScreen.value = false;
    }
  } catch (error) {
    console.error('全屏切换失败:', error);
  }
};

// 监听全屏状态变化
const handleFullScreenChange = () => {
  isFullScreen.value = !!document.fullscreenElement;
};

// 添加滚动监听和全屏状态监听
onMounted(() => {
  getLrcScrollEl()?.addEventListener('scroll', handleScroll);
  document.addEventListener('fullscreenchange', handleFullScreenChange);
});

// 移除滚动监听和全屏状态监听
onBeforeUnmount(() => {
  if (lrcScrollAnimId) {
    cancelAnimationFrame(lrcScrollAnimId);
    lrcScrollAnimId = 0;
  }
  if (chromeIdleTimer) {
    clearTimeout(chromeIdleTimer);
    chromeIdleTimer = null;
  }
  getLrcScrollEl()?.removeEventListener('scroll', handleScroll);
  document.removeEventListener('fullscreenchange', handleFullScreenChange);
  // 退出全屏模式
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
});

// 监听字体大小变化
watch(
  () => config.value.fontSize,
  (newSize) => {
    document.documentElement.style.setProperty('--lyric-font-size', `${newSize}px`);
  }
);

// 监听字体粗细变化
watch(
  () => config.value.fontWeight,
  (newWeight) => {
    document.documentElement.style.setProperty('--lyric-font-weight', newWeight.toString());
  }
);

// 添加文字间距监听
watch(
  () => config.value.letterSpacing,
  (newSpacing) => {
    document.documentElement.style.setProperty('--lyric-letter-spacing', `${newSpacing}px`);
  }
);

// 添加行高监听
watch(
  () => config.value.lineHeight,
  (newLineHeight) => {
    document.documentElement.style.setProperty('--lyric-line-height', newLineHeight.toString());
  }
);

// 加载保存的配置（去掉已删除的「显示」类开关）
onMounted(() => {
  const savedConfig = localStorage.getItem('music-full-config');
  if (savedConfig) {
    try {
      config.value = {
        ...config.value,
        ...JSON.parse(savedConfig),
        pureModeEnabled: false,
        hideCover: false,
        centerLyrics: false,
        hideLyrics: false,
        // 设置 UI 已去掉：封面下迷你条始终显示，底栏由 PlayBar 在大屏时自行隐藏
        hideMiniPlayBar: false,
        hidePlayBar: true
      };
    } catch {
      // 损坏的 music-full-config 忽略，用默认
    }
  }
  getLrcScrollEl()?.addEventListener('scroll', handleScroll);
  bumpChrome();
});

// 添加对 playMusic.id 的监听，歌曲切换时滚动到顶部
watch(
  () => playMusic.value.id,
  (newId, oldId) => {
    // 只在歌曲真正切换时滚动到顶部
    if (newId !== oldId && newId) {
      isSongChanging.value = true;
      // 延迟滚动，确保 nowIndex 已重置
      setTimeout(() => {
        lrcScroll('instant', true);
        // 延迟恢复自动滚动，等待歌词数据更新
        setTimeout(() => {
          isSongChanging.value = false;
        }, 300);
      }, 100);
    }
  }
);

defineExpose({
  lrcScroll,
  config
});
</script>

<style scoped lang="scss">
@keyframes round {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.drawer-back {
  @apply absolute bg-cover bg-center;
  z-index: -1;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
}

.drawer-back.paused {
  animation-play-state: paused;
}

#drawer-target {
  @apply top-0 left-0 absolute overflow-hidden rounded w-full h-full;
  animation-duration: 300ms;

  .content-wrapper {
    @apply grid items-center mx-auto h-full;
    grid-template-columns: minmax(300px, 40%) 1fr;
    /* 左右栏再隔开一点 */
    gap: 6.5rem;
    max-width: 1600px;
    padding: 2rem;
    transition: width 0.3s ease;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      gap: 2rem;
    }
  }

  .left-side {
    @apply flex flex-col items-center justify-center h-full;
    transition: all 0.3s ease;

    &.only-cover {
      @apply col-span-2;

      .img-container {
        @apply w-[60vh] aspect-square;
      }

      .music-info {
        @apply max-w-[800px];
      }
    }

    .img-container {
      @apply relative w-[45vh] mb-8 aspect-square;
      max-width: 100%;
    }

    .music-info {
      @apply w-full text-center max-w-[400px];

      .music-content-name {
        @apply text-3xl font-bold mb-2 line-clamp-2;
        color: var(--text-color-active);
      }

      .music-content-singer {
        @apply text-lg opacity-80;
        color: var(--text-color-primary);
      }
    }
  }

  .right-side {
    /* 整块歌词区域高度：别 h-full 撑满；略偏上 + 与左侧栏留缝 */
    --lyric-panel-height: 58vh;
    @apply flex flex-col justify-center relative overflow-hidden;
    height: var(--lyric-panel-height);
    max-height: 100%;
    /* 相对垂直居中再往上挪一点 */
    align-self: center;
    margin-top: -8vh;
    /* 再跟左边封面拉开一点（叠在 gap 上） */
    margin-left: 1.75rem;
    padding-left: 0.75rem;

    &.full-width {
      @apply col-span-2;
      --lyric-panel-height: 70vh;
      margin-left: 0;
      padding-left: 0;
    }

    &.center {
      .music-lrc {
        @apply w-full mx-auto text-center;
      }

      .music-lrc-text {
        @apply text-center;
        transform-origin: center center;
      }

      .word-by-word-lyric {
        @apply justify-center;
      }
    }

    &.hide {
      @apply hidden;
    }

    .music-lrc {
      @apply w-full h-full bg-transparent;
      mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 12%,
        black 88%,
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 12%,
        black 88%,
        transparent 100%
      );

      .music-info-header {
        @apply mb-8;

        .music-info-name {
          @apply text-4xl font-bold mb-2 line-clamp-2;
          color: var(--text-color-active);
        }

        .music-info-singer {
          @apply text-xl opacity-80;
          color: var(--text-color-primary);
        }
      }
    }

    .music-lrc-container {
      /* 滚动居中用的上下垫高：跟面板高度挂钩，约半高 */
      padding: calc(var(--lyric-panel-height) * 0.42) 0;
      min-height: 100%;
    }

    .music-lrc-text {
      @apply text-2xl cursor-pointer font-bold px-4 py-3;
      font-family: var(--current-font-family);
      font-weight: var(--lyric-font-weight, bold) !important;
      transition: all 0.3s ease;
      background-color: transparent;
      font-size: var(--lyric-font-size, 22px) !important;
      letter-spacing: var(--lyric-letter-spacing, 0) !important;
      line-height: var(--lyric-line-height, 2) !important;
      opacity: 0.6;
      transform-origin: left center;

      &.now-text {
        opacity: 1;
        transform: scale(1.05);
      }

      &.no-scroll-tip {
        @apply text-base opacity-60 cursor-default py-2;
        color: var(--text-color-primary);
        font-weight: normal;

        span {
          padding-right: 0;
        }

        &:hover {
          background-color: transparent;
        }
      }

      // 整行歌词可点区域留白；逐字 .lyric-word 绝不能带这 30px（英文会词间巨大空隙）
      > span {
        background-clip: text !important;
        -webkit-background-clip: text !important;
        padding-right: 30px;
      }

      &-tr {
        @apply font-normal;
        opacity: 0.7;
        color: var(--text-color-primary);
      }

      // 逐字：inline 流式；英文空格靠源数据 word.space → &nbsp;，一个就够
      .word-by-word-lyric {
        display: block;
        white-space: pre-wrap;
        word-break: break-word;

        .lyric-word {
          display: inline;
          padding-right: 0 !important;
          font-weight: inherit;
          font-size: inherit;
          letter-spacing: inherit;
          line-height: inherit;
          cursor: inherit;
          position: relative;
          // 不设 background-color hover：会冲掉 clip 渐变造成闪
        }
      }
    }

    .hover-text {
      &:hover {
        @apply font-bold opacity-100 rounded-xl;
        background-color: var(--hover-bg-color);

        // 仅直接子 span（整行歌词）；.lyric-word 在 div 里，别用 color 冲掉 clip
        > span {
          color: var(--text-color-active) !important;
        }
      }
    }
  }
}

.mobile {
  #drawer-target {
    @apply p-4 pt-8;

    .content-wrapper {
      @apply flex-col justify-start p-0;
    }

    .music-img {
      display: none;
    }

    .music-lrc {
      height: calc(100vh - 260px) !important;
      width: 100vw;

      span {
        padding-right: 0px !important;
      }

      .hover-text {
        &:hover {
          background-color: transparent;
        }
      }

      .music-lrc-text {
        @apply text-xl text-center;
      }
    }

    .music-content {
      @apply h-[calc(100vh-120px)];
      width: 100vw !important;
    }
  }
}

.music-drawer {
  transition: none; // 移除之前的过渡效果，现在使用 JS 动画
}

// 添加全局字体样式
// 字体设置已移至上方或不再需要单独的 drawer-target 块
:root {
  --current-font-family:
    system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
}

.close-btn {
  opacity: 0.3;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
}

.control-left,
.control-right {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
  pointer-events: auto;

  &.chrome-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(-6px);
  }
}

.control-right {
  @apply flex items-center gap-2;
}

.control-btn {
  @apply w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-all duration-300;
  background: var(--chrome-surface, rgba(142, 142, 142, 0.22));
  border: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.14));
  backdrop-filter: blur(var(--chrome-blur, 12px));
  -webkit-backdrop-filter: blur(var(--chrome-blur, 12px));

  i {
    @apply text-xl;
    color: var(--chrome-text, var(--text-color-active, #fff));
  }

  &:hover {
    background: var(--chrome-surface-strong, rgba(126, 121, 121, 0.35));
    border-color: var(--primary-color, rgba(255, 255, 255, 0.28));

    i {
      opacity: 1;
      color: var(--primary-color, #fff);
    }
  }
}

.lyric-correction {
  .music-lrc:hover & {
    opacity: 1 !important;
    pointer-events: auto !important;
  }
}
</style>
