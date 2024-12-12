import vue from '@vitejs/plugin-vue';
import path from 'path';
// import VueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    vue(),
    viteCompression(),
    // VueDevTools(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
        },
      ],
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    // 指定端口
    port: 4488,
    proxy: {
      // with options
      [process.env.VITE_API_LOCAL as string]: {
        target: process.env.VITE_API,
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${process.env.VITE_API_LOCAL}`), ''),
      },
      [process.env.VITE_API_MUSIC_PROXY as string]: {
        target: process.env.VITE_API_MUSIC,
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${process.env.VITE_API_MUSIC_PROXY}`), ''),
      },
      [process.env.VITE_API_PROXY_MUSIC as string]: {
        target: process.env.VITE_API_PROXY,
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${process.env.VITE_API_PROXY_MUSIC}`), ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'axios'],
          naiveui: ['naive-ui'],
          lodash: ['lodash'],
        },
      },
    },
  },
});
