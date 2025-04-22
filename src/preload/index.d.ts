import { ElectronAPI } from '@electron-toolkit/preload';

interface API {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  dragStart: (data: any) => void;
  miniTray: () => void;
  miniWindow: () => void;
  restore: () => void;
  restart: () => void;
  resizeWindow: (width: number, height: number) => void;
  resizeMiniWindow: (showPlaylist: boolean) => void;
  openLyric: () => void;
  sendLyric: (data: any) => void;
  sendSong: (data: any) => void;
  unblockMusic: (id: number, data: any, enabledSources?: string[]) => Promise<any>;
  onLyricWindowClosed: (callback: () => void) => void;
  startDownload: (url: string) => void;
  onDownloadProgress: (callback: (progress: number, status: string) => void) => void;
  onDownloadComplete: (callback: (success: boolean, filePath: string) => void) => void;
  onLanguageChanged: (callback: (locale: string) => void) => void;
  removeDownloadListeners: () => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

// 自定义IPC渲染进程通信接口
interface IpcRenderer {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
    ipcRenderer: IpcRenderer;
    $message: any;
  }
}
