import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '@/layout/AppLayout.vue'
import homeRouter from '@/router/home'

const loginRouter = {
  path: '/login',
  name: 'login',
  mate: {
    keepAlive: true,
    title: '登录',
    icon: 'icon-Home',
  },
  component: () => import('@/views/login/index.vue'),
}

const setRouter = {
  path: '/set',
  name: 'set',
  mate: {
    keepAlive: true,
    title: '设置',
    icon: 'icon-Home',
  },
  component: () => import('@/views/set/index.vue'),
}

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [...homeRouter, loginRouter, setRouter],
  },
]

export default createRouter({
  routes: routes,
  history: createWebHashHistory(),
})
