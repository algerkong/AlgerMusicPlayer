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
  }
];
export default otherRouter;
