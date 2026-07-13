import type { AppUpdateState } from '../shared/appUpdate';

interface API {
  // 窗口
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  quitApp: () => void;
  dragStart: (data: any) => void;
  miniTray: () => void;
  miniWindow: () => void;
  restore: () => void;
  restart: () => void;
  resizeWindow: (width: number, height: number) => void;
  resizeMiniWindow: (showPlaylist: boolean) => void;

  // 平台
  getPlatform: () => NodeJS.Platform;

  // 配置 store
  getStoreValue: (key: string) => any;
  setStoreValue: (key: string, value: any) => void;

  // 语言
  changeLanguage: (locale: string) => void;
  onLanguageChanged: (callback: (locale: string) => void) => () => void;

  // 桌面歌词
  openLyric: () => void;
  closeLyric: () => void;
  sendLyric: (data: any) => void;
  sendSong: (data: any) => void;
  lyricReady: () => void;
  setIgnoreMouse: (shouldIgnore: boolean) => void;
  setLyricLockState: (isLocked: boolean) => void;
  lyricDragStart: () => void;
  lyricDragMove: (payload: { deltaX: number; deltaY: number }) => void;
  lyricDragEnd: () => void;
  controlBack: (command: string) => void;
  onLyricWindowClosed: (callback: () => void) => () => void;
  onLyricWindowReady: (callback: () => void) => () => void;
  onReceiveLyric: (callback: (data: string) => void) => () => void;
  onLyricMousePresence: (callback: (isInside: boolean) => void) => () => void;
  onLyricControlBack: (callback: (command: string) => void) => () => void;

  // 应用更新
  getAppUpdateState: () => Promise<AppUpdateState>;
  checkAppUpdate: (manual?: boolean) => Promise<AppUpdateState>;
  downloadAppUpdate: () => Promise<AppUpdateState>;
  installAppUpdate: () => Promise<boolean>;
  openAppUpdatePage: () => Promise<boolean>;
  onAppUpdateState: (callback: (state: AppUpdateState) => void) => () => void;
  removeAppUpdateListeners: () => void;

  // 歌词/音频缓存
  getCachedLyric: (id: string | number) => Promise<any>;
  cacheLyric: (id: string | number, lyricData: unknown) => Promise<any>;
  resolveCachedMusicUrl: (payload: unknown) => Promise<any>;
  getDiskCacheStats: () => Promise<any>;
  setDiskCacheConfig: (partial: unknown) => Promise<any>;
  getSystemFonts: () => Promise<string[]>;

  // 文件
  selectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  openDirectory: (filePath: string) => void;
  checkFileExists: (filePath: string) => Promise<boolean>;
  getDownloadsPath: () => Promise<string>;
  saveLyricFile: (payload: {
    filename: string;
    lrcContent: string;
  }) => Promise<{ success: boolean; path?: string; error?: string }>;

  // 缩放
  getContentZoom: () => Promise<number>;
  setContentZoom: (zoom: number) => void;

  // 播放状态 / MPRIS / 托盘
  updatePlayState: (playing: boolean) => void;
  mprisPositionUpdate: (position: number) => void;
  trayLyricUpdate: (data: unknown) => void;
  onMprisSeek: (callback: (position: number) => void) => () => void;
  onMprisSetPosition: (callback: (position: number) => void) => () => void;
  onMprisPlay: (callback: () => void) => () => void;
  onMprisPause: (callback: () => void) => () => void;

  // 远程控制
  getLocalIpAddresses: () => Promise<string[]>;
  getRemoteControlConfig: () => Promise<any>;
  updateRemoteControlConfig: (config: unknown) => void;

  // 快捷键
  getShortcutsConfig: () => Promise<any>;
  saveShortcuts: (config: unknown) => Promise<any>;
  disableShortcuts: () => void;
  enableShortcuts: () => void;
  onGlobalShortcut: (callback: (action: string) => void) => () => void;
  onUpdateAppShortcuts: (callback: (shortcuts: unknown) => void) => () => void;

  // 通知
  showNotification: (payload: { title: string; body: string }) => void;

  // 音源（白名单 channel）
  musicSourceInvoke: (channel: string, ...args: unknown[]) => Promise<any>;

  // 下载管理
  downloadAdd: (task: any) => Promise<string>;
  downloadAddBatch: (tasks: any) => Promise<{ batchId: string; taskIds: string[] }>;
  downloadPause: (taskId: string) => Promise<void>;
  downloadResume: (taskId: string) => Promise<void>;
  downloadCancel: (taskId: string) => Promise<void>;
  downloadCancelAll: () => Promise<void>;
  downloadGetQueue: () => Promise<any[]>;
  downloadSetConcurrency: (n: number) => void;
  downloadGetCompleted: () => Promise<any[]>;
  downloadDeleteCompleted: (filePath: string) => Promise<boolean>;
  downloadClearCompleted: () => Promise<boolean>;
  getEmbeddedLyrics: (filePath: string) => Promise<string | null>;
  downloadProvideUrl: (taskId: string, url: string) => Promise<void>;
  onDownloadProgress: (cb: (data: any) => void) => void;
  onDownloadStateChange: (cb: (data: any) => void) => void;
  onDownloadBatchComplete: (cb: (data: any) => void) => void;
  onDownloadRequestUrl: (cb: (data: any) => void) => void;
  removeDownloadListeners: () => void;
}

declare global {
  interface Window {
    api: API;
    $message: any;
  }
}

export {};
