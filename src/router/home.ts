const layoutRouter = [
  {
    path: '/',
    name: 'home',
    mate: {
      keepAlive: true,
      title: '首页',
      icon: 'icon-Home',
    },
    component: () => import('@/views/home/index.vue'),
  },
  {
    path: '/search',
    name: 'search',
    mate: {
      title: '搜索',
      keepAlive: true,
      icon: 'icon-Search',
    },
    component: () => import('@/views/search/index.vue'),
  },
  {
    path: '/list',
    name: 'list',
    mate: {
      title: '歌单',
      keepAlive: true,
      icon: 'icon-Paper',
    },
    component: () => import('@/views/list/index.vue'),
  },
  {
    path: '/mv',
    name: 'mv',
    mate: {
      title: 'MV',
      keepAlive: true,
      icon: 'icon-recordfill',
    },
    component: () => import('@/views/mv/index.vue'),
  },
  {
    path: '/user',
    name: 'user',
    mate: {
      title: '用户',
      keepAlive: true,
      icon: 'icon-Profile',
    },
    component: () => import('@/views/user/index.vue'),
  },
  // {
  //   path: "/test",
  //   name: "test",
  //   mate: {
  //     title: "用户",
  //     keepAlive: true,
  //     icon: "icon-Profile",
  //   },
  //   component: () => import("@/views/test/test.vue"),
  // },
]

export default layoutRouter;
