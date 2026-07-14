import { describe, expect, it } from 'vitest';

import {
  buildIosPaletteFromRgb,
  extractVibrantRgbFromImageData,
  getAmbientSolidFromBackground,
  getTextColors
} from './linearColor';

describe('buildIosPaletteFromRgb', () => {
  it('keeps backgrounds dark enough for light text', () => {
    const palette = buildIosPaletteFromRgb({ r: 240, g: 200, b: 180 }); // bright peach cover
    expect(palette.backgroundColor.startsWith('linear-gradient')).toBe(true);
    expect(palette.primaryColor).toMatch(/^rgb\(/);

    const text = getTextColors(palette.backgroundColor);
    expect(text.active).toBe('#ffffff');
    expect(text.theme).toBe('light');
  });

  it('handles near-gray covers without washing out', () => {
    const palette = buildIosPaletteFromRgb({ r: 180, g: 180, b: 182 });
    expect(palette.backgroundColor).toContain('rgb(');
    const solid = getAmbientSolidFromBackground(palette.backgroundColor);
    expect(solid).toMatch(/^rgb\(/);
  });
});

describe('extractVibrantRgbFromImageData', () => {
  it('prefers saturated mid-tones over black/white borders', () => {
    // 2 pixels: black, vivid red mid
    const data = new Uint8ClampedArray([
      0,
      0,
      0,
      255, // black
      255,
      255,
      255,
      255, // white
      200,
      40,
      40,
      255, // red
      200,
      40,
      40,
      255
    ]);
    const rgb = extractVibrantRgbFromImageData(data);
    // Should land near red, not gray
    expect(rgb.r).toBeGreaterThan(rgb.g);
    expect(rgb.r).toBeGreaterThan(rgb.b);
  });

  it('falls back when only pure black/white', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const rgb = extractVibrantRgbFromImageData(data);
    expect(rgb.r).toBeGreaterThanOrEqual(0);
    expect(rgb.b).toBeGreaterThanOrEqual(0);
  });
});
