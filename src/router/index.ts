import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
import homeRouter from "@/router/home";

const routes = [
  {
    path: "/",
    component: AppLayout,
    children: homeRouter,
  },
];

export default createRouter({
  routes: routes,
  history: createWebHistory(),
});
