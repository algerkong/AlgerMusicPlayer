import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig({
  base: './',
  // 项目src
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
      '@renderer': resolve('src/renderer')
    }
  },
  plugins: [
    vue(),
    viteCompression(),
    VueDevTools(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
        }
      ]
    }),
    Components({
      resolvers: [NaiveUiResolver()]
    })
  ],
  publicDir: resolve('resources'),
  server: {
    host: '0.0.0.0',
    proxy: {
    }
  }
});
