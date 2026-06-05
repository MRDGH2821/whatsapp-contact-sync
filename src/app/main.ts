import { createSSRApp } from "vue";
import { createMemoryHistory, createRouter, createWebHistory, RouteLocationNormalized } from "vue-router";
import { isbot } from "isbot";
import { SessionStatus } from "@/contracts/api";
import { createGtag } from "vue-gtag";
import App from "./App.vue";
import "./style.css";
import "./index.css";
import { setEnforcePayments } from "./settings";
import { initWs } from "./services/ws";

const routes = [
  { path: "/", component: () => import("./pages/Home.vue") },
  { path: "/privacy", component: () => import("./pages/Privacy.vue") },
  { path: "/contribute", component: () => import("./pages/Contribute.vue") },
  { path: "/whatsapp", component: () => import("./pages/WhatsApp.vue") },
  { path: "/gauth", component: () => import("./pages/GoogleAuth.vue") },
  { path: "/options", component: () => import("./pages/Options.vue") },
  { path: "/sync", component: () => import("./pages/Sync.vue") },
];

export function createVueApp(url?: string) {
  const app = createSSRApp(App);
  const router = createRouter({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes,
  });
  app.use(router);
  if (!import.meta.env.SSR) {
    const gtag = createGtag({
      tagId: "G-4PJJZRPWG4",
      pageTracker: { router },
    });
    app.use(gtag);
  }
  router.beforeEach(async (to: RouteLocationNormalized) => {
    if (!import.meta.env.SSR) {
      initWs();
    }
    if (
      to.path === "/" ||
      (typeof navigator !== "undefined" && isbot(navigator.userAgent))
    ) {
      return;
    }

    const response = await fetch("/api/status", { credentials: "include" });
    const status: SessionStatus = await response.json();
    setEnforcePayments(status.enforcePayments);

    if (
      ["/whatsapp", "/sync", "/gauth", "/options"].includes(to.path) &&
      status.enforcePayments &&
      !status.purchased
    ) {
      return "/contribute";
    }
    if (to.path === "/contribute" && status.purchased) return "/whatsapp";
    if (
      ["/sync", "/gauth", "/options"].includes(to.path) &&
      !status.whatsappConnected
    ) {
      return "/";
    }
    if (to.path === "/sync" && !status.googleConnected) return "/gauth";
    if (to.path === "/whatsapp" && status.whatsappConnected) return "/gauth";
    if (to.path === "/gauth" && status.googleConnected) return "/options";
    return;
  });
  if (url) {
    router.push(url);
  }
  return { app, router };
}
