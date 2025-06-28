import { electronApp, optimizer } from '@electron-toolkit/utils';
import { app, ipcMain, nativeImage } from 'electron';
import { join } from 'path';

import type { Language } from '../i18n/main';
import i18n from '../i18n/main';
import { loadLyricWindow } from './lyric';
import { initializeConfig } from './modules/config';
import { initializeFileManager } from './modules/fileManager';
import { initializeFonts } from './modules/fonts';
import { initializeRemoteControl } from './modules/remoteControl';
import { initializeShortcuts, registerShortcuts } from './modules/shortcuts';
import { initializeStats, setupStatsHandlers } from './modules/statsService';
import { initializeTray, updateCurrentSong, updatePlayState, updateTrayMenu } from './modules/tray';
import { setupUpdateHandlers } from './modules/update';
import { createMainWindow, initializeWindowManager } from './modules/window';
import { startMusicApi } from './server';
import { initWindowSizeManager } from './modules/window-size';
import { MCPServer } from './mcp';

// 导入所有图标
const iconPath = join(__dirname, '../../resources');
const icon = nativeImage.createFromPath(
  process.platform === 'darwin'
    ? join(iconPath, 'icon.icns')
    : join(iconPath, 'icon.png')
);

let mainWindow: Electron.BrowserWindow | null = null;
let mcpServer: MCPServer | null = null;

// 初始化应用
function initialize() {
  // 初始化配置管理
  const store = initializeConfig();

  // 设置初始语言
  const savedLanguage = store.get('set.language') as Language;
  if (savedLanguage) {
    i18n.global.locale = savedLanguage;
  }

  // 初始化文件管理
  initializeFileManager();
  // 初始化窗口管理
  initializeWindowManager();
  // 初始化字体管理
  initializeFonts();

  // 创建主窗口
  const newMainWindow = createMainWindow(icon);
  
  // 初始化MCP服务器和其他模块
  mcpServer = new MCPServer(newMainWindow);
  initializeTray(iconPath, newMainWindow);
  initializeStats();
  setupStatsHandlers(ipcMain);
  startMusicApi();
  loadLyricWindow(ipcMain, newMainWindow);
  initializeShortcuts(newMainWindow);
  initializeRemoteControl(newMainWindow);
  setupUpdateHandlers(newMainWindow);

  // 赋值给全局变量并设置关闭事件
  mainWindow = newMainWindow;
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 设置MCP相关的IPC处理程序
function setupMCPHandlers() {
  const mcpConfig = { port: 3001, host: 'localhost' };

  ipcMain.handle('start-mcp-server', async () => {
    try {
      if (mcpServer) {
        await mcpServer.start(mcpConfig.port, mcpConfig.host);
        return { success: true, message: 'MCP服务器启动成功' };
      }
      return { success: false, message: 'MCP服务器未初始化' };
    } catch (error) {
      console.error('启动MCP服务器失败:', error);
      return { success: false, error: error instanceof Error ? error.message : '未知错误' };
    }
  });

  ipcMain.handle('stop-mcp-server', async () => {
    try {
      if (mcpServer) {
        await mcpServer.stop();
        return { success: true, message: 'MCP服务器已停止' };
      }
      return { success: false, message: 'MCP服务器未初始化' };
    } catch (error) {
      console.error('停止MCP服务器失败:', error);
      return { success: false, error: error instanceof Error ? error.message : '未知错误' };
    }
  });

  ipcMain.handle('get-mcp-server-status', async () => {
    // 这个将来可以扩展为返回更详细的状态
    return { success: true, running: mcpServer !== null };
  });
}

// 检查是否为第一个实例
const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  app.quit();
} else {
  // 当第二个实例启动时，将焦点转移到第一个实例的窗口
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 应用程序准备就绪时的处理
  app.whenReady().then(() => {
    // 设置应用ID
    electronApp.setAppUserModelId('com.alger.music');

    // 监听窗口创建事件
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // 初始化窗口大小管理器
    initWindowSizeManager();

    // 设置MCP相关的IPC处理程序
    setupMCPHandlers();

    // 初始化应用
    initialize();

    // macOS 激活应用时的处理
    app.on('activate', () => {
      if (mainWindow === null) initialize();
    });
  });

  // 监听快捷键更新
  ipcMain.on('update-shortcuts', () => {
    registerShortcuts(mainWindow);
  });

  // 监听语言切换
  ipcMain.on('change-language', (_, locale: Language) => {
    // 更新主进程的语言设置
    i18n.global.locale = locale;
    // 更新托盘菜单
    updateTrayMenu(mainWindow);
    // 通知所有窗口语言已更改
    mainWindow?.webContents.send('language-changed', locale);
  });

  // 监听播放状态变化
  ipcMain.on('update-play-state', (_, playing: boolean) => {
    updatePlayState(playing);
  });

  // 监听当前歌曲变化
  ipcMain.on('update-current-song', (_, song: any) => {
    updateCurrentSong(song);
  });

  // 所有窗口关闭时的处理
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 应用退出前的清理
  app.on('before-quit', async (event) => {
    event.preventDefault(); // 阻止立即退出
    try {
      if (mcpServer) {
        await mcpServer.stop();
        console.log('应用退出前MCP服务器已关闭');
      }
    } catch (error) {
      console.error('关闭MCP服务器失败:', error);
    } finally {
      app.exit(); // 完成清理后退出
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
}
