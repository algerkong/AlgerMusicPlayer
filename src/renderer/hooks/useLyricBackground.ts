import { onBeforeUnmount, ref } from 'vue';

import { textColors } from '@/hooks/MusicHook';
import { animateGradient, getHoverBackgroundColor, getTextColors } from '@/utils/linearColor';

type UseLyricBackgroundOptions = {
  /**
   * 可选：返回需要写入 --bg-color CSS 变量的颜色字符串。
   * - 不提供：完全不写 --bg-color（桌面全屏场景）
   * - 提供：有背景分支调用以取值，undefined 时落回 DEFAULT_BG_COLOR；
   *   空背景分支固定写入 DEFAULT_BG_COLOR（与移动端原有行为一致）
   */
  writeBgColor?: () => string | undefined;
};

const DEFAULT_BG_COLOR = 'rgba(25, 25, 25, 1)';

export function useLyricBackground(options: UseLyricBackgroundOptions = {}) {
  const currentBackground = ref('');
  const animationFrame = ref<number | null>(null);
  const isDark = ref(false);

  const { writeBgColor } = options;
  const root = document.documentElement;

  const applyBackground = (background: string) => {
    if (!background) {
      textColors.value = getTextColors();
      root.style.setProperty('--hover-bg-color', getHoverBackgroundColor(false));
      root.style.setProperty('--text-color-primary', textColors.value.primary);
      root.style.setProperty('--text-color-active', textColors.value.active);
      if (writeBgColor) {
        root.style.setProperty('--bg-color', DEFAULT_BG_COLOR);
      }
      return;
    }

    textColors.value = getTextColors(background);
    isDark.value = textColors.value.active === '#000000';

    root.style.setProperty('--hover-bg-color', getHoverBackgroundColor(isDark.value));
    root.style.setProperty('--text-color-primary', textColors.value.primary);
    root.style.setProperty('--text-color-active', textColors.value.active);

    if (writeBgColor) {
      const bg = writeBgColor();
      root.style.setProperty('--bg-color', bg || DEFAULT_BG_COLOR);
    }

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

  onBeforeUnmount(() => {
    if (animationFrame.value) {
      cancelAnimationFrame(animationFrame.value);
    }
  });

  return {
    isDark,
    currentBackground,
    applyBackground
  };
}
