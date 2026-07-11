const otherRouter = [
  {
    path: '/downloads',
    name: 'downloads',
    meta: {
      title: '下载管理',
      keepAlive: true,
      showInMenu: true,
      back: true,
      icon: 'ri-download-cloud-2-line'
    },
    component: () => import('@/views/download/DownloadPage.vue')
  },
  {
    path: '/artist/detail/:id',
    name: 'artistDetail',
    meta: {
      title: '歌手详情',
      keepAlive: true,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/artist/detail.vue'),
    props: (route) => ({ key: route.params.id })
  },
  {
    path: '/music-list/:id?',
    name: 'musicList',
    meta: {
      title: '音乐列表',
      keepAlive: false,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/music/MusicListPage.vue')
  },
  {
    path: '/heatmap',
    name: 'heatmap',
    meta: {
      title: '播放热力图',
      keepAlive: true,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/heatmap/index.vue')
  },
  {
    path: '/mobile-search',
    name: 'mobileSearch',
    meta: {
      title: '搜索',
      keepAlive: false,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/mobile-search/index.vue')
  },
  {
    path: '/mobile-search-result',
    name: 'mobileSearchResult',
    meta: {
      title: '搜索结果',
      keepAlive: false,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/mobile-search-result/index.vue')
  },
  {
    path: '/favorite',
    name: 'favorite',
    meta: {
      title: 'comp.homeHero.quickNav.myFavorite',
      icon: 'ri-heart-fill',
      keepAlive: true,
      back: true
    },
    component: () => import('@/views/favorite/index.vue')
  },
  {
    path: '/search-result',
    name: 'searchResult',
    meta: {
      title: '搜索结果',
      keepAlive: true,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/search/SearchResult.vue')
  }
];
export default otherRouter;
