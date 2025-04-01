import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, globalShortcut, ipcMain, screen, session, shell } from 'electron';
import Store from 'electron-store';
import { join } from 'path';

const store = new Store();

// 保存主窗口的大小和位置
let mainWindowState = {
  width: 1200,
  height: 780,
  x: undefined as number | undefined,
  y: undefined as number | undefined,
  isMaximized: false
};

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

  ipcMain.on('mini-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      // 保存当前窗口状态
      const [width, height] = win.getSize();
      const [x, y] = win.getPosition();
      mainWindowState = {
        width,
        height,
        x,
        y,
        isMaximized: win.isMaximized()
      };

      // 获取屏幕尺寸
      const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

      // 设置迷你窗口的大小和位置
      win.unmaximize();
      win.setMinimumSize(340, 64);
      win.setMaximumSize(340, 64);
      win.setSize(340, 64);
      win.setPosition(screenWidth - 340, 20);
      win.setAlwaysOnTop(true);
      win.setSkipTaskbar(false);
      win.setResizable(false);

      // 导航到迷你模式路由
      win.webContents.send('navigate', '/mini');

      // 发送事件到渲染进程，通知切换到迷你模式
      win.webContents.send('mini-mode', true);
    }
  });

  // 恢复窗口
  ipcMain.on('restore-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      // 恢复窗口的大小调整功能
      win.setResizable(true);
      win.setMaximumSize(0, 0);

      // 恢复窗口的最小尺寸限制
      win.setMinimumSize(1200, 780);

      // 恢复窗口状态
      if (mainWindowState.isMaximized) {
        win.maximize();
      } else {
        win.setSize(mainWindowState.width, mainWindowState.height);
        if (mainWindowState.x !== undefined && mainWindowState.y !== undefined) {
          win.setPosition(mainWindowState.x, mainWindowState.y);
        }
      }

      win.setAlwaysOnTop(false);
      win.setSkipTaskbar(false);

      // 导航回主页面
      win.webContents.send('navigate', '/');

      // 发送事件到渲染进程，通知退出迷你模式
      win.webContents.send('mini-mode', false);
    }
  });

  // 监听代理设置变化
  store.onDidChange('set.proxyConfig', () => {
    initializeProxy();
  });

  // 监听窗口大小调整事件
  ipcMain.on('resize-window', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      // 设置窗口的大小
      console.log(`调整窗口大小: ${width} x ${height}`);
      win.setSize(width, height);
    }
  });

  // 专门用于迷你模式下调整窗口大小的事件
  ipcMain.on('resize-mini-window', (event, showPlaylist) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (showPlaylist) {
        console.log('主进程: 扩大迷你窗口至 340 x 400');
        // 调整最大尺寸限制，允许窗口变大
        win.setMinimumSize(340, 64);
        win.setMaximumSize(340, 400);
        // 调整窗口尺寸
        win.setSize(340, 400);
      } else {
        console.log('主进程: 缩小迷你窗口至 340 x 64');
        // 强制重置尺寸限制，确保窗口可以缩小
        win.setMaximumSize(340, 64);
        win.setMinimumSize(340, 64);
        // 调整窗口尺寸
        win.setSize(340, 64);
      }
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
      contextIsolation: true,
      webSecurity: false
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

    // 注册快捷键 打开开发者工具
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}
