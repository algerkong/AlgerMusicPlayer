import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

import type { AppUpdateState } from '../shared/appUpdate';

/** 音源 IPC 白名单（禁止任意 channel） */
const MUSIC_SOURCE_CHANNELS = [
  'music-source:get-auth-state',
  'music-source:import-cookie',
  'music-source:logout',
  'music-source:get-profile',
  'music-source:search-songs',
  'music-source:search-playlists',
  'music-source:search-albums',
  'music-source:search-artists',
  'music-source:search-suggestions',
  'music-source:list-user-playlists',
  'music-source:get-playlist',
  'music-source:resolve',
  'music-source:get-lyric'
] as const;

type MusicSourceChannel = (typeof MUSIC_SOURCE_CHANNELS)[number];

function isMusicSourceChannel(channel: string): channel is MusicSourceChannel {
  return (MUSIC_SOURCE_CHANNELS as readonly string[]).includes(channel);
}

/** 订阅主进程事件，返回取消订阅函数 */
function onChannel(channel: string, callback: (...args: any[]) => void): () => void {
  const wrapped = (_event: IpcRendererEvent, ...args: any[]) => callback(...args);
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

// 仅暴露按业务命名的 API，禁止通用任意 channel IPC
const api = {
  // —— 窗口 ——
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  quitApp: () => ipcRenderer.send('quit-app'),
  dragStart: (data: unknown) => ipcRenderer.send('drag-start', data),
  miniTray: () => ipcRenderer.send('mini-tray'),
  miniWindow: () => ipcRenderer.send('mini-window'),
  restore: () => ipcRenderer.send('restore-window'),
  restart: () => ipcRenderer.send('restart'),
  resizeWindow: (width: number, height: number) => ipcRenderer.send('resize-window', width, height),
  resizeMiniWindow: (showPlaylist: boolean) => ipcRenderer.send('resize-mini-window', showPlaylist),

  // —— 平台（preload 直读，无 IPC）——
  getPlatform: (): NodeJS.Platform => process.platform,

  // —— 应用设置（字段白名单，禁止任意 key 读写 store）——
  getSettings: () => ipcRenderer.sendSync('settings:get') as Record<string, unknown>,
  setSettings: (partial: Record<string, unknown>) =>
    ipcRenderer.sendSync('settings:set', partial) as Record<string, unknown>,

  // —— 语言 ——
  changeLanguage: (locale: string) => ipcRenderer.send('change-language', locale),
  onLanguageChanged: (callback: (locale: string) => void) =>
    onChannel('language-changed', callback),

  // —— 桌面歌词 ——
  openLyric: () => ipcRenderer.send('open-lyric'),
  closeLyric: () => ipcRenderer.send('close-lyric'),
  sendLyric: (data: unknown) => ipcRenderer.send('send-lyric', data),
  sendSong: (data: unknown) => ipcRenderer.send('update-current-song', data),
  lyricReady: () => ipcRenderer.send('lyric-ready'),
  setIgnoreMouse: (shouldIgnore: boolean) => ipcRenderer.send('set-ignore-mouse', shouldIgnore),
  setLyricLockState: (isLocked: boolean) => ipcRenderer.send('set-lyric-lock-state', isLocked),
  lyricDragStart: () => ipcRenderer.send('lyric-drag-start'),
  lyricDragMove: (payload: { deltaX: number; deltaY: number }) =>
    ipcRenderer.send('lyric-drag-move', payload),
  lyricDragEnd: () => ipcRenderer.send('lyric-drag-end'),
  controlBack: (command: string) => ipcRenderer.send('control-back', command),
  onLyricWindowClosed: (callback: () => void) => onChannel('lyric-window-closed', callback),
  onLyricWindowReady: (callback: () => void) => onChannel('lyric-window-ready', callback),
  onReceiveLyric: (callback: (data: string) => void) => onChannel('receive-lyric', callback),
  onLyricMousePresence: (callback: (isInside: boolean) => void) =>
    onChannel('lyric-mouse-presence', callback),
  onLyricControlBack: (callback: (command: string) => void) =>
    onChannel('lyric-control-back', callback),

  // —— 应用更新 ——
  getAppUpdateState: () => ipcRenderer.invoke('app-update:get-state') as Promise<AppUpdateState>,
  checkAppUpdate: (manual = false) =>
    ipcRenderer.invoke('app-update:check', { manual }) as Promise<AppUpdateState>,
  downloadAppUpdate: () => ipcRenderer.invoke('app-update:download') as Promise<AppUpdateState>,
  installAppUpdate: () => ipcRenderer.invoke('app-update:quit-and-install') as Promise<boolean>,
  openAppUpdatePage: () => ipcRenderer.invoke('app-update:open-release-page') as Promise<boolean>,
  onAppUpdateState: (callback: (state: AppUpdateState) => void) =>
    onChannel('app-update:state', callback),
  removeAppUpdateListeners: () => {
    ipcRenderer.removeAllListeners('app-update:state');
  },

  // —— 歌词/音频缓存 ——
  getCachedLyric: (id: string | number) => ipcRenderer.invoke('get-cached-lyric', id),
  cacheLyric: (id: string | number, lyricData: unknown) =>
    ipcRenderer.invoke('cache-lyric', id, lyricData),
  resolveCachedMusicUrl: (payload: unknown) =>
    ipcRenderer.invoke('resolve-cached-music-url', payload),
  getDiskCacheStats: () => ipcRenderer.invoke('get-disk-cache-stats'),
  setDiskCacheConfig: (partial: unknown) => ipcRenderer.invoke('set-disk-cache-config', partial),
  getSystemFonts: () => ipcRenderer.invoke('get-system-fonts'),

  // —— 文件 ——
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openDirectory: (filePath: string) => ipcRenderer.send('open-directory', filePath),
  checkFileExists: (filePath: string) => ipcRenderer.invoke('check-file-exists', filePath),
  getDownloadsPath: () => ipcRenderer.invoke('get-downloads-path') as Promise<string>,
  saveLyricFile: (payload: { filename: string; lrcContent: string }) =>
    ipcRenderer.invoke('save-lyric-file', payload),

  // —— 缩放 ——
  getContentZoom: () => ipcRenderer.invoke('get-content-zoom') as Promise<number>,
  setContentZoom: (zoom: number) => ipcRenderer.send('set-content-zoom', zoom),

  // —— 播放状态 / MPRIS / 托盘歌词 ——
  updatePlayState: (playing: boolean) => ipcRenderer.send('update-play-state', playing),
  mprisPositionUpdate: (position: number) => ipcRenderer.send('mpris-position-update', position),
  trayLyricUpdate: (data: unknown) => ipcRenderer.send('tray-lyric-update', data),
  onMprisSeek: (callback: (position: number) => void) => onChannel('mpris-seek', callback),
  onMprisSetPosition: (callback: (position: number) => void) =>
    onChannel('mpris-set-position', callback),
  onMprisPlay: (callback: () => void) => onChannel('mpris-play', callback),
  onMprisPause: (callback: () => void) => onChannel('mpris-pause', callback),

  // —— 快捷键 ——
  getShortcutsConfig: () => ipcRenderer.invoke('shortcuts:get-config'),
  saveShortcuts: (config: unknown) => ipcRenderer.invoke('shortcuts:save', config),
  disableShortcuts: () => ipcRenderer.send('disable-shortcuts'),
  enableShortcuts: () => ipcRenderer.send('enable-shortcuts'),
  onGlobalShortcut: (callback: (action: string) => void) => onChannel('global-shortcut', callback),
  onUpdateAppShortcuts: (callback: (shortcuts: unknown) => void) =>
    onChannel('update-app-shortcuts', callback),

  // —— 通知（主进程若未注册则静默无效）——
  showNotification: (payload: { title: string; body: string }) =>
    ipcRenderer.send('show-notification', payload),

  // —— 音源（白名单 channel）——
  musicSourceInvoke: (channel: string, ...args: unknown[]) => {
    if (!isMusicSourceChannel(channel)) {
      return Promise.reject(new Error(`未授权的音源 IPC 通道: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  // —— 下载管理 ——
  downloadAdd: (task: unknown) => ipcRenderer.invoke('download:add', task),
  downloadAddBatch: (tasks: unknown) => ipcRenderer.invoke('download:add-batch', tasks),
  downloadPause: (taskId: string) => ipcRenderer.invoke('download:pause', taskId),
  downloadResume: (taskId: string) => ipcRenderer.invoke('download:resume', taskId),
  downloadCancel: (taskId: string) => ipcRenderer.invoke('download:cancel', taskId),
  downloadCancelAll: () => ipcRenderer.invoke('download:cancel-all'),
  downloadGetQueue: () => ipcRenderer.invoke('download:get-queue'),
  downloadSetConcurrency: (n: number) => ipcRenderer.send('download:set-concurrency', n),
  downloadGetCompleted: () => ipcRenderer.invoke('download:get-completed'),
  downloadDeleteCompleted: (filePath: string) =>
    ipcRenderer.invoke('download:delete-completed', filePath),
  downloadClearCompleted: () => ipcRenderer.invoke('download:clear-completed'),
  getEmbeddedLyrics: (filePath: string) =>
    ipcRenderer.invoke('download:get-embedded-lyrics', filePath),
  downloadProvideUrl: (taskId: string, url: string) =>
    ipcRenderer.invoke('download:provide-url', { taskId, url }),
  onDownloadProgress: (cb: (data: unknown) => void) => {
    onChannel('download:progress', cb);
  },
  onDownloadStateChange: (cb: (data: unknown) => void) => {
    onChannel('download:state-change', cb);
  },
  onDownloadBatchComplete: (cb: (data: unknown) => void) => {
    onChannel('download:batch-complete', cb);
  },
  onDownloadRequestUrl: (cb: (data: unknown) => void) => {
    onChannel('download:request-url', cb);
  },
  removeDownloadListeners: () => {
    ipcRenderer.removeAllListeners('download:progress');
    ipcRenderer.removeAllListeners('download:state-change');
    ipcRenderer.removeAllListeners('download:batch-complete');
    ipcRenderer.removeAllListeners('download:request-url');
  }
};

if (process.contextIsolated) {
  try {
    // 不再暴露完整 electronAPI / 任意 channel 的 ipcRenderer
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api;
}
