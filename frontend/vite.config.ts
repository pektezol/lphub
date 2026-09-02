import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const apiTarget = mode === "backend-local"
        ? "http://localhost:4000"
        : "https://lp.portal2.sr";

    return {
        plugins: [react()],
        resolve: {
            alias: {
                "@api": path.resolve(__dirname, "./src/api"),
                "@components": path.resolve(__dirname, "./src/components"),
                "@css": path.resolve(__dirname, "./src/css"),
                "@fonts": path.resolve(__dirname, "./src/fonts"),
                "@hooks": path.resolve(__dirname, "./src/hooks"),
                "@images": path.resolve(__dirname, "./src/images"),
                "@pages": path.resolve(__dirname, "./src/pages"),
                "@customTypes": path.resolve(__dirname, "./src/types"),
                "@utils": path.resolve(__dirname, "./src/utils"),
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
