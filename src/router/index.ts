import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
const layoutRouter = [
  {
    path: "",
    name: "home",
    component: () => import("@/views/home/index.vue"),
  },
  {
    path: "/search",
    name: "search",
    component: () => import("@/views/search/index.vue"),
  },
];

const routes = [
  {
    path: "/",
    component: AppLayout,
    children: layoutRouter,
  },
];

export default createRouter({
  routes: routes,
  history: createWebHistory(),
});
