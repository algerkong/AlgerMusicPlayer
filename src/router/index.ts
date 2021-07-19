import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
const layoutRouter = [
  {
    path: "",
    name: "home",
    component: () => import("@/views/home/index.vue"),
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
