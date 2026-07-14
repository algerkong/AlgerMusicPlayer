import { getAmbientSolidFromBackground } from './linearColor';

/** 封面取色壳层 CSS 变量（布局 + :root） */
export type CoverChromeVars = Record<string, string>;

const ROOT_KEYS = [
  '--chrome-tint',
  '--chrome-surface',
  '--chrome-surface-strong',
  '--chrome-border',
  '--chrome-text',
  '--chrome-text-muted',
  '--chrome-accent',
  '--primary-color',
  '--primary',
  '--ring'
] as const;

/** 从 rgb()/rgba() 或裸数字提取 r,g,b */
export const parseRgbParts = (
  color: string | undefined | null
): [number, number, number] | null => {
  if (!color || typeof color !== 'string') return null;
  const m = color.match(/\d+/g);
  if (!m || m.length < 3) return null;
  const r = Number(m[0]);
  const g = Number(m[1]);
  const b = Number(m[2]);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return [r, g, b];
};

/** 提取 r, g, b 三元组字符串 */
export const parseRgbTriple = (color: string | undefined | null): string | null => {
  const parts = parseRgbParts(color);
  if (!parts) return null;
  return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};

/** Tailwind/shadcn 的 --primary 格式：H S% L%（不含 hsl()） */
export const rgbToHslComponents = (r: number, g: number, b: number): string => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const shiftChannel = (n: number, delta: number) => Math.max(0, Math.min(255, n + delta));

/** 由强调色 rgb() 生成 naive-ui 主题覆盖 */
export const buildNaivePrimaryOverrides = (primaryColor: string | undefined | null) => {
  const parts = parseRgbParts(primaryColor);
  if (!parts) return {};
  const [r, g, b] = parts;
  const base = rgbToHex(r, g, b);
  const hover = rgbToHex(shiftChannel(r, 18), shiftChannel(g, 18), shiftChannel(b, 18));
  const pressed = rgbToHex(shiftChannel(r, -22), shiftChannel(g, -22), shiftChannel(b, -22));
  return {
    common: {
      primaryColor: base,
      primaryColorHover: hover,
      primaryColorPressed: pressed,
      primaryColorSuppl: base
    },
    Slider: {
      fillColor: base,
      fillColorHover: hover,
      handleColor: base
    },
    Progress: {
      fillColor: base
    },
    Checkbox: {
      colorChecked: base,
      borderChecked: base
    },
    Radio: {
      color: base,
      dotColorActive: base
    },
    Switch: {
      railColorActive: base
    },
    Tag: {
      colorSuccess: base,
      textColorSuccess: '#fff',
      borderSuccess: base
    }
  };
};

/**
 * 由封面色盘构建壳层 token
 * 需要真实背景铺色；仅有 primary 时跳过（避免白底浅字）
 */
export const buildCoverChromeVars = (
  backgroundColor: string | undefined | null,
  primaryColor: string | undefined | null
): CoverChromeVars | null => {
  try {
    const bg = typeof backgroundColor === 'string' ? backgroundColor.trim() : '';
    if (!bg) return null;

    const ambientSolid = getAmbientSolidFromBackground(bg);
    const ambientParts = parseRgbParts(ambientSolid) || [28, 24, 32];
    const accentParts = parseRgbParts(primaryColor) || ambientParts;
    const ambient = `${ambientParts[0]}, ${ambientParts[1]}, ${ambientParts[2]}`;
    const accent = `${accentParts[0]}, ${accentParts[1]}, ${accentParts[2]}`;
    const primaryHsl = rgbToHslComponents(accentParts[0], accentParts[1], accentParts[2]);

    return {
      background: bg,
      '--chrome-tint': ambient,
      '--chrome-surface': `rgba(${ambient}, 0.42)`,
      '--chrome-surface-strong': `rgba(${ambient}, 0.72)`,
      '--chrome-border': 'rgba(255, 255, 255, 0.14)',
      '--chrome-text': '#f8fafc',
      '--chrome-text-muted': 'rgba(248, 250, 252, 0.78)',
      '--chrome-accent': accent,
      '--primary-color': `rgb(${accent})`,
      // 供 shadcn / Tailwind primary 使用
      '--primary': primaryHsl,
      '--ring': primaryHsl
    };
  } catch (error) {
    console.error('[cover-chrome] build failed', error);
    return null;
  }
};

/** 写入 documentElement，供 teleport 弹层继承 */
export const applyCoverChromeToRoot = (vars: CoverChromeVars | null): void => {
  try {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!vars) {
      ROOT_KEYS.forEach((key) => root.style.removeProperty(key));
      root.classList.remove('has-cover-chrome');
      return;
    }
    ROOT_KEYS.forEach((key) => {
      const value = vars[key];
      if (value) root.style.setProperty(key, value);
    });
    root.classList.add('has-cover-chrome');
  } catch (error) {
    console.error('[cover-chrome] apply failed', error);
  }
};
