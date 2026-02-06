import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import homeRouter from '@/router/home';
import { useSettingsStore } from '@/store/modules/settings';

export const useMenuStore = defineStore('menu', () => {
  const allMenus = ref(homeRouter);
  const settingsStore = useSettingsStore();

  const menus = computed(() => {
    return allMenus.value.filter((item) => {
      if (settingsStore.isMobile) {
        return item.meta?.isMobile !== false;
      }
      return true;
    });
  });

  const setMenus = (newMenus: any[]) => {
    allMenus.value = newMenus;
  };

  return {
    menus,
    setMenus
  };
});
