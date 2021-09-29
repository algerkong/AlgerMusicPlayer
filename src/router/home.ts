const layoutRouter = [
  {
    path: "/",
    name: "home",
    mate: {
      keepAlive: true,
      title: "首页",
      icon: "icon-Home",
    },
    component: () => import("@/views/home/index.vue"),
  },
  {
    path: "/search",
    name: "search",
    mate: {
      title: "搜索",
      keepAlive: true,
      icon: "icon-Search",
    },
    component: () => import("@/views/search/index.vue"),
  },
  {
    path: "/list",
    name: "list",
    mate: {
      title: "歌单",
      keepAlive: true,
      icon: "icon-Paper",
    },
    component: () => import("@/views/list/index.vue"),
  },
];

export default layoutRouter;
