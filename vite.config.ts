import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0", //允许本机
    proxy: {
      // string shorthand
      "/mt": {
        target: "http://mt.myalger.top",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mt/, ""),
      },
      // with options
      "/api": {
        target: "http://123.56.226.179:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
