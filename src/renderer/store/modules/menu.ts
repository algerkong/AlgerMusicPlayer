import { defineStore } from 'pinia';
import { ref } from 'vue';

import homeRouter from '@/router/home';

export const useMenuStore = defineStore('menu', () => {
  const menus = ref(homeRouter);

  const setMenus = (newMenus: any[]) => {
    menus.value = newMenus;
  };

  return {
    menus,
    setMenus
  };
});
