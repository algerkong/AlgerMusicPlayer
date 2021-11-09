import { createRouter, createWebHistory, createMemoryHistory } from "vue-router"
import AppLayout from "@/layout/AppLayout.vue"
import homeRouter from "@/router/home"

let loginRouter = {
  path: "/login",
  name: "login",
  mate: {
    keepAlive: true,
    title: "登录",
    icon: "icon-Home",
  },
  component: () => import("@/views/login/index.vue"),
}

const routes = [
  {
    path: "/",
    component: AppLayout,
    children: [...homeRouter, loginRouter],
  },
]

export default createRouter({
  routes: routes,
  history: createMemoryHistory(),
})
