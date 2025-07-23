<template>
  <n-drawer
    v-model:show="isVisible"
    height="100%"
    placement="bottom"
    :style="{ background: currentBackground || background }"
    :to="`#layout-main`"
    :z-index="9998"
  >
    <div id="drawer-target" :class="[config.theme]">
      <div
        class="control-btn absolute top-8 left-8"
        :class="{ 'pure-mode': config.pureModeEnabled }"
        @click="closeMusicFull"
      >
        <i class="ri-arrow-down-s-line"></i>
      </div>

      <n-popover trigger="click" placement="bottom">
        <template #trigger>
          <div
            class="control-btn absolute top-8 right-8"
            :class="{ 'pure-mode': config.pureModeEnabled }"
          >
            <i class="ri-settings-3-line"></i>
          </div>
        </template>
        <lyric-settings ref="lyricSettingsRef" />
      </n-popover>

      <div
        v-if="!config.hideCover"
        class="music-img"
        :class="{ 'only-cover': config.hideLyrics }"
        :style="{ color: textColors.theme === 'dark' ? '#000000' : '#ffffff' }"
      >
        <div class="img-container relative">
          <n-image
            ref="PicImgRef"
            :src="getImgUrl(playMusic?.picUrl, '500y500')"
            class="img"
            lazy
            preview-disabled
          />
          <div v-if="playMusic?.playLoading" class="loading-overlay">
            <i class="ri-loader-4-line loading-icon"></i>
          </div>
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
                class="cursor-pointer hover:text-green-500"
                @click="handleArtistClick(item.id)"
              >
                {{ item.name }}
                {{ index < artistList.length - 1 ? ' / ' : '' }}
              </span>
            </n-ellipsis>
          </div>
          <simple-play-bar
            v-if="!config.hideMiniPlayBar"
            class="mt-4"
            :pure-mode-enabled="config.pureModeEnabled"
            :isDark="textColors.theme === 'dark'"
          />
        </div>
      </div>

      <div
        class="music-content"
        :class="{
          center: config.centerLyrics,
          hide: config.hideLyrics
        }"
      >
        <n-layout
          ref="lrcSider"
          class="music-lrc"
          :style="{
            height: config.hidePlayBar ? '85vh' : '65vh',
            width: isMobile ? '100vw' : config.hideCover ? '50vw' : '500px'
          }"
          :native-scrollbar="false"
          @mouseover="mouseOverLayout"
          @mouseleave="mouseLeaveLayout"
        >
          <!-- 歌曲信息 -->
          <div ref="lrcContainer" class="music-lrc-container">
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
                  class="cursor-pointer hover:text-green-500"
                  @click="handleArtistClick(item.id)"
                >
                  {{ item.name }}
                  {{ index < artistList.length - 1 ? ' / ' : '' }}
                </span>
              </div>
            </div>
            <div
              v-for="(item, index) in lrcArray"
              :id="`music-lrc-text-${index}`"
              :key="index"
              class="music-lrc-text"
              :class="{ 'now-text': index === nowIndex, 'hover-text': item.text }"
              @click="setAudioTime(index)"
            >
              <span :style="getLrcStyle(index)">{{ item.text }}</span>
              <div v-show="config.showTranslation" class="music-lrc-text-tr">
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
        </n-layout>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import LyricCorrectionControl from '@/components/lyric/LyricCorrectionControl.vue';
import LyricSettings from '@/components/lyric/LyricSettings.vue';
import SimplePlayBar from '@/components/player/SimplePlayBar.vue';
import {
  adjustCorrectionTime,
  artistList,
  correctionTime,
  lrcArray,
  nowIndex,
  playMusic,
  setAudioTime,
  textColors,
  useLyricProgress
} from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { DEFAULT_LYRIC_CONFIG, LyricConfig } from '@/types/lyric';
import { getImgUrl, isMobile } from '@/utils';
import { animateGradient, getHoverBackgroundColor, getTextColors } from '@/utils/linearColor';

const { t } = useI18n();
// 定义 refs
const lrcSider = ref<any>(null);
const isMouse = ref(false);
const lrcContainer = ref<HTMLElement | null>(null);
const currentBackground = ref('');
const animationFrame = ref<number | null>(null);
const isDark = ref(false);
const showStickyHeader = ref(false);
const lyricSettingsRef = ref<InstanceType<typeof LyricSettings>>();

// 移除 computed 配置
const config = ref<LyricConfig>({ ...DEFAULT_LYRIC_CONFIG });

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

// 歌词滚动方法
const lrcScroll = (behavior: ScrollBehavior = 'smooth', forceTop: boolean = false) => {
  if (!isVisible.value || !lrcSider.value) return;

  if (forceTop) {
    lrcSider.value.scrollTo({
      top: 0,
      behavior
    });
    return;
  }

  if (isMouse.value) return;

  const nowEl = document.querySelector(`#music-lrc-text-${nowIndex.value}`) as HTMLElement;
  if (nowEl) {
    const containerHeight = lrcSider.value.$el.clientHeight;
    const elementTop = nowEl.offsetTop;
    const scrollTop = elementTop - containerHeight / 2 + nowEl.clientHeight / 2;

    lrcSider.value.scrollTo({
      top: scrollTop,
      behavior
    });
  }
};

const debouncedLrcScroll = useDebounceFn(lrcScroll, 200);

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

const setTextColors = (background: string) => {
  if (!background) {
    textColors.value = getTextColors();
    document.documentElement.style.setProperty('--hover-bg-color', getHoverBackgroundColor(false));
    document.documentElement.style.setProperty('--text-color-primary', textColors.value.primary);
    document.documentElement.style.setProperty('--text-color-active', textColors.value.active);
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

// 修改 useLyricProgress 的使用方式
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

// 组件卸载时清理动画
onBeforeUnmount(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
});

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

// 监听配置变化并保存到本地存储
watch(
  () => config.value,
  (newConfig) => {
    localStorage.setItem('music-full-config', JSON.stringify(newConfig));
  },
  { deep: true }
);

// 监听滚动事件
const handleScroll = () => {
  if (!lrcSider.value || !config.value.hideCover) return;
  const { scrollTop } = lrcSider.value.$el;
  showStickyHeader.value = scrollTop > 100;
};

const playerStore = usePlayerStore();

const closeMusicFull = () => {
  isVisible.value = false;
  playerStore.setMusicFull(false);
};

// 添加滚动监听
onMounted(() => {
  if (lrcSider.value?.$el) {
    lrcSider.value.$el.addEventListener('scroll', handleScroll);
  }
});

// 移除滚动监听
onBeforeUnmount(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
  if (lrcSider.value?.$el) {
    lrcSider.value.$el.removeEventListener('scroll', handleScroll);
  }
});

// 监听字体大小变化
watch(
  () => config.value.fontSize,
  (newSize) => {
    document.documentElement.style.setProperty('--lyric-font-size', `${newSize}px`);
  }
);

// 监听主题变化
watch(
  () => config.value.theme,
  (newTheme) => {
    const newBackground = themeMusic[newTheme] || props.background;
    setTextColors(newBackground);
  },
  { immediate: true }
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

// 加载保存的配置
onMounted(() => {
  const savedConfig = localStorage.getItem('music-full-config');
  if (savedConfig) {
    config.value = { ...config.value, ...JSON.parse(savedConfig) };
  }
  if (lrcSider.value?.$el) {
    lrcSider.value.$el.addEventListener('scroll', handleScroll);
  }
});

// 添加对 playMusic 的监听
watch(playMusic, () => {
  nextTick(() => {
    lrcScroll('instant', true);
  });
});

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
  @apply top-0 left-0 absolute overflow-hidden rounded px-24 flex items-center justify-center w-full h-full py-8;
  animation-duration: 300ms;

  .music-img {
    @apply flex-1 flex justify-center mr-16 flex-col items-center;
    max-width: 360px;
    max-height: 360px;
    transition: all 0.3s ease;

    &.only-cover {
      @apply mr-0 flex-initial;
      max-width: none;
      max-height: none;

      .img-container {
        @apply w-[50vh] h-[50vh] mb-8;
      }

      .img {
        @apply w-full h-full;
      }

      .music-info {
        @apply text-center w-[600px];

        .music-content-name {
          @apply text-4xl mb-4;
          color: var(--text-color-active);
        }

        .music-content-singer {
          @apply text-xl mb-8 opacity-80;
          color: var(--text-color-primary);
        }
      }
    }

    .img-container {
      @apply relative w-full h-full;
    }

    .img {
      @apply rounded-xl w-full h-full shadow-2xl transition-all duration-300;
    }

    .music-info {
      @apply w-full mt-4;

      .music-content-name {
        @apply text-2xl font-bold;
        color: var(--text-color-active);
      }

      .music-content-singer {
        @apply text-base mt-2 opacity-80;
        color: var(--text-color-primary);
      }
    }
  }

  .music-content {
    @apply flex flex-col justify-center items-center relative;
    width: 500px;
    transition: all 0.3s ease;

    &.center {
      @apply w-auto;
      .music-lrc {
        @apply w-full max-w-3xl mx-auto;
      }
      .music-lrc-text {
        @apply text-center;
      }
    }

    &.hide {
      @apply hidden;
    }
  }

  .music-content-time {
    display: none;
    @apply flex justify-center items-center;
  }

  .music-lrc-container {
    padding-top: 30vh;
  }

  .music-lrc {
    background-color: inherit;
    width: 500px;
    height: 550px;
    position: relative;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black 10%,
      black 90%,
      transparent 100%
    );

    .music-info-header {
      @apply mb-8;

      .music-info-name {
        @apply text-4xl font-bold mb-2;
        color: var(--text-color-active);
      }

      .music-info-singer {
        @apply text-base;
        color: var(--text-color-primary);
      }
    }

    &-text {
      @apply text-2xl cursor-pointer font-bold px-2 py-4;
      transition: all 0.3s ease;
      background-color: transparent;
      font-size: var(--lyric-font-size, 22px) !important;
      letter-spacing: var(--lyric-letter-spacing, 0) !important;
      line-height: var(--lyric-line-height, 2) !important;

      span {
        background-clip: text !important;
        -webkit-background-clip: text !important;
        padding-right: 30px;
      }

      &-tr {
        @apply font-normal;
        opacity: 0.7;
        color: var(--text-color-primary);
      }
    }

    .hover-text {
      &:hover {
        @apply font-bold opacity-100 rounded-xl;
        background-color: var(--hover-bg-color);

        span {
          color: var(--text-color-active) !important;
        }
      }
    }
  }
}

.mobile {
  #drawer-target {
    @apply flex-col p-4 pt-8 justify-start;
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
:root {
  --current-font-family:
    system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
}

#drawer-target {
  @apply top-0 left-0 absolute overflow-hidden rounded px-24 flex items-center justify-center w-full h-full py-8;
  animation-duration: 300ms;

  .music-lrc-text {
    font-family: var(--current-font-family);
  }
}

.close-btn {
  opacity: 0.3;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
}

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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  @apply absolute inset-0 flex items-center justify-center rounded-xl;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.loading-icon {
  font-size: 48px;
  color: white;
  animation: spin 1s linear infinite;
}

.lyric-correction {
  /* 仅在 hover 歌词区域时显示 */
  .music-lrc:hover & {
    opacity: 1 !important;
    pointer-events: auto !important;
  }
}
</style>
