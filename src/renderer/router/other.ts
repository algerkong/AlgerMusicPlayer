const otherRouter = [
  {
    path: '/user/follows',
    name: 'userFollows',
    meta: {
      title: '关注列表',
      keepAlive: false,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/user/follows.vue')
  },
  {
    path: '/user/followers',
    name: 'userFollowers',
    meta: {
      title: '粉丝列表',
      keepAlive: false,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/user/followers.vue')
  },
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
    path: '/user/detail/:uid',
    name: 'userDetail',
    meta: {
      title: '用户详情',
      keepAlive: false,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/user/detail.vue')
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
    path: '/playlist/import',
    name: 'playlistImport',
    meta: {
      title: '歌单导入',
      keepAlive: true,
      back: true
    },
    component: () => import('@/views/playlist/ImportPlaylist.vue')
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
    path: '/history-recommend',
    name: 'historyRecommend',
    meta: {
      title: '历史日推',
      keepAlive: true,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/music/HistoryRecommend.vue')
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
    path: '/podcast/radio/:id',
    name: 'podcastRadio',
    meta: {
      title: 'podcast.radioDetail',
      keepAlive: false,
      showInMenu: false,
      back: true,
      isMobile: true
    },
    component: () => import('@/views/podcast/radio.vue')
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
