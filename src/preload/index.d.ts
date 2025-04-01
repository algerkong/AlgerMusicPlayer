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
      miniWindow: () => void;
      restore: () => void;
      restart: () => void;
      resizeWindow: (width: number, height: number) => void;
      resizeMiniWindow: (showPlaylist: boolean) => void;
      unblockMusic: (id: number, data: any) => Promise<any>;
      onLyricWindowClosed: (callback: () => void) => void;
      startDownload: (url: string) => void;
      onDownloadProgress: (callback: (progress: number, status: string) => void) => void;
      onDownloadComplete: (callback: (success: boolean, filePath: string) => void) => void;
      removeDownloadListeners: () => void;
      onLanguageChanged: (callback: (locale: string) => void) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      sendSong: (data: any) => void;
    };
    $message: any;
  }
}
