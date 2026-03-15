import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { markRaw } from 'vue';

import router from '@/router';

// 创建 pinia 实例
const pinia = createPinia();

pinia.use(piniaPluginPersistedstate);

// 添加路由到 Pinia
pinia.use(({ store }) => {
  store.router = markRaw(router);
});

// 导出所有 store
export * from './modules/favorite';
export * from './modules/intelligenceMode';
export * from './modules/localMusic';
export * from './modules/lyric';
export * from './modules/menu';
export * from './modules/music';
export * from './modules/navTitle';
export * from './modules/player';
export * from './modules/playerCore';
export * from './modules/playHistory';
export * from './modules/playlist';
export * from './modules/recommend';
export * from './modules/search';
export * from './modules/settings';
export * from './modules/user';

export default pinia;
