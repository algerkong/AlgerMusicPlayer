import { computed, type ComputedRef, type Ref,ref } from 'vue';

import { usePlayerStore } from '@/store';
import { isMobile } from '@/utils';

type ProgressiveRenderOptions = {
  /** 全量数据列表 */
  items: ComputedRef<any[]> | Ref<any[]>;
  /** 每项估算高度（px） */
  itemHeight: ComputedRef<number> | number;
  /** 列表区域的 CSS 选择器，用于计算偏移 */
  listSelector: string;
  /** 初始渲染数量 */
  initialCount?: number;
  /** 滚动到底部时的回调（用于加载更多数据） */
  onReachEnd?: () => void;
};

export const useProgressiveRender = (options: ProgressiveRenderOptions) => {
  const { items, itemHeight, listSelector, initialCount = 40, onReachEnd } = options;

  const playerStore = usePlayerStore();
  const renderLimit = ref(initialCount);

  const getItemHeight = () => (typeof itemHeight === 'number' ? itemHeight : itemHeight.value);

  /** 截取到 renderLimit 的可渲染列表 */
  const renderedItems = computed(() => {
    const all = items.value;
    return all.slice(0, renderLimit.value);
  });

  /** 未渲染项的占位高度，让滚动条反映真实总高度 */
  const placeholderHeight = computed(() => {
    const unrendered = items.value.length - renderedItems.value.length;
    return Math.max(0, unrendered) * getItemHeight();
  });

  /** 是否正在播放（用于动态底部间距） */
  const isPlaying = computed(() => !!playerStore.playMusicUrl);

  /** 内容区底部 padding，播放时留出播放栏空间 */
  const contentPaddingBottom = computed(() =>
    isPlaying.value && !isMobile.value ? '220px' : '80px'
  );

  /** 重置渲染限制 */
  const resetRenderLimit = () => {
    renderLimit.value = initialCount;
  };

  /** 扩展渲染限制到指定索引 */
  const expandTo = (index: number) => {
    renderLimit.value = Math.max(renderLimit.value, index);
  };

  /**
   * 滚动事件处理函数，挂载到外层 n-scrollbar 的 @scroll
   * 根据可视区域动态扩展 renderLimit
   */
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    const { scrollTop, clientHeight } = target;

    const listSection = document.querySelector(listSelector) as HTMLElement;
    const listStart = listSection?.offsetTop || 0;

    const visibleBottom = scrollTop + clientHeight - listStart;
    if (visibleBottom <= 0) return;

    // 多渲染一屏作为缓冲
    const bufferHeight = clientHeight;
    const neededIndex = Math.ceil((visibleBottom + bufferHeight) / getItemHeight());
    const allCount = items.value.length;

    if (neededIndex > renderLimit.value) {
      renderLimit.value = Math.min(neededIndex, allCount);
    }

    // 所有项都已渲染，通知外部加载更多数据
    if (renderLimit.value >= allCount && onReachEnd) {
      onReachEnd();
    }
  };

  return {
    renderLimit,
    renderedItems,
    placeholderHeight,
    isPlaying,
    contentPaddingBottom,
    resetRenderLimit,
    expandTo,
    handleScroll
  };
};
