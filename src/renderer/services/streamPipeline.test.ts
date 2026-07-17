import { describe, expect, it } from 'vitest';

import { pickBootQuality } from './streamPipeline';

describe('pickBootQuality', () => {
  it('lossless preference boots highest then upgrades', () => {
    const r = pickBootQuality('lossless', ['medium', 'higher', 'highest', 'lossless'], 'normal');
    expect(r.boot).toBe('highest');
    expect(r.upgradeTo).toBe('lossless');
  });

  it('highest preference boots higher then upgrades', () => {
    const r = pickBootQuality('highest', ['medium', 'higher', 'highest'], 'normal');
    expect(r.boot).toBe('higher');
    expect(r.upgradeTo).toBe('highest');
  });

  it('medium preference does not upgrade', () => {
    const r = pickBootQuality('medium', ['medium', 'higher', 'highest'], 'normal');
    expect(r.boot).toBe('medium');
    expect(r.upgradeTo).toBeUndefined();
  });

  it('slow network lowers boot further', () => {
    const r = pickBootQuality('lossless', ['medium', 'higher', 'highest', 'lossless'], 'slow');
    // normal would boot highest; slow steps down to higher
    expect(r.boot).toBe('higher');
    expect(r.upgradeTo).toBe('lossless');
  });

  it('only target available does not fake lower boot', () => {
    const r = pickBootQuality('lossless', ['lossless'], 'normal');
    expect(r.boot).toBe('lossless');
    expect(r.upgradeTo).toBeUndefined();
  });
});
