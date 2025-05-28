import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, globalShortcut, ipcMain, screen, session, shell } from 'electron';
import Store from 'electron-store';
import windowStateKeeper from 'electron-window-state';
import { join } from 'path';

const store = new Store();

// 默认窗口尺寸
const DEFAULT_MAIN_WIDTH = 1200;
const DEFAULT_MAIN_HEIGHT = 780;
const DEFAULT_MINI_WIDTH = 340;
const DEFAULT_MINI_HEIGHT = 64;
const DEFAULT_MINI_EXPANDED_HEIGHT = 400;

// 保存主窗口引用，以便在 activate 事件中使用
let mainWindowInstance: BrowserWindow | null = null;

// 保存迷你模式前的窗口状态
let preMiniModeState = {
  width: DEFAULT_MAIN_WIDTH,
  height: DEFAULT_MAIN_HEIGHT,
  x: undefined as number | undefined,
  y: undefined as number | undefined,
  isMaximized: false
};

/**
 * 计算适合当前缩放比的缩放因子
 * @returns 适合当前系统的页面缩放因子
 */
function calculateContentZoomFactor(): number {
  // 获取系统的缩放因子
  const { scaleFactor } = screen.getPrimaryDisplay();
  
  // 缩放因子默认为1
  let zoomFactor = 1;
  
  // 只在高DPI情况下调整
  if (scaleFactor > 1) {
    // 自定义逻辑来根据不同的缩放比例进行调整
    if (scaleFactor >= 2.5) {
      // 极高缩放比，例如4K屏幕用200%+缩放
      zoomFactor = 0.7;
    } else if (scaleFactor >= 2) {
      // 高缩放比，例如200%
      zoomFactor = 0.8;
    } else if (scaleFactor >= 1.5) {
      // 中等缩放比，例如150%
      zoomFactor = 0.85;
    } else if (scaleFactor > 1.25) {
      // 略高缩放比，例如125%-149%
      zoomFactor = 0.9;
    } else {
      // 低缩放比，不做调整
      zoomFactor = 1;
    }
  }
  
  // 获取用户的自定义缩放设置（如果有）
  const userZoomFactor = store.get('set.contentZoomFactor') as number | undefined;
  if (userZoomFactor) {
    zoomFactor = userZoomFactor;
  }
  
  return zoomFactor;
}

/**
 * 应用页面内容缩放
 * @param window 目标窗口
 */
function applyContentZoom(window: BrowserWindow): void {
  const zoomFactor = calculateContentZoomFactor();
  window.webContents.setZoomFactor(zoomFactor);
  console.log(`应用页面缩放因子: ${zoomFactor}, 系统缩放比: ${screen.getPrimaryDisplay().scaleFactor}`);
}

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
      // 保存当前窗口状态，以便之后恢复
      const [width, height] = win.getSize();
      const [x, y] = win.getPosition();
      preMiniModeState = {
        width,
        height,
        x,
        y,
        isMaximized: win.isMaximized()
      };

      // 获取屏幕工作区尺寸
      const display = screen.getDisplayMatching(win.getBounds());
      const { width: screenWidth, x: screenX } = display.workArea;
      
      // 设置迷你窗口的大小和位置
      win.unmaximize();
      win.setMinimumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
      win.setMaximumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
      win.setSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
      // 将迷你窗口放在工作区的右上角，留出一些边距
      win.setPosition(screenX + screenWidth - DEFAULT_MINI_WIDTH - 20, display.workArea.y + 20);
      win.setAlwaysOnTop(true);
      win.setSkipTaskbar(false);
      win.setResizable(false);

      // 导航到迷你模式路由
      win.webContents.send('navigate', '/mini');

      // 发送事件到渲染进程，通知切换到迷你模式
      win.webContents.send('mini-mode', true);
      
      // 迷你窗口使用默认的缩放比
      win.webContents.setZoomFactor(1);
    }
  });

  // 恢复窗口
  ipcMain.on('restore-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      // 恢复窗口的大小调整功能
      win.setResizable(true);
      win.setMaximumSize(0, 0); // 取消最大尺寸限制
      
      // 根据屏幕尺寸计算合适的最小尺寸
      const workArea = screen.getDisplayMatching(win.getBounds()).workArea;
      const minWidth = Math.min(DEFAULT_MAIN_WIDTH, workArea.width * 0.6);
      const minHeight = Math.min(DEFAULT_MAIN_HEIGHT, workArea.height * 0.6);
      
      win.setMinimumSize(Math.round(minWidth), Math.round(minHeight));

      // 恢复窗口状态
      if (preMiniModeState.isMaximized) {
        win.maximize();
      } else {
        // 确保窗口尺寸不超过当前屏幕
        const { width, height } = screen.getDisplayMatching({
          x: preMiniModeState.x || 0,
          y: preMiniModeState.y || 0,
          width: 1,
          height: 1
        }).workArea;
        
        win.setSize(
          Math.min(preMiniModeState.width, Math.round(width * 0.9)),
          Math.min(preMiniModeState.height, Math.round(height * 0.9))
        );
        
        if (preMiniModeState.x !== undefined && preMiniModeState.y !== undefined) {
          // 确保窗口位于屏幕内
          const displays = screen.getAllDisplays();
          let isVisible = false;
          
          for (const display of displays) {
            const { x, y, width, height } = display.workArea;
            if (
              preMiniModeState.x >= x && 
              preMiniModeState.x < x + width &&
              preMiniModeState.y >= y && 
              preMiniModeState.y < y + height
            ) {
              isVisible = true;
              break;
            }
          }
          
          if (isVisible) {
            win.setPosition(preMiniModeState.x, preMiniModeState.y);
          } else {
            win.center(); // 如果位置不可见，则居中
          }
        } else {
          win.center();
        }
      }

      win.setAlwaysOnTop(false);
      win.setSkipTaskbar(false);

      // 导航回主页面
      win.webContents.send('navigate', '/');

      // 发送事件到渲染进程，通知退出迷你模式
      win.webContents.send('mini-mode', false);
      
      // 应用页面内容缩放
      applyContentZoom(win);
    }
  });

  // 监听代理设置变化
  store.onDidChange('set.proxyConfig', () => {
    initializeProxy();
  });
  
  // 监听自定义内容缩放设置变化
  store.onDidChange('set.contentZoomFactor', () => {
    if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
      applyContentZoom(mainWindowInstance);
    }
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
        console.log(`主进程: 扩大迷你窗口至 ${DEFAULT_MINI_WIDTH} x ${DEFAULT_MINI_EXPANDED_HEIGHT}`);
        // 调整最大尺寸限制，允许窗口变大
        win.setMinimumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
        win.setMaximumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_EXPANDED_HEIGHT);
        // 调整窗口尺寸
        win.setSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_EXPANDED_HEIGHT);
      } else {
        console.log(`主进程: 缩小迷你窗口至 ${DEFAULT_MINI_WIDTH} x ${DEFAULT_MINI_HEIGHT}`);
        // 强制重置尺寸限制，确保窗口可以缩小
        win.setMaximumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
        win.setMinimumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
        // 调整窗口尺寸
        win.setSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
      }
    }
  });
  
  // 允许用户通过IPC调整页面缩放比例
  ipcMain.on('set-content-zoom', (event, zoomFactor) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.setZoomFactor(zoomFactor);
      store.set('set.contentZoomFactor', zoomFactor);
    }
  });
  
  // 获取当前缩放比例
  ipcMain.handle('get-content-zoom', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      return win.webContents.getZoomFactor();
    }
    return 1; // 默认缩放比例
  });
  
  // 获取系统缩放因子
  ipcMain.handle('get-system-scale-factor', () => {
    return screen.getPrimaryDisplay().scaleFactor;
  });
  
  // 重置页面缩放到基于系统缩放比的默认值
  ipcMain.on('reset-content-zoom', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      store.delete('set.contentZoomFactor');
      applyContentZoom(win);
    }
  });

  // 监听显示器变化事件
  screen.on('display-metrics-changed', (_event, _display, changedMetrics) => {
    if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
      // 当缩放因子变化时，重新应用页面缩放
      if (changedMetrics.includes('scaleFactor')) {
        applyContentZoom(mainWindowInstance);
      }
    }
  });

  // 监听 macOS 下点击 Dock 图标的事件
  app.on('activate', () => {
    // 当应用被激活时，检查主窗口是否存在
    if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
      // 如果窗口存在但被隐藏，则显示窗口
      if (!mainWindowInstance.isVisible()) {
        mainWindowInstance.show();
      }
    }
  });
}

/**
 * 创建主窗口
 */
export function createMainWindow(icon: Electron.NativeImage): BrowserWindow {
  // 使用 electron-window-state 管理窗口状态
  const mainWindowState = windowStateKeeper({
    defaultWidth: DEFAULT_MAIN_WIDTH,
    defaultHeight: DEFAULT_MAIN_HEIGHT
  });
  
  // 计算适当的最小尺寸（基于工作区大小）
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: workAreaWidth, height: workAreaHeight } = primaryDisplay.workArea;
  
  // 根据缩放因子和工作区大小调整最小尺寸
  const minWidth = Math.min(Math.round(DEFAULT_MAIN_WIDTH * 0.6), Math.round(workAreaWidth * 0.5));
  const minHeight = Math.min(Math.round(DEFAULT_MAIN_HEIGHT * 0.6), Math.round(workAreaHeight * 0.5));
  
  const mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth,
    minHeight,
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

  // 确保最小尺寸设置正确
  mainWindow.setMinimumSize(minWidth, minHeight);
  mainWindow.removeMenu();
  
  // 让 windowStateKeeper 管理窗口状态
  mainWindowState.manage(mainWindow);
  
  // 初始化时保存到 preMiniModeState，以便从迷你模式恢复
  preMiniModeState = {
    width: mainWindowState.width,
    height: mainWindowState.height,
    x: mainWindowState.x,
    y: mainWindowState.y,
    isMaximized: mainWindowState.isMaximized
  };

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    
    // 应用页面内容缩放
    applyContentZoom(mainWindow);
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

  // 保存主窗口引用
  mainWindowInstance = mainWindow;

  return mainWindow;
}
