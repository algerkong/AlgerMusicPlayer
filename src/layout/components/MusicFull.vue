<template>
  <n-drawer
    :show="musicFull"
    height="100%"
    placement="bottom"
    :style="{ background: currentBackground || background }"
    :to="`#layout-main`"
  >
    <div id="drawer-target">
      <div class="drawer-back"></div>
      <div class="music-img" :style="{ color: textColors.theme === 'dark' ? '#000000' : '#ffffff' }">
        <n-image ref="PicImgRef" :src="getImgUrl(playMusic?.picUrl, '500y500')" class="img" lazy preview-disabled />
        <div>
          <div class="music-content-name">{{ playMusic.name }}</div>
          <div class="music-content-singer">
            <span v-for="(item, index) in playMusic.ar || playMusic.song.artists" :key="index">
              {{ item.name }}{{ index < (playMusic.ar || playMusic.song.artists).length - 1 ? ' / ' : '' }}
            </span>
          </div>
        </div>
      </div>
      <div class="music-content">
        <n-layout
          ref="lrcSider"
          class="music-lrc"
          style="height: 60vh"
          :native-scrollbar="false"
          @mouseover="mouseOverLayout"
          @mouseleave="mouseLeaveLayout"
        >
          <div ref="lrcContainer">
            <div
              v-for="(item, index) in lrcArray"
              :id="`music-lrc-text-${index}`"
              :key="index"
              class="music-lrc-text"
              :class="{ 'now-text': index === nowIndex, 'hover-text': item.text }"
              @click="setAudioTime(index)"
            >
              <span :style="getLrcStyle(index)">{{ item.text }}</span>
              <div class="music-lrc-text-tr">{{ item.trText }}</div>
            </div>

            <!-- 无歌词 -->
            <div v-if="!lrcArray.length" class="music-lrc-text mt-40">
              <span>暂无歌词, 请欣赏</span>
            </div>
          </div>
        </n-layout>
        <!-- 时间矫正 -->
        <!-- <div class="music-content-time">
          <n-button @click="reduceCorrectionTime(0.2)">-</n-button>
          <n-button @click="addCorrectionTime(0.2)">+</n-button>
        </div> -->
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { onBeforeUnmount, ref, watch } from 'vue';

import { lrcArray, nowIndex, playMusic, setAudioTime, textColors, useLyricProgress } from '@/hooks/MusicHook';
import { getImgUrl } from '@/utils';
import { animateGradient, getHoverBackgroundColor, getTextColors } from '@/utils/linearColor';

// 定义 refs
const lrcSider = ref<any>(null);
const isMouse = ref(false);
const lrcContainer = ref<HTMLElement | null>(null);
const currentBackground = ref('');
const animationFrame = ref<number | null>(null);
const isDark = ref(false);

const props = defineProps({
  musicFull: {
    type: Boolean,
    default: false,
  },
  background: {
    type: String,
    default: '',
  },
});

// 歌词滚动方法
const lrcScroll = (behavior = 'smooth') => {
  const nowEl = document.querySelector(`#music-lrc-text-${nowIndex.value}`);
  if (props.musicFull && !isMouse.value && nowEl && lrcContainer.value) {
    const containerRect = lrcContainer.value.getBoundingClientRect();
    const nowElRect = nowEl.getBoundingClientRect();
    const relativeTop = nowElRect.top - containerRect.top;
    const scrollTop = relativeTop - lrcSider.value.$el.getBoundingClientRect().height / 2;
    lrcSider.value.scrollTo({ top: scrollTop, behavior });
  }
};

const debouncedLrcScroll = useDebounceFn(lrcScroll, 200);

const mouseOverLayout = () => {
  isMouse.value = true;
};
const mouseLeaveLayout = () => {
  setTimeout(() => {
    isMouse.value = false;
    lrcScroll();
  }, 2000);
};

watch(nowIndex, () => {
  debouncedLrcScroll();
});

watch(
  () => props.musicFull,
  () => {
    if (props.musicFull) {
      nextTick(() => {
        lrcScroll('instant');
      });
    }
  },
);

// 监听背景变化
watch(
  () => props.background,
  (newBg) => {
    if (!newBg) {
      textColors.value = getTextColors();
      document.documentElement.style.setProperty('--hover-bg-color', getHoverBackgroundColor(false));
      document.documentElement.style.setProperty('--text-color-primary', textColors.value.primary);
      document.documentElement.style.setProperty('--text-color-active', textColors.value.active);
      return;
    }

    if (currentBackground.value) {
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value);
      }
      animationFrame.value = animateGradient(currentBackground.value, newBg, (gradient) => {
        currentBackground.value = gradient;
      });
    } else {
      currentBackground.value = newBg;
    }

    textColors.value = getTextColors(newBg);
    isDark.value = textColors.value.active === '#000000';

    document.documentElement.style.setProperty('--hover-bg-color', getHoverBackgroundColor(isDark.value));
    document.documentElement.style.setProperty('--text-color-primary', textColors.value.primary);
    document.documentElement.style.setProperty('--text-color-active', textColors.value.active);
  },
  { immediate: true },
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
      color: 'transparent',
    };
  }

  // 非当前播放的歌词，使用普通颜色
  return {
    color: colors.primary,
  };
};

// 组件卸载时清理动画
onBeforeUnmount(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
});

defineExpose({
  lrcScroll,
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
  @apply top-0 left-0 absolute overflow-hidden rounded px-24 flex items-center justify-center w-full h-full pb-8;
  animation-duration: 300ms;

  .music-img {
    @apply flex-1 flex justify-center mr-16 flex-col;
    max-width: 360px;
    max-height: 360px;
    .img {
      @apply rounded-xl w-full h-full  shadow-2xl;
    }
  }

  .music-content {
    @apply flex flex-col justify-center items-center relative;

    &-name {
      @apply font-bold text-xl pb-1 pt-4;
    }

    &-singer {
      @apply text-base;
    }
  }

  .music-content-time {
    display: none;
    @apply flex justify-center items-center;
  }
  .music-lrc {
    background-color: inherit;
    width: 500px;
    height: 550px;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
    &-text {
      @apply text-2xl cursor-pointer font-bold px-2 py-4;
      transition: all 0.3s ease;
      background-color: transparent;

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
    }
    .music-lrc-text {
      @apply text-xl text-center;
    }
  }
}

.music-drawer {
  transition: none; // 移除之前的过渡效果，现在使用 JS 动画
}
</style>
