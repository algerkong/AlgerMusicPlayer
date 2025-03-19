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
    server: {
      proxy: {
        // with options
        [process.env.VITE_API_LOCAL as string]: {
          target: process.env.VITE_API,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${process.env.VITE_API_LOCAL}`), '')
        },
        [process.env.VITE_API_MUSIC_PROXY as string]: {
          target: process.env.VITE_API_MUSIC,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${process.env.VITE_API_MUSIC_PROXY}`), '')
        },
        [process.env.VITE_API_PROXY_MUSIC as string]: {
          target: process.env.VITE_API_PROXY,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${process.env.VITE_API_PROXY_MUSIC}`), '')
        }
      }
    }
  }
});
