import { describe, expect, it } from 'vitest';

import { normalizePlayMode } from './playlistPlayMode';

describe('normalizePlayMode', () => {
  it('keeps sequential, loop, and shuffle', () => {
    expect(normalizePlayMode(0)).toBe(0);
    expect(normalizePlayMode(1)).toBe(1);
    expect(normalizePlayMode(2)).toBe(2);
  });

  it('migrates removed intelligence mode (3) to sequential', () => {
    expect(normalizePlayMode(3)).toBe(0);
  });

  it('migrates other illegal values to sequential', () => {
    expect(normalizePlayMode(-1)).toBe(0);
    expect(normalizePlayMode(4)).toBe(0);
    expect(normalizePlayMode('2')).toBe(0);
    expect(normalizePlayMode(null)).toBe(0);
    expect(normalizePlayMode(undefined)).toBe(0);
    expect(normalizePlayMode(NaN)).toBe(0);
  });
});
