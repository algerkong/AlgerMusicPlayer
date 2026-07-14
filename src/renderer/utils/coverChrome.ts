import { getAmbientSolidFromBackground } from './linearColor';

/** CSS custom properties written for cover-tinted chrome (layout + :root). */
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

/** Extract `r, g, b` numbers from rgb()/rgba() or bare numbers. */
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

/** Extract `r, g, b` triple string. */
export const parseRgbTriple = (color: string | undefined | null): string | null => {
  const parts = parseRgbParts(color);
  if (!parts) return null;
  return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};

/** Tailwind/shadcn `--primary` format: `H S% L%` (no hsl()). */
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

/** Naive-ui theme overrides from an accent rgb() string. */
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
 * Build iOS-style chrome tokens from cover palette.
 * Requires a real background wash; primary alone is not enough (avoids light-on-white).
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
      // Tailwind `bg-primary` / `text-primary` / `ring-primary`
      '--primary': primaryHsl,
      '--ring': primaryHsl
    };
  } catch (error) {
    console.error('[cover-chrome] build failed', error);
    return null;
  }
};

/** Apply cover chrome on documentElement so teleports/popovers inherit tint. */
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
