import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { index: resolve(__dirname, "electron/main.ts") } } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { index: resolve(__dirname, "electron/preload.ts") } } },
  },
  renderer: {
    root: resolve(__dirname, "src/ui"),
    // Serve the Remotion public dir in dev so the <Player> (preview + QA probe)
    // can load staticFile() media; NOT copied on build (182MB) — the built app
    // resolves these via main.ts's file-protocol fallback instead.
    publicDir: resolve(__dirname, "public"),
    resolve: { alias: { "@engine": resolve(__dirname, "src") } },
    plugins: [react()],
    build: { copyPublicDir: false, rollupOptions: { input: resolve(__dirname, "src/ui/index.html") } },
  },
});
