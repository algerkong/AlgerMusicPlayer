import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'electron-vite';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig({
  main: {},
  preload: {},
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
    build: {
      rollupOptions: {
        output: {
          // 全部代码打到 entry chunk，避免 Vite 默认按共享依赖拆分时
          // 与 store/index.ts 的 `export *` 形成 chunk 间循环引用，
          // 触发生产构建里的 TDZ（dev 不分包不会暴露此问题）。
          // Electron 桌面端本地加载，无 CDN/首屏体积顾虑，单 chunk 合算。
          manualChunks: () => 'index'
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: 2389
    }
  }
});
