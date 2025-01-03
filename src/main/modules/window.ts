import { BrowserWindow, shell, ipcMain, app, session } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';
import Store from 'electron-store';

const store = new Store();

/**
 * 初始化代理设置
 */
function initializeProxy() {
  const defaultConfig = {
    enable: false,
    protocol: 'http',
    host: '127.0.0.1',
    port: 7890
  };

  const proxyConfig = store.get('set.proxyConfig', defaultConfig) as {
    enable: boolean;
    protocol: string;
    host: string;
    port: number;
  };

  if (proxyConfig?.enable) {
    const proxyRules = `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`;
    session.defaultSession.setProxy({ proxyRules });
  } else {
    session.defaultSession.setProxy({ proxyRules: '' });
  }
}

/**
 * 初始化窗口管理相关的IPC监听
 */
export function initializeWindowManager() {
  // 初始化代理设置
  initializeProxy();

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
      app.quit();
    }
  });

  ipcMain.on('mini-tray', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.hide();
    }
  });

  // 监听代理设置变化
  store.onDidChange('set.proxyConfig', () => {
    initializeProxy();
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