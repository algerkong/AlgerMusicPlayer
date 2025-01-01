import { BrowserWindow, shell, ipcMain } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';

/**
 * 初始化窗口管理相关的IPC监听
 */
export function initializeWindowManager(mainWindow: BrowserWindow) {
  ipcMain.on('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.minimize();
    }
  });

  ipcMain.on('maximize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.destroy();
    }
  });

  ipcMain.on('mini-tray', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.hide();
    }
  });
}

/**
 * 创建主窗口
 */
export function createMainWindow(icon: Electron.NativeImage): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  });

  mainWindow.setMinimumSize(1200, 780);

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
} 