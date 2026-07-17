const layoutRouter = [
  {
    path: '/',
    name: 'home',
    meta: {
      title: 'comp.home',
      icon: 'icon-Home',
      keepAlive: true,
      isMobile: true
    },
    component: () => import('@/views/home/index.vue')
  },
  {
    path: '/discover',
    name: 'discover',
    meta: {
      title: 'comp.discover',
      icon: 'ri-compass-discover-line',
      keepAlive: true,
      isMobile: true,
      noScroll: true
    },
    component: () => import('@/views/discover/index.vue')
  },
  {
    path: '/search',
    name: 'search',
    meta: {
      title: 'comp.search',
      noScroll: true,
      icon: 'icon-Search',
      keepAlive: true,
      // 搜索在顶栏，侧栏不重复展示
      hideInSidebar: true
    },
    component: () => import('@/views/search/index.vue')
  },
  {
    path: '/list',
    name: 'list',
    meta: {
      title: 'comp.list',
      icon: 'icon-Paper',
      keepAlive: true,
      isMobile: true,
      // 用户歌单已挂到侧栏底部区域，主导航不再占「歌单」入口
      hideInSidebar: true
    },
    component: () => import('@/views/list/index.vue')
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/historyAndFavorite/index.vue'),
    meta: {
      title: 'comp.history',
      icon: 'icon-a-TicketStar',
      keepAlive: true,
      isMobile: true,
      // 本地入口放在「歌单」页，侧栏不单独占一项
      hideInSidebar: true
    }
  },
  {
    path: '/user',
    name: 'user',
    meta: {
      title: 'comp.user',
      icon: 'icon-Profile',
      keepAlive: true,
      noScroll: true,
      isMobile: true,
      // 用户入口在右上角，侧栏不重复
      hideInSidebar: true
    },
    component: () => import('@/views/user/index.vue')
  },
  {
    path: '/set',
    name: 'set',
    meta: {
      title: 'comp.settings',
      icon: 'ri-settings-3-fill',
      keepAlive: true,
      noScroll: true,
      back: true,
      hideInSidebar: true
    },
    component: () => import('@/views/set/index.vue')
  }
];
export default layoutRouter;
