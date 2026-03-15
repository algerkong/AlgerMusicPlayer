import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 导航栏标题 store
 * 用于页面滚动后在 SearchBar 中显示当前页面标题
 * 无持久化，页面卸载时自动清除
 */
export const useNavTitleStore = defineStore('navTitle', () => {
  const title = ref('');
  const isVisible = ref(false);

  const setTitle = (t: string) => {
    title.value = t;
  };

  const setVisible = (v: boolean) => {
    isVisible.value = v;
  };

  const clear = () => {
    title.value = '';
    isVisible.value = false;
  };

  return { title, isVisible, setTitle, setVisible, clear };
});
