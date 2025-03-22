export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  dragStart: (data: string) => void;
  miniTray: () => void;
  restart: () => void;
  openLyric: () => void;
  sendLyric: (data: string) => void;
  unblockMusic: (id: number) => Promise<string>;
  onLanguageChanged: (callback: (locale: string) => void) => void;
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
