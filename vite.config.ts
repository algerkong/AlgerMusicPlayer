import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import VueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VueDevTools(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': [
            'useDialog',
            'useMessage',
            'useNotification',
            'useLoadingBar',
          ],
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
    host: '0.0.0.0', //允许本机
    // 指定端口
    port: 4678,
    proxy: {
      // string shorthand
      '/mt': {
        target: 'http://mt.myalger.top',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mt/, ''),
      },
      // with options
      '/api': {
        target: 'http://110.42.251.190:9898',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/music': {
        target: 'http://110.42.251.190:4100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/music/, ''),
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
})
