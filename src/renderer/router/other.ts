const otherRouter = [
  {
    path: '/user/follows',
    name: 'userFollows',
    meta: {
      title: '关注列表',
      keepAlive: true,
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
      keepAlive: true,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/user/followers.vue')
  },
  {
    path: '/user/detail/:uid',
    name: 'userDetail',
    meta: {
      title: '用户详情',
      keepAlive: true,
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
  }
];
export default otherRouter;
