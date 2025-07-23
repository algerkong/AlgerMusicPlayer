import { useDebounceFn } from '@vueuse/core';
import tinycolor from 'tinycolor2';

interface IColor {
  backgroundColor: string;
  primaryColor: string;
}

interface ITextColors {
  primary: string;
  active: string;
  theme: string;
}

export interface LyricThemeColor {
  id: string;
  name: string;
  light: string;
  dark: string;
}

interface LyricSettings {
  isTop: boolean;
  theme: 'light' | 'dark';
  isLock: boolean;
  highlightColor?: string;
}

export const getImageLinearBackground = async (imageSrc: string): Promise<IColor> => {
  try {
    const primaryColor = await getImagePrimaryColor(imageSrc);
    return {
      backgroundColor: generateGradientBackground(primaryColor),
      primaryColor
    };
  } catch (error) {
    console.error('error', error);
    return {
      backgroundColor: '',
      primaryColor: ''
    };
  }
};

export const getImageBackground = async (img: HTMLImageElement): Promise<IColor> => {
  try {
    const primaryColor = await getImageColor(img);
    return {
      backgroundColor: generateGradientBackground(primaryColor),
      primaryColor
    };
  } catch (error) {
    console.error('error', error);
    return {
      backgroundColor: '',
      primaryColor: ''
    };
  }
};

const getImageColor = (img: HTMLImageElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('无法获取canvas上下文'));
      return;
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const color = getAverageColor(imageData.data);
    resolve(`rgb(${color.join(',')})`);
  });
};

const getImagePrimaryColor = (imageSrc: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取canvas上下文'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const color = getAverageColor(imageData.data);
      resolve(`rgb(${color.join(',')})`);
    };

    img.onerror = () => reject(new Error('图片加载失败'));
  });
};

const getAverageColor = (data: Uint8ClampedArray): number[] => {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
};

const generateGradientBackground = (color: string): string => {
  const tc = tinycolor(color);
  const hsl = tc.toHsl();

  // 增加亮度和暗度的差异
  const lightColor = tinycolor({ h: hsl.h, s: hsl.s * 0.8, l: Math.min(hsl.l + 0.2, 0.95) });
  const midColor = tinycolor({ h: hsl.h, s: hsl.s, l: hsl.l });
  const darkColor = tinycolor({
    h: hsl.h,
    s: Math.min(hsl.s * 1.2, 1),
    l: Math.max(hsl.l - 0.3, 0.05)
  });

  return `linear-gradient(to bottom, ${lightColor.toRgbString()} 0%, ${midColor.toRgbString()} 50%, ${darkColor.toRgbString()} 100%)`;
};

export const parseGradient = (gradientStr: string) => {
  if (!gradientStr) return [];

  // 处理非渐变色
  if (!gradientStr.startsWith('linear-gradient')) {
    const color = tinycolor(gradientStr);
    if (color.isValid()) {
      const rgb = color.toRgb();
      return [{ r: rgb.r, g: rgb.g, b: rgb.b }];
    }
    return [];
  }

  // 处理渐变色，支持 rgb、rgba 和十六进制颜色
  const colorMatches = gradientStr.match(/(?:(?:rgb|rgba)\([^)]+\)|#[0-9a-fA-F]{3,8})/g) || [];
  return colorMatches.map((color) => {
    const tc = tinycolor(color);
    const rgb = tc.toRgb();
    return { r: rgb.r, g: rgb.g, b: rgb.b };
  });
};

export const getTextColors = (gradient: string = ''): ITextColors => {
  const defaultColors = {
    primary: 'rgba(255, 255, 255, 0.54)',
    active: '#ffffff',
    theme: 'light'
  };

  if (!gradient) return defaultColors;

  const colors = parseGradient(gradient);
  if (!colors.length) return defaultColors;

  const mainColor = colors.length === 1 ? colors[0] : colors[1] || colors[0];
  const tc = tinycolor(mainColor);
  const isDark = tc.getBrightness() > 155; // tinycolor 的亮度范围是 0-255

  return {
    primary: isDark ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.54)',
    active: isDark ? '#000000' : '#ffffff',
    theme: isDark ? 'dark' : 'light'
  };
};

export const getHoverBackgroundColor = (isDark: boolean): string => {
  return isDark ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
};

export const animateGradient = (() => {
  let currentAnimation: number | null = null;
  let isAnimating = false;
  let lastProgress = 0;

  const validateColors = (colors: ReturnType<typeof parseGradient>) => {
    return colors.every(
      (color) =>
        typeof color.r === 'number' &&
        typeof color.g === 'number' &&
        typeof color.b === 'number' &&
        !Number.isNaN(color.r) &&
        !Number.isNaN(color.g) &&
        !Number.isNaN(color.b)
    );
  };

  const easeInOutCubic = (x: number): number => {
    return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  };

  const animate = (
    oldGradient: string,
    newGradient: string,
    onUpdate: (gradient: string) => void,
    duration = 300
  ) => {
    // 如果新旧渐变色相同，不执行动画
    if (oldGradient === newGradient) {
      return null;
    }

    // 如果正在动画中，取消当前动画
    if (currentAnimation !== null) {
      cancelAnimationFrame(currentAnimation);
      currentAnimation = null;
    }

    // 解析颜色
    const startColors = parseGradient(oldGradient);
    const endColors = parseGradient(newGradient);

    // 验证颜色数组
    if (
      !startColors.length ||
      !endColors.length ||
      !validateColors(startColors) ||
      !validateColors(endColors)
    ) {
      console.warn('Invalid color values detected');
      onUpdate(newGradient); // 直接更新到目标颜色
      return null;
    }

    // 如果颜色数量不匹配，直接更新到目标颜色
    if (startColors.length !== endColors.length) {
      onUpdate(newGradient);
      return null;
    }

    isAnimating = true;
    const startTime = performance.now();

    const animateFrame = (currentTime: number) => {
      if (!isAnimating) return null;

      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      // 使用缓动函数使动画更平滑
      const progress = easeInOutCubic(rawProgress);

      try {
        // 使用上一帧的进度来平滑过渡
        const effectiveProgress = lastProgress + (progress - lastProgress) * 0.6;
        lastProgress = effectiveProgress;

        const currentColors = startColors.map((startColor, i) => {
          const start = tinycolor(startColor);
          const end = tinycolor(endColors[i]);
          return tinycolor.mix(start, end, effectiveProgress * 100);
        });

        const gradientString = createGradientString(
          currentColors.map((c) => {
            const rgb = c.toRgb();
            return { r: rgb.r, g: rgb.g, b: rgb.b };
          })
        );

        onUpdate(gradientString);

        if (rawProgress < 1) {
          currentAnimation = requestAnimationFrame(animateFrame);
          return currentAnimation;
        }
        // 确保最终颜色正确
        onUpdate(newGradient);
        isAnimating = false;
        currentAnimation = null;
        lastProgress = 0;
        return null;
      } catch (error) {
        console.error('Animation error:', error);
        onUpdate(newGradient);
        isAnimating = false;
        currentAnimation = null;
        lastProgress = 0;
        return null;
      }
    };

    currentAnimation = requestAnimationFrame(animateFrame);
    return currentAnimation;
  };

  // 使用更短的防抖时间
  return useDebounceFn(animate, 50);
})();

export const createGradientString = (
  colors: { r: number; g: number; b: number }[],
  percentages = [0, 50, 100]
) => {
  return `linear-gradient(to bottom, ${colors
    .map((color, i) => `rgb(${color.r}, ${color.g}, ${color.b}) ${percentages[i]}%`)
    .join(', ')})`;
};

// ===== 歌词主题色相关工具函数 =====

/**
 * 预设歌词主题色配置
 * 注意：name 字段将通过国际化系统动态获取，这里的值仅作为后备
 */
const PRESET_LYRIC_COLORS: LyricThemeColor[] = [
  {
    id: 'spotify-green',
    name: 'Spotify Green', // 后备名称，实际使用时会被国际化替换
    light: '#1db954',
    dark: '#1ed760'
  },
  {
    id: 'apple-blue',
    name: 'Apple Blue',
    light: '#007aff',
    dark: '#0a84ff'
  },
  {
    id: 'youtube-red',
    name: 'YouTube Red',
    light: '#ff0000',
    dark: '#ff4444'
  },
  {
    id: 'orange',
    name: 'Vibrant Orange',
    light: '#ff6b35',
    dark: '#ff8c42'
  },
  {
    id: 'purple',
    name: 'Mystic Purple',
    light: '#8b5cf6',
    dark: '#a78bfa'
  },
  {
    id: 'pink',
    name: 'Cherry Pink',
    light: '#ec4899',
    dark: '#f472b6'
  }
];

/**
 * 验证颜色是否有效
 */
export const validateColor = (color: string): boolean => {
  if (!color || typeof color !== 'string') return false;
  const tc = tinycolor(color);
  return tc.isValid() && tc.getAlpha() > 0;
};

/**
 * 检查颜色对比度是否符合可读性标准
 */
export const validateColorContrast = (color: string, theme: 'light' | 'dark'): boolean => {
  if (!validateColor(color)) return false;

  const backgroundColor = theme === 'dark' ? '#000000' : '#ffffff';
  const contrast = tinycolor.readability(color, backgroundColor);
  return contrast >= 4.5; // WCAG AA 标准
};

/**
 * 为特定主题优化颜色
 */
export const optimizeColorForTheme = (color: string, theme: 'light' | 'dark'): string => {
  if (!validateColor(color)) {
    return getDefaultHighlightColor(theme);
  }

  const tc = tinycolor(color);
  const hsl = tc.toHsl();

  if (theme === 'dark') {
    // 暗色主题：增加亮度和饱和度
    const optimized = tinycolor({
      h: hsl.h,
      s: Math.min(hsl.s * 1.1, 1),
      l: Math.max(hsl.l, 0.4) // 确保最小亮度
    });

    // 检查对比度，如果不够则进一步调整
    if (!validateColorContrast(optimized.toHexString(), theme)) {
      return tinycolor({
        h: hsl.h,
        s: Math.min(hsl.s * 1.2, 1),
        l: Math.max(hsl.l * 1.3, 0.5)
      }).toHexString();
    }

    return optimized.toHexString();
  } else {
    // 亮色主题：适当降低亮度
    const optimized = tinycolor({
      h: hsl.h,
      s: Math.min(hsl.s * 1.05, 1),
      l: Math.min(hsl.l, 0.6) // 确保最大亮度
    });

    // 检查对比度
    if (!validateColorContrast(optimized.toHexString(), theme)) {
      return tinycolor({
        h: hsl.h,
        s: Math.min(hsl.s * 1.1, 1),
        l: Math.min(hsl.l * 0.8, 0.5)
      }).toHexString();
    }

    return optimized.toHexString();
  }
};

/**
 * 获取默认高亮颜色
 */
export const getDefaultHighlightColor = (theme?: 'light' | 'dark'): string => {
  const defaultColor = PRESET_LYRIC_COLORS[0]; // Spotify 绿
  if (!theme) return defaultColor.light;
  return theme === 'dark' ? defaultColor.dark : defaultColor.light;
};

/**
 * 获取预设主题色列表
 */
export const getLyricThemeColors = (): LyricThemeColor[] => {
  return [...PRESET_LYRIC_COLORS];
};

/**
 * 根据主题获取预设颜色的实际值
 */
export const getPresetColorValue = (colorId: string, theme: 'light' | 'dark'): string => {
  const color = PRESET_LYRIC_COLORS.find((c) => c.id === colorId);
  if (!color) return getDefaultHighlightColor(theme);
  return theme === 'dark' ? color.dark : color.light;
};

/**
 * 安全加载歌词设置
 */
const safeLoadLyricSettings = (): LyricSettings => {
  try {
    const stored = localStorage.getItem('lyricData');
    if (stored) {
      const parsed = JSON.parse(stored) as LyricSettings;

      // 验证 highlightColor 字段
      if (parsed.highlightColor && !validateColor(parsed.highlightColor)) {
        console.warn('Invalid stored highlight color, removing it');
        delete parsed.highlightColor;
      }

      return parsed;
    }
  } catch (error) {
    console.error('Failed to load lyric settings:', error);
  }

  // 返回默认设置
  return {
    isTop: false,
    theme: 'dark',
    isLock: false
  };
};

/**
 * 安全保存歌词设置
 */
const safeSaveLyricSettings = (settings: LyricSettings): void => {
  try {
    localStorage.setItem('lyricData', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save lyric settings:', error);
  }
};

/**
 * 保存歌词主题色
 */
export const saveLyricThemeColor = (color: string): void => {
  if (!validateColor(color)) {
    console.warn('Attempted to save invalid color:', color);
    return;
  }

  const settings = safeLoadLyricSettings();
  settings.highlightColor = color;
  safeSaveLyricSettings(settings);
};

/**
 * 加载歌词主题色
 */
export const loadLyricThemeColor = (): string => {
  const settings = safeLoadLyricSettings();

  if (settings.highlightColor && validateColor(settings.highlightColor)) {
    return settings.highlightColor;
  }

  // 如果没有保存的颜色或颜色无效，返回默认颜色
  return getDefaultHighlightColor(settings.theme);
};

/**
 * 重置歌词主题色到默认值
 */
export const resetLyricThemeColor = (): void => {
  const settings = safeLoadLyricSettings();
  delete settings.highlightColor;
  safeSaveLyricSettings(settings);
};

/**
 * 获取当前有效的歌词主题色
 */
export const getCurrentLyricThemeColor = (theme: 'light' | 'dark'): string => {
  const savedColor = loadLyricThemeColor();

  if (savedColor && validateColor(savedColor)) {
    return optimizeColorForTheme(savedColor, theme);
  }

  return getDefaultHighlightColor(theme);
};
