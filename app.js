const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const setJson = require('./electron/set.json');
const { loadLyricWindow } = require('./electron/lyric');

let mainWin = null;
function createWindow() {
  mainWin = new BrowserWindow({
    width: 1200,
    height: 780,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      // contextIsolation: false,
      preload: path.join(__dirname, '/electron/preload.js'),
    },
  });
  const win = mainWin;
  win.setMinimumSize(1200, 780);
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools({ mode: 'detach' });
    win.loadURL('http://localhost:4678/');
  } else {
    win.loadURL(`file://${__dirname}/dist/index.html`);
  }
  const image = nativeImage.createFromPath(path.join(__dirname, 'public/icon.png'));
  const tray = new Tray(image);

  // 创建一个上下文菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示',
      click: () => {
        win.show();
      },
    },
    {
      label: '退出',
      click: () => {
        win.destroy();
      },
    },
  ]);

  // 设置系统托盘图标的上下文菜单
  tray.setContextMenu(contextMenu);

  // 当系统托盘图标被点击时，切换窗口的显示/隐藏
  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });

  const set = store.get('set');
  // store.set('set', setJson)

  if (!set) {
    store.set('set', setJson);
  }

  loadLyricWindow(ipcMain);
}

// 限制只能启动一个应用
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.whenReady().then(createWindow);

app.on('ready', () => {
  globalShortcut.register('CommandOrControl+Alt+Shift+M', () => {
    if (mainWin.isVisible()) {
      mainWin.hide();
    } else {
      mainWin.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.minimize();
});

ipcMain.on('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.destroy();
});

ipcMain.on('drag-start', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.webContents.beginFrameSubscription((frameBuffer) => {
    event.reply('frame-buffer', frameBuffer);
  });
});

ipcMain.on('mini-tray', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.hide();
});

// 重启
ipcMain.on('restart', () => {
  app.relaunch();
  app.exit(0);
});

const store = new Store();

// 定义ipcRenderer监听事件
ipcMain.on('setStore', (_, key, value) => {
  store.set(key, value);
});

ipcMain.on('getStore', (_, key) => {
  const value = store.get(key);
  _.returnValue = value || '';
});
