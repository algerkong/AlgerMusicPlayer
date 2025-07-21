import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';

// Custom APIs for renderer
const api = {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
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
  // 歌词窗口关闭事件
  onLyricWindowClosed: (callback: () => void) => {
    ipcRenderer.on('lyric-window-closed', () => callback());
  },
  // 更新相关
  startDownload: (url: string) => ipcRenderer.send('start-download', url),
  onDownloadProgress: (callback: (progress: number, status: string) => void) => {
    ipcRenderer.on('download-progress', (_event, progress, status) => callback(progress, status));
  },
  onDownloadComplete: (callback: (success: boolean, filePath: string) => void) => {
    ipcRenderer.on('download-complete', (_event, success, filePath) => callback(success, filePath));
  },
  // 语言相关
  onLanguageChanged: (callback: (locale: string) => void) => {
    ipcRenderer.on('language-changed', (_event, locale) => {
      callback(locale);
    });
  },
  removeDownloadListeners: () => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('download-complete');
  },
  // 歌词缓存相关
  invoke: (channel: string, ...args: any[]) => {
    const validChannels = [
      'get-lyrics',
      'clear-lyrics-cache',
      'get-system-fonts',
      'get-cached-lyric',
      'cache-lyric',
      'clear-lyric-cache'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`未授权的 IPC 通道: ${channel}`));
  }
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
    ipcRenderer.on(channel, (_, ...args) => listener(...args));
    return () => {
      ipcRenderer.removeListener(channel, listener);
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
