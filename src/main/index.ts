import { electronApp, optimizer } from '@electron-toolkit/utils';
import { app, globalShortcut, ipcMain, nativeImage } from 'electron';
import { join } from 'path';

import { loadLyricWindow } from './lyric';
import { initializeCacheManager } from './modules/cache';
import { initializeConfig } from './modules/config';
import { initializeFileManager } from './modules/fileManager';
import { initializeTray } from './modules/tray';
import { createMainWindow, initializeWindowManager } from './modules/window';
import { startMusicApi } from './server';

// 导入所有图标
const iconPath = join(__dirname, '../../resources');
const icon = nativeImage.createFromPath(
  process.platform === 'darwin'
    ? join(iconPath, 'icon.icns')
    : process.platform === 'win32'
      ? join(iconPath, 'favicon.ico')
      : join(iconPath, 'icon.png')
);

let mainWindow: Electron.BrowserWindow;

// 初始化应用
function initialize() {
  // 初始化配置管理
  initializeConfig();
  // 初始化缓存管理
  initializeCacheManager();
  // 初始化文件管理
  initializeFileManager();
  // 初始化窗口管理
  initializeWindowManager();

  // 创建主窗口
  mainWindow = createMainWindow(icon);

  // 初始化托盘
  initializeTray(iconPath, mainWindow);

  // 启动音乐API
  startMusicApi();

  // 加载歌词窗口
  loadLyricWindow(ipcMain, mainWindow);
}

// 应用程序准备就绪时的处理
app.whenReady().then(() => {
  // 设置应用ID
  electronApp.setAppUserModelId('com.alger.music');

  // 监听窗口创建事件
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // 初始化应用
  initialize();

  // macOS 激活应用时的处理
  app.on('activate', function () {
    if (mainWindow === null) initialize();
  });
});

// 应用程序准备就绪后的快捷键设置
app.on('ready', () => {
  globalShortcut.register('CommandOrControl+Alt+Shift+M', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
});

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 重启应用
ipcMain.on('restart', () => {
  app.relaunch();
  app.exit(0);
});

// 获取系统架构信息
ipcMain.on('get-arch', (event) => {
  event.returnValue = process.arch;
});
