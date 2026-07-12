export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  dragStart: (_data: string) => void;
  miniTray: () => void;
  restart: () => void;
  openLyric: () => void;
  sendLyric: (_data: string) => void;
  onLyricWindowClosed: (_callback: () => void) => void;
  onLyricWindowReady: (_callback: () => void) => void;
  onLanguageChanged: (_callback: (_locale: string) => void) => void;
  store: {
    get: (_key: string) => Promise<any>;
    set: (_key: string, _value: any) => Promise<boolean>;
    delete: (_key: string) => Promise<boolean>;
  };
  // Download manager
  downloadAdd: (_task: any) => Promise<string>;
  downloadAddBatch: (_tasks: any) => Promise<{ batchId: string; taskIds: string[] }>;
  downloadPause: (_taskId: string) => Promise<void>;
  downloadResume: (_taskId: string) => Promise<void>;
  downloadCancel: (_taskId: string) => Promise<void>;
  downloadCancelAll: () => Promise<void>;
  downloadGetQueue: () => Promise<any[]>;
  downloadSetConcurrency: (_n: number) => void;
  downloadGetCompleted: () => Promise<any[]>;
  downloadDeleteCompleted: (_filePath: string) => Promise<boolean>;
  downloadClearCompleted: () => Promise<boolean>;
  getEmbeddedLyrics: (_filePath: string) => Promise<string | null>;
  downloadProvideUrl: (_taskId: string, _url: string) => Promise<void>;
  onDownloadProgress: (_cb: (_data: any) => void) => void;
  onDownloadStateChange: (_cb: (_data: any) => void) => void;
  onDownloadBatchComplete: (_cb: (_data: any) => void) => void;
  onDownloadRequestUrl: (_cb: (_data: any) => void) => void;
  removeDownloadListeners: () => void;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
