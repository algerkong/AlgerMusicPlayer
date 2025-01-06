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
    };
    $message:any
  }
}
