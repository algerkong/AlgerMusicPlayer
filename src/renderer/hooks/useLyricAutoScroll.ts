/**
 * 歌词自动滚到当前行：viewport 解析 + 居中 scroll。
 * MusicFull / MusicFullMobile 共用。
 */
import { ref } from 'vue';

/** ScrollArea 实例或 DOM → 真正可滚的 viewport */
export function resolveScrollEl(refLike: unknown): HTMLElement | null {
  if (!refLike) return null;
  if (refLike instanceof HTMLElement) return refLike;
  const any = refLike as { getViewport?: () => HTMLElement; viewport?: HTMLElement };
  if (typeof any.getViewport === 'function') return any.getViewport();
  if (any.viewport instanceof HTMLElement) return any.viewport;
  return null;
}

export type ScrollLyricOptions = {
  immediate?: boolean;
  /** 无时间轴等时 false */
  canAutoScroll?: boolean;
  /** 用户手势中且非 immediate 时跳过 */
  isUserScrolling?: boolean;
};

/** 滚到指定行 id，使其大致居中；失败返回 false */
export function scrollLyricLineToCenter(
  scrollerRef: unknown,
  lineElementId: string,
  options: ScrollLyricOptions = {}
): boolean {
  const { immediate = false, canAutoScroll = true, isUserScrolling = false } = options;
  try {
    if (!canAutoScroll) return false;
    if (isUserScrolling && !immediate) return false;
    const scroller = resolveScrollEl(scrollerRef);
    if (!scroller) return false;
    const activeEl = document.getElementById(lineElementId);
    if (!activeEl) return false;

    const containerRect = scroller.getBoundingClientRect();
    const lineRect = activeEl.getBoundingClientRect();
    const scrollTop =
      scroller.scrollTop +
      (lineRect.top - containerRect.top) -
      containerRect.height / 2 +
      lineRect.height / 2;

    scroller.scrollTo({
      top: scrollTop,
      behavior: immediate ? 'auto' : 'smooth'
    });
    return true;
  } catch {
    return false;
  }
}

/** 用户滚动暂停自动跟滚的计时器状态 */
export function useLyricUserScrollPause() {
  const isUserScrolling = ref(false);
  const autoScrollTimer = ref<number | null>(null);

  const clearResumeTimer = () => {
    if (autoScrollTimer.value != null) {
      clearTimeout(autoScrollTimer.value);
      autoScrollTimer.value = null;
    }
  };

  const markUserScrolling = (pauseMs = 3000, onResume?: () => void) => {
    isUserScrolling.value = true;
    clearResumeTimer();
    autoScrollTimer.value = window.setTimeout(() => {
      isUserScrolling.value = false;
      autoScrollTimer.value = null;
      onResume?.();
    }, pauseMs);
  };

  return {
    isUserScrolling,
    autoScrollTimer,
    markUserScrolling,
    clearResumeTimer,
    dispose: clearResumeTimer
  };
}
