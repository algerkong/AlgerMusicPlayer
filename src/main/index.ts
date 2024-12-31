import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, shell, Tray } from 'electron';
import Store from 'electron-store';
import { join } from 'path';
import set from './set.json';
// 导入所有图标
const iconPath = join(__dirname, '../../resources');
const icon = nativeImage.createFromPath(
  process.platform === 'darwin'
    ? join(iconPath, 'icon.icns')
    : process.platform === 'win32'
    ? join(iconPath, 'favicon.ico')
    : join(iconPath, 'icon.png')
);

import { loadLyricWindow } from './lyric';
import { startMusicApi } from './server';

let mainWindow: BrowserWindow;
function createWindow(): void {
  startMusicApi();
  // Create the browser window.
  mainWindow = new BrowserWindow({
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
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
  
  // 创建托盘图标
  const trayIcon = nativeImage.createFromPath(join(iconPath, 'icon_16x16.png')).resize({ width: 16, height: 16 });
  const tray = new Tray(trayIcon);

  // 创建一个上下文菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: '退出',
      click: () => {
        mainWindow.destroy();
        app.quit();
      },
    },
  ]);

  // 设置系统托盘图标的上下文菜单
  tray.setContextMenu(contextMenu);

  // 当系统托盘图标被点击时，切换窗口的显示/隐藏
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  loadLyricWindow(ipcMain, mainWindow);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.alger.music');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('ready', () => {
  globalShortcut.register('CommandOrControl+Alt+Shift+M', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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

ipcMain.on('drag-start', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.webContents.beginFrameSubscription((frameBuffer) => {
      event.reply('frame-buffer', frameBuffer);
    });
  }
});

ipcMain.on('mini-tray', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.hide();
  }
});

// 重启
ipcMain.on('restart', () => {
  app.relaunch();
  app.exit(0);
});

const store = new Store({
  name: 'config', // 配置文件名
  defaults: {
    set: set
  }
});

// 定义ipcRenderer监听事件
ipcMain.on('set-store-value', (_, key, value) => {
  store.set(key, value);
});

ipcMain.on('get-store-value', (_, key) => {
  const value = store.get(key);
  _.returnValue = value || '';
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
