import vue from '@vitejs/plugin-vue';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@renderer': resolve('src/renderer'),
        '@i18n': resolve('src/i18n')
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
        '/kugou': {
          target: 'http://msearchcdn.kugou.com', // 目标服务器地址
          changeOrigin: true, // 必须设置为 true
          rewrite: (path) => path.replace(/^\/kugou/, '') // 重写请求路径，去掉 /kugou 前缀
        }
      }
    }
  }
});
