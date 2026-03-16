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
    path: '/search',
    name: 'search',
    meta: {
      title: 'comp.search',
      noScroll: true,
      icon: 'icon-Search',
      keepAlive: true
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
      isMobile: true
    },
    component: () => import('@/views/list/index.vue')
  },
  {
    path: '/album',
    name: 'album',
    meta: {
      title: 'comp.newAlbum.title',
      icon: 'ri-album-fill',
      keepAlive: true,
      isMobile: true
    },
    component: () => import('@/views/album/index.vue')
  },
  {
    path: '/toplist',
    name: 'toplist',
    meta: {
      title: 'comp.toplist',
      icon: 'ri-bar-chart-grouped-fill',
      keepAlive: true,
      isMobile: true
    },
    component: () => import('@/views/toplist/index.vue')
  },
  {
    path: '/mv',
    name: 'mv',
    meta: {
      title: 'comp.mv',
      icon: 'icon-recordfill',
      keepAlive: true,
      isMobile: false,
      back: true,
      hideInSidebar: true
    },
    component: () => import('@/views/mv/index.vue')
  },
  {
    path: '/podcast',
    name: 'podcast',
    meta: {
      title: 'podcast.podcast',
      icon: 'ri-radio-fill',
      keepAlive: true,
      isMobile: false,
      back: true
    },
    component: () => import('@/views/podcast/index.vue')
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/historyAndFavorite/index.vue'),
    meta: {
      title: 'comp.history',
      icon: 'icon-a-TicketStar',
      keepAlive: true,
      isMobile: true
    }
  },
  {
    path: '/local-music',
    name: 'localMusic',
    meta: {
      title: 'comp.localMusic',
      icon: 'ri-folder-music-fill',
      keepAlive: true,
      isMobile: false,
      electronOnly: true,
      hideInSidebar: true
    },
    component: () => import('@/views/local-music/index.vue')
  },
  {
    path: '/user',
    name: 'user',
    meta: {
      title: 'comp.user',
      icon: 'icon-Profile',
      keepAlive: true,
      noScroll: true,
      isMobile: true
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
      back: true
    },
    component: () => import('@/views/set/index.vue')
  }
];
export default layoutRouter;
