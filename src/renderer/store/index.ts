import { createPinia } from 'pinia';

import router from '@/router';

// 创建 pinia 实例
const pinia = createPinia();

// 添加路由到 Pinia
pinia.use(({ store }) => {
  store.router = markRaw(router);
});

// 导出所有 store
export * from './modules/lyric';
export * from './modules/menu';
export * from './modules/music';
export * from './modules/player';
export * from './modules/search';
export * from './modules/settings';
export * from './modules/user';

export default pinia;
