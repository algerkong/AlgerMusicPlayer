<template>
  <n-drawer
    v-model:show="isVisible"
    height="100%"
    placement="bottom"
    :style="drawerBaseStyle"
    :to="`#layout-main`"
    :z-index="9998"
  >
    <!-- 背景层（用于图片模糊和明暗效果） -->
    <div
      v-if="
        config.useCustomBackground && config.backgroundMode === 'image' && config.backgroundImage
      "
      class="background-layer"
      :style="backgroundImageStyle"
    ></div>
    <div id="drawer-target" :class="[config.theme]" class="relative z-10">
      <!-- 左侧关闭按钮 -->
      <div
        class="control-left absolute top-8 left-8 z-[9999]"
        :class="{ 'pure-mode': config.pureModeEnabled }"
      >
        <div class="control-btn" @click="closeMusicFull">
          <i class="ri-arrow-down-s-line"></i>
        </div>
      </div>

      <!-- 右侧功能按钮组 -->
      <div
        class="control-right absolute top-8 right-8 z-[9999]"
        :class="{ 'pure-mode': config.pureModeEnabled }"
      >
        <n-popover v-model:show="settingsPopoverVisible" trigger="click" placement="bottom" raw>
          <template #trigger>
            <div class="control-btn">
              <i class="ri-settings-3-line"></i>
            </div>
          </template>
          <lyric-settings ref="lyricSettingsRef" />
        </n-popover>

        <div class="control-btn" @click="toggleFullScreen">
          <i :class="isFullScreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"></i>
        </div>
      </div>

      <!-- 纯净模式首次开启引导：两步指向式引导，① 右上角功能按钮 → ② 左上角收起按钮，手动切换（上一步/下一步/完成） -->
      <transition name="fade">
        <div v-if="showPureModeTip" class="pure-mode-tip-layer">
          <transition name="fade" mode="out-in">
            <div v-if="pureModeTipStep === 1" key="right" class="absolute inset-0">
              <div class="pure-mode-tip-highlight"></div>
              <div class="pure-mode-tip-bubble">
                <div class="pure-mode-tip-content">
                  <i class="ri-cursor-line"></i>
                  <span>{{ t('settings.lyricSettings.pureModeOnboarding') }}</span>
                  <div class="pure-mode-tip-dots">
                    <span class="is-active"></span>
                    <span></span>
                  </div>
                </div>
                <div class="pure-mode-tip-actions">
                  <button
                    type="button"
                    class="pure-mode-tip-btn pure-mode-tip-btn--primary"
                    @click="nextPureModeTipStep"
                  >
                    {{ t('common.nextStep') }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else key="left" class="absolute inset-0">
              <div class="pure-mode-tip-highlight pure-mode-tip-highlight--left"></div>
              <div class="pure-mode-tip-bubble pure-mode-tip-bubble--left">
                <div class="pure-mode-tip-content">
                  <i class="ri-cursor-line"></i>
                  <span>{{ t('settings.lyricSettings.pureModeOnboardingStep2') }}</span>
                  <div class="pure-mode-tip-dots">
                    <span></span>
                    <span class="is-active"></span>
                  </div>
                </div>
                <div class="pure-mode-tip-actions">
                  <button type="button" class="pure-mode-tip-btn" @click="prevPureModeTipStep">
                    {{ t('common.prevStep') }}
                  </button>
                  <button
                    type="button"
                    class="pure-mode-tip-btn pure-mode-tip-btn--primary"
                    @click="finishPureModeTip"
                  >
                    {{ t('common.done') }}
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition>

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
            <div class="music-content-name" v-html="playMusic.name"></div>
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

        <!-- 右侧：歌词区域 -->
        <div
          class="right-side"
          :class="{
            center: config.centerLyrics,
            hide: config.hideLyrics,
            'full-width': config.hideCover
          }"
        >
          <n-layout
            ref="lrcSider"
            class="music-lrc"
            :native-scrollbar="false"
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
                <div class="music-info-name" v-html="playMusic.name"></div>
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
              <!-- 无时间戳歌词提示 -->
              <div v-if="!supportAutoScroll" class="music-lrc-text no-scroll-tip">
                <span>{{ t('player.lrc.noAutoScroll') }}</span>
              </div>
              <div
                v-for="(item, index) in lrcArray"
                :id="`music-lrc-text-${index}`"
                :key="index"
                class="music-lrc-text"
                :style="getFocusStyle(index)"
                :class="{
                  'now-text': index === nowIndex,
                  'hover-text': item.text && item.startTime !== -1
                }"
                @click="item.startTime !== -1 ? setAudioTime(index) : null"
              >
                <!-- 逐字歌词显示 -->
                <div
                  v-if="item.hasWordByWord && item.words && item.words.length > 0"
                  class="word-by-word-lyric"
                >
                  <template v-for="(word, wordIndex) in item.words" :key="wordIndex">
                    <span class="lyric-word" :style="getWordStyle(index, wordIndex, word)">
                      {{ word.text }} </span
                    ><span class="lyric-word" v-if="word.space">&nbsp;</span></template
                  >
                </div>
                <!-- 普通歌词显示 -->
                <span v-else :style="getLrcStyle(index)">{{ item.text }}</span>
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
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import Cover3D from '@/components/cover/Cover3D.vue';
import LyricCorrectionControl from '@/components/lyric/LyricCorrectionControl.vue';
import LyricSettings from '@/components/lyric/LyricSettings.vue';
import SimplePlayBar from '@/components/player/SimplePlayBar.vue';
import {
  adjustCorrectionTime,
  artistList,
  correctionTime,
  lrcArray,
  nowIndex,
  nowTime,
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
import { LYRIC_CONFIG_CHANGE_EVENT, readLyricConfig, writeLyricConfig } from '@/utils/lyricConfig';

const { t } = useI18n();
// 定义 refs
const lrcSider = ref<any>(null);
const isMouse = ref(false);
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
const lyricSettingsRef = ref<InstanceType<typeof LyricSettings>>();
const isSongChanging = ref(false);
const isFullScreen = ref(false);

const config = ref<LyricConfig>({ ...DEFAULT_LYRIC_CONFIG });

watch(
  () => lyricSettingsRef.value?.config,
  (newConfig) => {
    if (newConfig) {
      config.value = newConfig;
    }
  },
  { deep: true, immediate: true }
);

// 监听本地配置变化，保存到 localStorage 并广播给设置页等外部组件
watch(
  () => config.value,
  (newConfig) => {
    writeLyricConfig(newConfig);
    if (lyricSettingsRef.value) {
      lyricSettingsRef.value.config = newConfig;
    }
  },
  { deep: true }
);

// 监听设置页等外部来源的配置变更；内容一致时跳过，避免互相触发造成死循环
const handleLyricConfigChange = () => {
  const nextConfig = readLyricConfig();
  if (JSON.stringify(nextConfig) !== JSON.stringify(config.value)) {
    config.value = nextConfig;
  }
};

// 纯净模式首次开启引导（#758）：两步指向式引导（右上角功能按钮 → 左上角收起按钮），
// 手动切换（上一步/下一步/完成）、每位用户仅展示一次
const PURE_MODE_ONBOARDED_KEY = 'pureModeOnboarded';
const settingsPopoverVisible = ref(false);
const showPureModeTip = ref(false);
const pureModeTipStep = ref(1);
const pendingPureModeTip = ref(false);

const showPureModeTipStep = (step: number) => {
  pureModeTipStep.value = step;
  showPureModeTip.value = true;
};

const displayPureModeTip = () => {
  pendingPureModeTip.value = false;
  localStorage.setItem(PURE_MODE_ONBOARDED_KEY, 'true');
  showPureModeTipStep(1);
};

const prevPureModeTipStep = () => {
  if (pureModeTipStep.value > 1) {
    showPureModeTipStep(1);
  }
};

const nextPureModeTipStep = () => {
  if (pureModeTipStep.value < 2) {
    showPureModeTipStep(2);
  }
};

const finishPureModeTip = () => {
  showPureModeTip.value = false;
};

const showPureModeOnboarding = () => {
  if (!isVisible.value || localStorage.getItem(PURE_MODE_ONBOARDED_KEY)) return;
  // 从设置弹层内开启时先挂起，等弹层关闭后再展示，避免引导被弹层遮挡
  if (settingsPopoverVisible.value) {
    pendingPureModeTip.value = true;
    return;
  }
  displayPureModeTip();
};

// 设置弹层关闭后，若仍有待展示的引导则浮现
watch(settingsPopoverVisible, (visible) => {
  if (!visible && pendingPureModeTip.value && isVisible.value) {
    displayPureModeTip();
  }
});

// 开启纯净模式时展示一次引导
watch(
  () => config.value.pureModeEnabled,
  (newValue, oldValue) => {
    if (newValue && !oldValue) {
      showPureModeOnboarding();
    }
  }
);

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

// 歌词滚动方法
const lrcScroll = (behavior: ScrollBehavior = 'smooth', forceTop: boolean = false) => {
  if (!isVisible.value || !lrcSider.value || !supportAutoScroll.value) return;

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
  // 歌曲切换时不自动滚动
  if (isSongChanging.value) return;
  debouncedLrcScroll();
});

watch(
  () => isVisible.value,
  () => {
    if (isVisible.value) {
      // 已处于纯净模式但从未见过引导的用户（如从设置页开启），打开播放页时补一次引导
      if (config.value.pureModeEnabled) {
        showPureModeOnboarding();
      }
      nextTick(() => {
        lrcScroll('instant');
      });
    } else {
      // 关闭播放页时结束未完成的引导，避免后台残留
      showPureModeTip.value = false;
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
  const focusOn = config.value.focusCurrentLyric;

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
        // 聚焦模式下当前行使用全亮文字色（Apple Music 观感），其余行维持半透明
        color: focusOn ? colors.active : colors.primary
      };
    }
  }

  // 非当前播放的歌词，使用普通颜色
  return {
    color: colors.primary
  };
};

// Apple Music 风格聚焦效果（#750）：
// 当前播放行清晰、放大、明亮并带柔和光晕；其余行随距离渐远而更模糊、更淡。
// 光晕用父元素 drop-shadow 而非 text-shadow：background-clip: text 下 text-shadow
// 会绘制在渐变填充之上，糊掉卡拉OK进度；drop-shadow 还能同时覆盖逐字歌词行。
const FOCUS_LINE_LEVELS = [
  { opacity: 1, blur: 0 }, // 当前行
  { opacity: 0.5, blur: 1 },
  { opacity: 0.32, blur: 1.9 },
  { opacity: 0.22, blur: 2.8 } // 距离 >= 3 的行
];

const getFocusStyle = (index: number) => {
  if (!config.value.focusCurrentLyric) return {};

  const colors = textColors.value || getTextColors();
  const distance = Math.abs(index - nowIndex.value);
  const level = FOCUS_LINE_LEVELS[Math.min(distance, FOCUS_LINE_LEVELS.length - 1)];

  return {
    opacity: level.opacity,
    // 当前行不模糊、带柔和光晕；其余行按距离模糊
    filter: distance === 0 ? `drop-shadow(0 0 12px ${colors.active}4d)` : `blur(${level.blur}px)`,
    transform: `scale(${distance === 0 ? 1.06 : 1})`,
    // 平滑缓动过渡，仅过渡聚焦相关属性，避免干扰 hover 背景色的原有节奏
    transition:
      'opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1), filter 0.55s cubic-bezier(0.4, 0, 0.2, 1), transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease'
  };
};

// 逐字歌词样式函数
const getWordStyle = (lineIndex: number, _wordIndex: number, word: any) => {
  const colors = textColors.value || getTextColors();
  // 如果不是当前行，返回普通样式
  if (lineIndex !== nowIndex.value) {
    return {
      color: colors.primary,
      transition: 'color 0.3s ease',
      // 重置背景相关属性
      backgroundImage: 'none',
      WebkitTextFillColor: 'initial'
    };
  }

  // 当前行的逐字效果，应用歌词矫正时间
  const currentTime = (nowTime.value + correctionTime.value) * 1000; // 转换为毫秒，确保与word时间单位一致

  // 直接使用绝对时间比较
  const wordStartTime = word.startTime; // 单词开始的绝对时间（毫秒）
  const wordEndTime = word.startTime + word.duration;

  if (currentTime >= wordStartTime && currentTime < wordEndTime) {
    // 当前正在播放的单词 - 使用渐变进度效果
    const progress = Math.min((currentTime - wordStartTime) / word.duration, 1);
    const progressPercent = Math.round(progress * 100);

    return {
      backgroundImage: `linear-gradient(to right, ${colors.active} 0%, ${colors.active} ${progressPercent}%, ${colors.primary} ${progressPercent}%, ${colors.primary} 100%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textShadow: `0 0 8px ${colors.active}40`,
      transition: 'all 0.1s ease'
    };
  } else if (currentTime >= wordEndTime) {
    // 已经播放过的单词 - 纯色显示
    return {
      color: colors.active,
      WebkitTextFillColor: 'initial',
      transition: 'none'
    };
  } else {
    // 还未播放的单词 - 普通状态
    return {
      color: colors.primary,
      WebkitTextFillColor: 'initial',
      transition: 'none'
    };
  }
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
  if (!lrcSider.value || !config.value.hideCover) return;
  const { scrollTop } = lrcSider.value.$el;
  showStickyHeader.value = scrollTop > 100;
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
  if (lrcSider.value?.$el) {
    lrcSider.value.$el.addEventListener('scroll', handleScroll);
  }
  document.addEventListener('fullscreenchange', handleFullScreenChange);
  window.addEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
});

// 移除滚动监听和全屏状态监听
onBeforeUnmount(() => {
  if (lrcSider.value?.$el) {
    lrcSider.value.$el.removeEventListener('scroll', handleScroll);
  }
  document.removeEventListener('fullscreenchange', handleFullScreenChange);
  window.removeEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
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

// 加载保存的配置
onMounted(() => {
  const savedConfig = localStorage.getItem('music-full-config');
  if (savedConfig) {
    config.value = readLyricConfig();
  }
  if (lrcSider.value?.$el) {
    lrcSider.value.$el.addEventListener('scroll', handleScroll);
  }
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
    gap: 4rem;
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
    @apply flex flex-col justify-center h-full relative overflow-hidden;

    &.full-width {
      @apply col-span-2;
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
        black 15%,
        black 85%,
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 15%,
        black 85%,
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
      padding: 50vh 0;
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
      // 当前行会被 scale 放大（常规 1.05 / 聚焦 1.06），预留宽度避免长歌词右端被容器裁切；
      // transform 不影响布局换行，各行换行宽度保持一致，行切换时不会重新折行
      max-width: 94.3%;

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

      // 逐字歌词样式
      .word-by-word-lyric {
        @apply flex flex-wrap;

        .lyric-word {
          @apply inline-block;
          padding-right: 0;
          font-weight: inherit;
          font-size: inherit;
          letter-spacing: inherit;
          line-height: inherit;
          cursor: inherit;
          position: relative;

          &:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }

    .hover-text {
      &:hover {
        @apply font-bold rounded-xl;
        // 聚焦模式下模糊/变淡是内联样式，优先级高于类，需 !important 取消，便于阅读与点击定位
        opacity: 1 !important;
        filter: none !important;
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
  &.pure-mode {
    @apply pointer-events-auto;

    .control-btn {
      @apply opacity-0 transition-all duration-300;
      pointer-events: none;
    }

    &:hover .control-btn {
      @apply opacity-100;
      pointer-events: auto;
    }
  }

  &:not(.pure-mode) .control-btn {
    pointer-events: auto;
  }
}

.control-right {
  @apply flex items-center gap-2;
}

// 纯净模式首次开启引导层：虚线高亮控件原位置 + 箭头气泡指向对应角落，不拦截任何点击
.pure-mode-tip-layer {
  @apply absolute inset-0 z-[9999] pointer-events-none;
}

.pure-mode-tip-highlight {
  @apply absolute top-8 right-8 w-20 h-9 rounded-lg;
  border: 1.5px dashed rgba(255, 255, 255, 0.75);
  animation: pure-tip-pulse 1.8s ease-out infinite;

  // 第二步：左上角收起按钮（单个 36px 按钮位）
  &--left {
    @apply right-auto left-8 w-9;
  }
}

.pure-mode-tip-bubble {
  @apply absolute top-[4.75rem] right-8 flex w-fit max-w-[320px] flex-col gap-2 rounded-xl px-4 py-3 text-sm pointer-events-auto;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);

  // 第二步：气泡移到左上角下方
  &--left {
    @apply right-auto left-8;
  }
}

.pure-mode-tip-content {
  @apply flex items-start gap-2;

  i {
    @apply mt-0.5 shrink-0 text-base;
    color: #10b981;
  }
}

.pure-mode-tip-actions {
  @apply flex items-center justify-end gap-2;
}

.pure-mode-tip-btn {
  @apply cursor-pointer rounded-lg border px-3 py-1 text-xs transition-colors;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.75);

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.9);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-40;
  }

  &--primary {
    background: #10b981;
    border-color: #10b981;
    color: #fff;

    &:hover:not(:disabled) {
      background: #059669;
      border-color: #059669;
      color: #fff;
    }
  }
}

// 步骤指示圆点（当前步高亮）
.pure-mode-tip-dots {
  @apply ml-0.5 flex items-center gap-1 self-center;

  span {
    @apply h-1.5 w-1.5 rounded-full bg-white/25 transition-colors;
  }

  span.is-active {
    @apply bg-emerald-400;
  }
}

@keyframes pure-tip-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }

  70%,
  100% {
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
}

.control-btn {
  @apply w-9 h-9 flex items-center justify-center rounded cursor-pointer transition-all duration-300;
  background: rgba(142, 142, 142, 0.192);
  backdrop-filter: blur(12px);

  i {
    @apply text-xl;
    color: var(--text-color-active);
  }

  &:hover {
    background: rgba(126, 121, 121, 0.2);

    i {
      opacity: 1;
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
