import { createVueApp } from "@/app/main";

const { app, router } = createVueApp();
router.isReady().then(() => {
  app.mount("#app", true);
});
