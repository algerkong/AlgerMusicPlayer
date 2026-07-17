import { createRouter, createWebHashHistory } from 'vue-router';

import AppLayout from '@/layout/AppLayout.vue';
import homeRouter from '@/router/home';
import otherRouter from '@/router/other';

import { useUserStore } from '../store/modules/user';

function getUserId(): string | null {
  const userStore = useUserStore();
  const u = userStore.user;
  if (!u) return null;
  // 优先雪花字符串，避免 Number 精度丢失
  if (u.user_id != null && String(u.user_id)) return String(u.user_id);
  return u.userId != null ? String(u.userId) : null;
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
  }
];

const router = createRouter({
  routes,
  history: createWebHashHistory()
});

router.afterEach((to) => {
  const pageName = to.name?.toString() || to.path;
  setTimeout(() => {
    const userId = getUserId();
    console.log('pageName', pageName, userId);
  }, 100);
});

export default router;
