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

/** 取色采样分辨率（降采样，非全图像素平均） */
const SAMPLE_SIZE = 64;

type Rgb = { r: number; g: number; b: number };

/**
 * 由主色 RGB 生成封面色盘：
 * - primaryColor：进度条/壳层强调色（暗色 UI 可读）
 * - backgroundColor：偏暗纵向铺色，保证浅色文字清晰
 */
export const buildIosPaletteFromRgb = (rgb: Rgb): IColor => {
  const base = tinycolor({ r: rgb.r, g: rgb.g, b: rgb.b });
  const hsl = base.toHsl();

  // 近灰色封面：用冷蓝灰铺色，避免脏中灰
  const isNearGray = hsl.s < 0.12;
  const h = isNearGray ? 220 : hsl.h;
  const s = isNearGray ? 0.18 : Math.min(Math.max(hsl.s * 1.05, 0.35), 0.78);

  const accent = tinycolor({
    h,
    s: Math.min(s * 1.08, 0.82),
    l: Math.min(Math.max(isNearGray ? 0.55 : hsl.l, 0.42), 0.62)
  });

  // 铺色：上方有色，底部近黑
  const top = tinycolor({ h, s: s * 0.75, l: 0.28 });
  const mid = tinycolor({ h, s: s * 0.7, l: 0.14 });
  const bottom = tinycolor({ h, s: s * 0.55, l: 0.05 });

  return {
    primaryColor: accent.toRgbString(),
    backgroundColor: `linear-gradient(to bottom, ${top.toRgbString()} 0%, ${mid.toRgbString()} 48%, ${bottom.toRgbString()} 100%)`
  };
};

/**
 * 按「鲜艳度」给像素打分（偏好饱和中调；跳过近黑/近白/纯灰）
 * 返回主色 RGB，否则中性回退色
 */
export const extractVibrantRgbFromImageData = (data: Uint8ClampedArray): Rgb => {
  // 32 个色相桶 × 量化饱和度/明度，稳定聚类
  const buckets = new Map<string, { r: number; g: number; b: number; weight: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 200) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 跳过近黑/近白（字幕、描边、黑边）
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 28 || min > 245) continue;

    const tc = tinycolor({ r, g, b });
    const { h, s, l } = tc.toHsl();
    // 跳过脏灰
    if (s < 0.08 && l > 0.15 && l < 0.9) continue;
    // 偏好中等亮度（主体，非高光）
    if (l < 0.08 || l > 0.92) continue;

    const hBucket = Math.round(h / 12) * 12; // 30 buckets over 360
    const sBucket = Math.round(s * 5) / 5;
    const lBucket = Math.round(l * 5) / 5;
    const key = `${hBucket}|${sBucket}|${lBucket}`;

    // 权重：饱和度 × 明度居中程度 × 计数微加成
    const midBoost = 1 - Math.abs(l - 0.45) * 1.4;
    const weight = Math.max(0.05, s * 1.6 + 0.15) * Math.max(0.2, midBoost);

    const prev = buckets.get(key);
    if (prev) {
      prev.r += r * weight;
      prev.g += g * weight;
      prev.b += b * weight;
      prev.weight += weight;
    } else {
      buckets.set(key, { r: r * weight, g: g * weight, b: b * weight, weight });
    }
  }

  if (buckets.size === 0) {
    return { r: 48, g: 52, b: 72 }; // soft slate fallback
  }

  let best: { r: number; g: number; b: number; weight: number } | null = null;
  for (const entry of buckets.values()) {
    if (!best || entry.weight > best.weight) best = entry;
  }

  if (!best || best.weight <= 0) {
    return { r: 48, g: 52, b: 72 };
  }

  return {
    r: Math.round(best.r / best.weight),
    g: Math.round(best.g / best.weight),
    b: Math.round(best.b / best.weight)
  };
};

const sampleImageToImageData = (
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
): ImageData => {
  const canvas = document.createElement('canvas');
  const size = SAMPLE_SIZE;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('无法获取canvas上下文');
  }
  // cover 方式裁入采样方块
  const scale = Math.max(size / Math.max(sourceWidth, 1), size / Math.max(sourceHeight, 1));
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  ctx.drawImage(source, dx, dy, dw, dh);
  return ctx.getImageData(0, 0, size, size);
};

const paletteFromImageElement = (img: HTMLImageElement): IColor => {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) {
    return buildIosPaletteFromRgb({ r: 48, g: 52, b: 72 });
  }
  const imageData = sampleImageToImageData(img, w, h);
  const rgb = extractVibrantRgbFromImageData(imageData.data);
  return buildIosPaletteFromRgb(rgb);
};

export const getImageLinearBackground = async (imageSrc: string): Promise<IColor> => {
  try {
    const img = await loadImage(imageSrc);
    return paletteFromImageElement(img);
  } catch (error) {
    console.error('[cover-color] getImageLinearBackground failed', error);
    return { backgroundColor: '', primaryColor: '' };
  }
};

export const getImageBackground = async (img: HTMLImageElement): Promise<IColor> => {
  try {
    // 尽量等图片 decode 完成
    if (typeof img.decode === 'function' && !img.complete) {
      try {
        await img.decode();
      } catch {
        /* 用当前已绘制内容 */
      }
    }
    return paletteFromImageElement(img);
  } catch (error) {
    console.error('[cover-color] getImageBackground failed', error);
    return { backgroundColor: '', primaryColor: '' };
  }
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });

/** 从色盘背景取纯色环境色（CSS 变量不能用渐变时） */
export const getAmbientSolidFromBackground = (background: string): string => {
  if (!background) return 'rgb(25, 25, 28)';
  if (!background.startsWith('linear-gradient')) {
    const tc = tinycolor(background);
    if (tc.isValid()) return tc.toRgbString();
    return 'rgb(25, 25, 28)';
  }
  const colors = parseGradient(background);
  if (!colors.length) return 'rgb(25, 25, 28)';
  // 优先中间色标（可读铺色），否则取最深
  const c = colors[1] || colors[colors.length - 1] || colors[0];
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
};

export const parseGradient = (gradientStr: string) => {
  if (!gradientStr) return [];

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
  // theme: light=浅色字（深色铺色）；dark=深色字（旧浅色背景）
  const lightOnDark: ITextColors = {
    primary: 'rgba(255, 255, 255, 0.62)',
    active: '#ffffff',
    theme: 'light'
  };

  const darkOnLight: ITextColors = {
    primary: 'rgba(0, 0, 0, 0.54)',
    active: '#000000',
    theme: 'dark'
  };

  if (!gradient) return lightOnDark;

  const colors = parseGradient(gradient);
  if (!colors.length) return lightOnDark;

  // 最亮渐变色标决定文字明暗
  let maxBrightness = 0;
  for (const c of colors) {
    maxBrightness = Math.max(maxBrightness, tinycolor(c).getBrightness());
  }

  // 封面铺色偏暗（~L0.28）；仅极亮背景用深色字
  if (maxBrightness > 175) return darkOnLight;
  return lightOnDark;
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
    // 渐变色未变则跳过动画
    if (oldGradient === newGradient) {
      return null;
    }

    // 取消进行中的渐变动画
    if (currentAnimation !== null) {
      cancelAnimationFrame(currentAnimation);
      currentAnimation = null;
    }

    // 解析渐变/颜色数组
    const startColors = parseGradient(oldGradient);
    const endColors = parseGradient(newGradient);

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

    // 色标数量不一致时直接落到目标色
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
      // 缓动插值，动画更顺
      const progress = easeInOutCubic(rawProgress);

      try {
        // 用上一帧进度做平滑过渡
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
        // 收尾对齐最终颜色
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

  // 缩短防抖间隔
  return useDebounceFn(animate, 50);
})();

export const createGradientString = (
  colors: { r: number; g: number; b: number }[],
  percentages = [0, 50, 100]
) => {
  const count = colors.length;
  return `linear-gradient(to bottom, ${colors
    .map((color, i) => {
      // 色标数与 percentages 不一致时按索引均分，避免 undefined%
      const percent = percentages[i] ?? (count > 1 ? Math.round((i / (count - 1)) * 100) : 0);
      return `rgb(${color.r}, ${color.g}, ${color.b}) ${percent}%`;
    })
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

export const getDefaultHighlightColor = (theme?: 'light' | 'dark'): string => {
  const defaultColor = PRESET_LYRIC_COLORS[0]; // Spotify 绿
  if (!theme) return defaultColor.light;
  return theme === 'dark' ? defaultColor.dark : defaultColor.light;
};

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

      if (parsed.highlightColor && !validateColor(parsed.highlightColor)) {
        console.warn('Invalid stored highlight color, removing it');
        delete parsed.highlightColor;
      }

      return parsed;
    }
  } catch (error) {
    console.error('Failed to load lyric settings:', error);
  }

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

export const saveLyricThemeColor = (color: string): void => {
  if (!validateColor(color)) {
    console.warn('Attempted to save invalid color:', color);
    return;
  }

  const settings = safeLoadLyricSettings();
  settings.highlightColor = color;
  safeSaveLyricSettings(settings);
};

export const loadLyricThemeColor = (): string => {
  const settings = safeLoadLyricSettings();

  if (settings.highlightColor && validateColor(settings.highlightColor)) {
    return settings.highlightColor;
  }

  // 无有效已存颜色则用默认
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

export const getCurrentLyricThemeColor = (theme: 'light' | 'dark'): string => {
  const savedColor = loadLyricThemeColor();

  if (savedColor && validateColor(savedColor)) {
    return optimizeColorForTheme(savedColor, theme);
  }

  return getDefaultHighlightColor(theme);
};
