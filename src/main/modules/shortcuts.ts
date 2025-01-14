import { globalShortcut, ipcMain } from 'electron';

import { getStore } from './config';

// 添加获取平台信息的 IPC 处理程序
ipcMain.on('get-platform', (event) => {
  event.returnValue = process.platform;
});

// 定义默认快捷键
export const defaultShortcuts = {
  togglePlay: 'CommandOrControl+Alt+P',
  prevPlay: 'CommandOrControl+Alt+Left',
  nextPlay: 'CommandOrControl+Alt+Right',
  volumeUp: 'CommandOrControl+Alt+Up',
  volumeDown: 'CommandOrControl+Alt+Down',
  toggleFavorite: 'CommandOrControl+Alt+L',
  toggleWindow: 'CommandOrControl+Alt+Shift+M'
};

let mainWindowRef: Electron.BrowserWindow | null = null;

// 注册快捷键
export function registerShortcuts(mainWindow: Electron.BrowserWindow) {
  mainWindowRef = mainWindow;
  const store = getStore();
  const shortcuts = store.get('shortcuts');

  // 注销所有已注册的快捷键
  globalShortcut.unregisterAll();

  // 显示/隐藏主窗口
  globalShortcut.register(shortcuts.toggleWindow, () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  // 播放/暂停
  globalShortcut.register(shortcuts.togglePlay, () => {
    mainWindow.webContents.send('global-shortcut', 'togglePlay');
  });

  // 上一首
  globalShortcut.register(shortcuts.prevPlay, () => {
    mainWindow.webContents.send('global-shortcut', 'prevPlay');
  });

  // 下一首
  globalShortcut.register(shortcuts.nextPlay, () => {
    mainWindow.webContents.send('global-shortcut', 'nextPlay');
  });

  // 音量增加
  globalShortcut.register(shortcuts.volumeUp, () => {
    mainWindow.webContents.send('global-shortcut', 'volumeUp');
  });

  // 音量减少
  globalShortcut.register(shortcuts.volumeDown, () => {
    mainWindow.webContents.send('global-shortcut', 'volumeDown');
  });

  // 收藏当前歌曲
  globalShortcut.register(shortcuts.toggleFavorite, () => {
    mainWindow.webContents.send('global-shortcut', 'toggleFavorite');
  });
}

// 初始化快捷键
export function initializeShortcuts(mainWindow: Electron.BrowserWindow) {
  mainWindowRef = mainWindow;
  registerShortcuts(mainWindow);

  // 监听禁用快捷键事件
  ipcMain.on('disable-shortcuts', () => {
    globalShortcut.unregisterAll();
  });

  // 监听启用快捷键事件
  ipcMain.on('enable-shortcuts', () => {
    if (mainWindowRef) {
      registerShortcuts(mainWindowRef);
    }
  });
}
