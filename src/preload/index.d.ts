import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      sendLyric: (data: string) => void;
      openLyric: () => void;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      dragStart: (data: string) => void;
      miniTray: () => void;
      restart: () => void;
      unblockMusic: (id: number, data: any) => Promise<any>;
      onLyricWindowClosed: (callback: () => void) => void;
      startDownload: (url: string) => void;
      onDownloadProgress: (callback: (progress: number, status: string) => void) => void;
      onDownloadComplete: (callback: (success: boolean, filePath: string) => void) => void;
      removeDownloadListeners: () => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
    $message: any;
  }
}
