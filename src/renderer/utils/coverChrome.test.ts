import { describe, expect, it } from 'vitest';

import { buildCoverChromeVars, parseRgbTriple } from './coverChrome';

describe('coverChrome', () => {
  it('parses rgb triples', () => {
    expect(parseRgbTriple('rgb(10, 20, 30)')).toBe('10, 20, 30');
  });

  it('builds dark frosted surfaces from palette', () => {
    const vars = buildCoverChromeVars(
      'linear-gradient(to bottom, rgb(80, 40, 60) 0%, rgb(30, 15, 25) 50%, rgb(10, 8, 12) 100%)',
      'rgb(200, 100, 140)'
    );
    expect(vars).toBeTruthy();
    expect(vars!['--chrome-text']).toBe('#f8fafc');
    expect(vars!['--primary-color']).toBe('rgb(200, 100, 140)');
    expect(vars!['--primary']).toMatch(/^\d+ \d+% \d+%$/);
    expect(vars!['--ring']).toBe(vars!['--primary']);
    expect(vars!['--chrome-surface']).toMatch(/^rgba\(/);
    expect(vars!['--chrome-surface-strong']).toMatch(/^rgba\(/);
  });

  it('returns null without background wash', () => {
    expect(buildCoverChromeVars('', '')).toBeNull();
    expect(buildCoverChromeVars('', 'rgb(1,2,3)')).toBeNull();
  });
});
