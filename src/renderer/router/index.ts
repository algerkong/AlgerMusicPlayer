import { createRouter, createWebHashHistory } from 'vue-router';

import AppLayout from '@/layout/AppLayout.vue';
import homeRouter from '@/router/home';
import otherRouter from '@/router/other';

import { useUserStore } from '../store/modules/user';

function getUserId(): string | null {
  const userStore = useUserStore();
  return userStore.user?.userId?.toString() || null;
}

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
  }
];

const router = createRouter({
  routes,
  history: createWebHashHistory()
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
