import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const apiTarget =
    mode === "backend-local"
      ? "http://localhost:4000"
      : "https://lp.portal2.sr";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@api": path.resolve(import.meta.dirname, "./src/api"),
        "@components": path.resolve(import.meta.dirname, "./src/components"),
        "@css": path.resolve(import.meta.dirname, "./src/css"),
        "@fonts": path.resolve(import.meta.dirname, "./src/fonts"),
        "@hooks": path.resolve(import.meta.dirname, "./src/hooks"),
        "@images": path.resolve(import.meta.dirname, "./src/images"),
        "@pages": path.resolve(import.meta.dirname, "./src/pages"),
        "@customTypes": path.resolve(import.meta.dirname, "./src/types"),
        "@utils": path.resolve(import.meta.dirname, "./src/utils"),
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "build",
    },
  };
});
