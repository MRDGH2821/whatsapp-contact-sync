import { renderToString } from "@vue/server-renderer";
import { createVueApp } from "@/app/main";

export async function render(url: string) {
  const { app, router } = createVueApp(url);
  await router.isReady();
  const appHtml = await renderToString(app);
  return { appHtml };
}
