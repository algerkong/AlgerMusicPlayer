import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import VueDevTools from 'vite-plugin-vue-devtools'
// const { vitePluginElectronBuilder } = require('vite-plugin-electron-builder')
import vitePluginElectronBuilder from 'vite-plugin-electron-builder'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VueDevTools(),
    vitePluginElectronBuilder({
      mainProcessFile: 'app/main.js',
      preloadDir: 'app/utils',
      builderOptions: {
        appId: 'com.alger.music',
        directories: {
          output: 'dist_electron',
        },
        files: ['dist/**/*', 'node_modules/**/*', 'package.json'],
        win: {
          icon: 'public/icon.ico',
          target: 'nsis',
        },
      },
    }),
  ],
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
        target: 'http://myalger.top:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/music/, ''),
      },
    },
  },
})
