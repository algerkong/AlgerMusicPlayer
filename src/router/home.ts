const layoutRouter = [
  {
    path: '/',
    name: 'home',
    meta: {
      title: '首页',
      icon: 'icon-Home',
    },
    component: () => import('@/views/home/index.vue'),
  },
  {
    path: '/search',
    name: 'search',
    meta: {
      title: '搜索',
      noScroll: true,
      noKeepAlive: true,
      icon: 'icon-Search',
    },
    component: () => import('@/views/search/index.vue'),
  },
  {
    path: '/list',
    name: 'list',
    meta: {
      title: '歌单',
      icon: 'icon-Paper',
    },
    component: () => import('@/views/list/index.vue'),
  },
  {
    path: '/mv',
    name: 'mv',
    meta: {
      title: 'MV',
      icon: 'icon-recordfill',
    },
    component: () => import('@/views/mv/index.vue'),
  },
  {
    path: '/history',
    name: 'history',
    meta: {
      title: '历史',
      icon: 'icon-a-TicketStar',
    },
    component: () => import('@/views/history/index.vue'),
  },
  {
    path: '/user',
    name: 'user',
    meta: {
      title: '用户',
      noKeepAlive: true,
      icon: 'icon-Profile',
    },
    component: () => import('@/views/user/index.vue'),
  },
]
export default layoutRouter;
