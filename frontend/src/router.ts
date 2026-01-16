import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("./views/HomeView.vue"),
  },
  {
    path: "/encounter/:id",
    name: "encounter",
    component: () => import("./views/EncounterView.vue"),
  },
  {
    path: "/encounter/:id/edit",
    name: "encounter-edit",
    component: () => import("./views/EncounterEditView.vue"),
  },
  {
    path: "/sync/:sessionId",
    name: "sync",
    component: () => import("./views/SyncView.vue"),
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: () => import("./views/AuthCallbackView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
