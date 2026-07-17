import { describe, expect, it } from 'vitest';

import { resolveScrollEl, scrollLyricLineToCenter } from './useLyricAutoScroll';

describe('resolveScrollEl', () => {
  it('returns HTMLElement as-is', () => {
    const el = document.createElement('div');
    expect(resolveScrollEl(el)).toBe(el);
  });

  it('reads getViewport / viewport', () => {
    const el = document.createElement('div');
    expect(resolveScrollEl({ getViewport: () => el })).toBe(el);
    expect(resolveScrollEl({ viewport: el })).toBe(el);
    expect(resolveScrollEl(null)).toBeNull();
  });
});

describe('scrollLyricLineToCenter', () => {
  it('no-ops when canAutoScroll false or missing nodes', () => {
    expect(
      scrollLyricLineToCenter(document.createElement('div'), 'x', { canAutoScroll: false })
    ).toBe(false);
    expect(scrollLyricLineToCenter(null, 'x')).toBe(false);
  });

  it('scrolls when line exists', () => {
    const scroller = document.createElement('div');
    Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true });
    scroller.scrollTo = ((opts: ScrollToOptions) => {
      scroller.scrollTop = Number(opts.top) || 0;
    }) as typeof scroller.scrollTo;
    scroller.getBoundingClientRect = () =>
      ({ top: 0, height: 200, left: 0, width: 100, bottom: 200, right: 100 }) as DOMRect;

    const line = document.createElement('div');
    line.id = 'lyric-line-1';
    line.getBoundingClientRect = () =>
      ({ top: 100, height: 20, left: 0, width: 100, bottom: 120, right: 100 }) as DOMRect;
    document.body.appendChild(scroller);
    document.body.appendChild(line);

    expect(scrollLyricLineToCenter(scroller, 'lyric-line-1', { immediate: true })).toBe(true);
    document.body.removeChild(line);
    document.body.removeChild(scroller);
  });
});
