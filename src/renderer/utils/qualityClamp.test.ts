import { describe, expect, it } from 'vitest';

import { clampQualityToAvailable, normalizeQualityKey } from './qualityClamp';

describe('clampQualityToAvailable', () => {
  it('无损有货就无损', () => {
    expect(clampQualityToAvailable('lossless', ['highest', 'lossless', 'higher'])).toBe('lossless');
  });

  it('偏好无损、本曲无无损 → 极高，不进录音室/全景', () => {
    expect(
      clampQualityToAvailable('lossless', ['hi_res', 'spatial', 'highest', 'higher', 'medium'])
    ).toBe('highest');
    expect(clampQualityToAvailable('lossless', ['hi_res', 'spatial', 'higher'])).toBe('higher');
  });

  it('偏好极高不会抬到无损/录音室', () => {
    expect(clampQualityToAvailable('highest', ['lossless', 'hi_res', 'highest', 'higher'])).toBe(
      'highest'
    );
  });

  it('手选录音室：有则录音室，无则回落普通阶梯且不进全景', () => {
    expect(clampQualityToAvailable('hi_res', ['hi_res', 'lossless', 'highest'])).toBe('hi_res');
    expect(clampQualityToAvailable('hi_res', ['spatial', 'lossless', 'highest'])).toBe('lossless');
    expect(clampQualityToAvailable('hi_res', ['spatial', 'highest'])).toBe('highest');
  });

  it('手选全景：有则全景，无则不自动变录音室', () => {
    expect(clampQualityToAvailable('spatial', ['spatial', 'hi_res', 'highest'])).toBe('spatial');
    expect(clampQualityToAvailable('spatial', ['hi_res', 'highest', 'higher'])).toBe('highest');
  });

  it('normalizeQualityKey 别名', () => {
    expect(normalizeQualityKey('flac')).toBe('lossless');
    expect(normalizeQualityKey('hires')).toBe('hi_res');
    expect(normalizeQualityKey('atmos')).toBe('spatial');
  });
});
