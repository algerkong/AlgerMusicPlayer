import { isRef, onMounted, onUnmounted, Ref, watch } from 'vue';

import { useNavTitleStore } from '@/store/modules/navTitle';

/**
 * 页面标题滚动监听 hook
 *
 * 当 titleEl 元素滚出视口时，在 SearchBar 中显示标题。
 * 滚回视口后自动隐藏 SearchBar 中的标题。
 *
 * @param title  标题文本（字符串或 Ref<string>）
 * @param titleEl  需要被监听的标题 DOM 元素（通常是页面 h1/h2）
 *
 * @example
 * // 在页面组件中：
 * const titleRef = ref<HTMLElement | null>(null);
 * useScrollTitle('歌单名称', titleRef);
 * // 或响应式标题：
 * useScrollTitle(computed(() => playlist.value?.name ?? ''), titleRef);
 */
export function useScrollTitle(title: string | Ref<string>, titleEl: Ref<HTMLElement | null>) {
  const store = useNavTitleStore();
  let observer: IntersectionObserver | null = null;

  const setupObserver = (el: HTMLElement) => {
    observer?.disconnect();
    observer = new IntersectionObserver(([entry]) => store.setVisible(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: '-56px 0px 0px 0px'
    });
    observer.observe(el);
  };

  onMounted(() => {
    // 设置初始标题
    store.setTitle(isRef(title) ? title.value : title);

    // 等待 DOM 就绪后启动 observer
    if (titleEl.value) {
      setupObserver(titleEl.value);
    }
  });

  // 响应式标题：当 Ref<string> 变化时同步更新 store
  if (isRef(title)) {
    watch(title, (v) => store.setTitle(v));
  }

  // titleEl 延迟挂载时补充 observer
  watch(titleEl, (el) => {
    if (el) setupObserver(el);
  });

  onUnmounted(() => {
    observer?.disconnect();
    store.clear();
  });
}
