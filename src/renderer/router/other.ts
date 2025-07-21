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
    component: () => import('@/views/artist/detail.vue')
  },
  {
    path: '/bilibili/:bvid',
    name: 'bilibiliPlayer',
    meta: {
      title: 'B站听书',
      keepAlive: true,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/bilibili/BilibiliPlayer.vue')
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
  }
];
export default otherRouter;
