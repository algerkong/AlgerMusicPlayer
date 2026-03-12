import { electronAPI } from '@electron-toolkit/preload';
import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

import type { AppUpdateState } from '../shared/appUpdate';

// Custom APIs for renderer
const api = {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  quitApp: () => ipcRenderer.send('quit-app'),
  dragStart: (data) => ipcRenderer.send('drag-start', data),
  miniTray: () => ipcRenderer.send('mini-tray'),
  miniWindow: () => ipcRenderer.send('mini-window'),
  restore: () => ipcRenderer.send('restore-window'),
  restart: () => ipcRenderer.send('restart'),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height),
  resizeMiniWindow: (showPlaylist) => ipcRenderer.send('resize-mini-window', showPlaylist),
  openLyric: () => ipcRenderer.send('open-lyric'),
  sendLyric: (data) => ipcRenderer.send('send-lyric', data),
  sendSong: (data) => ipcRenderer.send('update-current-song', data),
  unblockMusic: (id, data, enabledSources) =>
    ipcRenderer.invoke('unblock-music', id, data, enabledSources),
  importCustomApiPlugin: () => ipcRenderer.invoke('import-custom-api-plugin'),
  importLxMusicScript: () => ipcRenderer.invoke('import-lx-music-script'),
  // 歌词窗口关闭事件
  onLyricWindowClosed: (callback: () => void) => {
    ipcRenderer.on('lyric-window-closed', () => callback());
  },
  // 歌词窗口就绪事件（Vue 加载完成，可以接收数据）
  onLyricWindowReady: (callback: () => void) => {
    ipcRenderer.on('lyric-window-ready', () => callback());
  },
  getAppUpdateState: () => ipcRenderer.invoke('app-update:get-state') as Promise<AppUpdateState>,
  checkAppUpdate: (manual = false) =>
    ipcRenderer.invoke('app-update:check', { manual }) as Promise<AppUpdateState>,
  downloadAppUpdate: () => ipcRenderer.invoke('app-update:download') as Promise<AppUpdateState>,
  installAppUpdate: () => ipcRenderer.invoke('app-update:quit-and-install') as Promise<boolean>,
  openAppUpdatePage: () => ipcRenderer.invoke('app-update:open-release-page') as Promise<boolean>,
  onAppUpdateState: (callback: (state: AppUpdateState) => void) => {
    ipcRenderer.on('app-update:state', (_event, state: AppUpdateState) => callback(state));
  },
  removeAppUpdateListeners: () => {
    ipcRenderer.removeAllListeners('app-update:state');
  },
  // 语言相关
  onLanguageChanged: (callback: (locale: string) => void) => {
    ipcRenderer.on('language-changed', (_event, locale) => {
      callback(locale);
    });
  },
  // 歌词缓存相关
  invoke: (channel: string, ...args: any[]) => {
    const validChannels = [
      'get-lyrics',
      'clear-lyrics-cache',
      'get-system-fonts',
      'get-cached-lyric',
      'cache-lyric',
      'clear-lyric-cache',
      'scan-local-music',
      'scan-local-music-with-stats',
      'parse-local-music-metadata'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`未授权的 IPC 通道: ${channel}`));
  },
  // 搜索建议
  getSearchSuggestions: (keyword: string) => ipcRenderer.invoke('get-search-suggestions', keyword),

  // 落雪音乐 HTTP 请求（绕过 CORS）
  lxMusicHttpRequest: (request: { url: string; options: any; requestId: string }) =>
    ipcRenderer.invoke('lx-music-http-request', request),

  lxMusicHttpCancel: (requestId: string) => ipcRenderer.invoke('lx-music-http-cancel', requestId),

  // 本地音乐扫描相关
  scanLocalMusic: (folderPath: string) => ipcRenderer.invoke('scan-local-music', folderPath),
  scanLocalMusicWithStats: (folderPath: string) =>
    ipcRenderer.invoke('scan-local-music-with-stats', folderPath),
  parseLocalMusicMetadata: (filePaths: string[]) =>
    ipcRenderer.invoke('parse-local-music-metadata', filePaths)
};

// 创建带类型的ipcRenderer对象，暴露给渲染进程
const ipc = {
  // 发送消息到主进程（无返回值）
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
  // 调用主进程方法（有返回值）
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  // 监听主进程消息
  on: (channel: string, listener: (...args: any[]) => void) => {
    const wrappedListener = (_event: IpcRendererEvent, ...args: any[]) => listener(...args);
    ipcRenderer.on(channel, wrappedListener);
    return () => {
      ipcRenderer.removeListener(channel, wrappedListener);
    };
  },
  // 移除所有监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
    contextBridge.exposeInMainWorld('ipcRenderer', ipc);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
  // @ts-ignore (define in dts)
  window.ipcRenderer = ipc;
}
