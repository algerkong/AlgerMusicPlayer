interface IColor {
  backgroundColor: string;
  primaryColor: string;
}

export const getImageLinearBackground = async (imageSrc: string): Promise<IColor> => {
  try {
    const primaryColor = await getImagePrimaryColor(imageSrc);
    return {
      backgroundColor: generateGradientBackground(primaryColor),
      primaryColor,
    };
  } catch (error) {
    console.error('error', error);
    return {
      backgroundColor: '',
      primaryColor: '',
    };
  }
};

export const getImageBackground = async (img: HTMLImageElement): Promise<IColor> => {
  try {
    const primaryColor = await getImageColor(img);
    return {
      backgroundColor: generateGradientBackground(primaryColor),
      primaryColor,
    };
  } catch (error) {
    console.error('error', error);
    return {
      backgroundColor: '',
      primaryColor: '',
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
  const [r, g, b] = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
  const [h, s, l] = rgbToHsl(r, g, b);

  // 增加亮度和暗度的差异
  const lightL = Math.min(l + 0.2, 0.95);
  const darkL = Math.max(l - 0.3, 0.05);
  const midL = (lightL + darkL) / 2;

  // 调整饱和度以增强效果
  const lightS = Math.min(s * 0.8, 1);
  const darkS = Math.min(s * 1.2, 1);

  const [lightR, lightG, lightB] = hslToRgb(h, lightS, lightL);
  const [midR, midG, midB] = hslToRgb(h, s, midL);
  const [darkR, darkG, darkB] = hslToRgb(h, darkS, darkL);

  const lightColor = `rgb(${lightR}, ${lightG}, ${lightB})`;
  const midColor = `rgb(${midR}, ${midG}, ${midB})`;
  const darkColor = `rgb(${darkR}, ${darkG}, ${darkB})`;

  // 使用三个颜色点创建更丰富的渐变
  return `linear-gradient(to bottom, ${lightColor} 0%, ${midColor} 50%, ${darkColor} 100%)`;
};

// Helper functions (unchanged)
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r;
  let g;
  let b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 添加新的接口
interface ITextColors {
  primary: string;
  active: string;
}

// 添加新的函数
export const calculateBrightness = (r: number, g: number, b: number): number => {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export const parseGradient = (gradientStr: string) => {
  const matches = gradientStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g);
  if (!matches) return [];
  return matches.map((rgb) => {
    const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
    return { r, g, b };
  });
};

export const interpolateRGB = (start: number, end: number, progress: number) => {
  return Math.round(start + (end - start) * progress);
};

export const createGradientString = (colors: { r: number; g: number; b: number }[], percentages = [0, 50, 100]) => {
  return `linear-gradient(to bottom, ${colors
    .map((color, i) => `rgb(${color.r}, ${color.g}, ${color.b}) ${percentages[i]}%`)
    .join(', ')})`;
};

export const getTextColors = (gradient: string = ''): ITextColors => {
  const defaultColors = {
    primary: 'rgba(255, 255, 255, 0.54)',
    active: '#ffffff',
  };

  if (!gradient) return defaultColors;

  const colors = parseGradient(gradient);
  if (!colors.length) return defaultColors;

  const mainColor = colors[1] || colors[0];
  const brightness = calculateBrightness(mainColor.r, mainColor.g, mainColor.b);
  const isDark = brightness > 0.6;

  return {
    primary: isDark ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.54)',
    active: isDark ? '#000000' : '#ffffff',
  };
};

export const getHoverBackgroundColor = (isDark: boolean): string => {
  return isDark ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
};

export const animateGradient = (
  oldGradient: string,
  newGradient: string,
  onUpdate: (gradient: string) => void,
  duration = 1000,
) => {
  const startColors = parseGradient(oldGradient);
  const endColors = parseGradient(newGradient);
  if (startColors.length !== endColors.length) return null;

  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const currentColors = startColors.map((startColor, i) => ({
      r: interpolateRGB(startColor.r, endColors[i].r, progress),
      g: interpolateRGB(startColor.g, endColors[i].g, progress),
      b: interpolateRGB(startColor.b, endColors[i].b, progress),
    }));

    onUpdate(createGradientString(currentColors));

    if (progress < 1) {
      return requestAnimationFrame(animate);
    }
    return null;
  };

  return requestAnimationFrame(animate);
};
