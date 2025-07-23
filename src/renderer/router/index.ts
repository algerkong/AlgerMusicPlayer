import { createRouter, createWebHashHistory } from 'vue-router';

import AppLayout from '@/layout/AppLayout.vue';
import MiniLayout from '@/layout/MiniLayout.vue';
import homeRouter from '@/router/home';
import otherRouter from '@/router/other';
import { useSettingsStore } from '@/store/modules/settings';

import { useUserStore } from '../store/modules/user';

function getUserId(): string | null {
  const userStore = useUserStore();
  return userStore.user?.userId?.toString() || null;
}

// 由于 Vue Router 守卫在创建前不能直接使用组合式 API
// 我们创建一个辅助函数来获取 store 实例
let _settingsStore: ReturnType<typeof useSettingsStore> | null = null;
const getSettingsStore = () => {
  if (!_settingsStore) {
    _settingsStore = useSettingsStore();
  }
  return _settingsStore;
};

const loginRouter = {
  path: '/login',
  name: 'login',
  meta: {
    keepAlive: true,
    title: '登录',
    icon: 'icon-Home',
    back: true
  },
  component: () => import('@/views/login/index.vue')
};

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [...homeRouter, loginRouter, ...otherRouter]
  },
  {
    path: '/lyric',
    component: () => import('@/views/lyric/index.vue')
  },
  {
    path: '/mini',
    component: MiniLayout
  }
];

const router = createRouter({
  routes,
  history: createWebHashHistory()
});

// 添加全局前置守卫
router.beforeEach((to, _, next) => {
  const settingsStore = getSettingsStore();

  // 如果是迷你模式
  if (settingsStore.isMiniMode) {
    // 只允许访问 /mini 路由
    if (to.path === '/mini') {
      next();
    } else {
      next(false); // 阻止导航
    }
  } else if (to.path === '/mini') {
    // 如果不是迷你模式但想访问 /mini 路由，重定向到首页
    next('/');
  } else {
    // 其他情况正常导航
    next();
  }
});

// 添加全局后置钩子，记录页面访问
router.afterEach((to) => {
  const pageName = to.name?.toString() || to.path;
  // 使用setTimeout避免阻塞路由导航
  setTimeout(() => {
    const userId = getUserId();
    console.log('pageName', pageName, userId);
  }, 100);
});

export default router;
