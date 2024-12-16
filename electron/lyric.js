const { BrowserWindow, screen, ipcRenderer } = require('electron');
const path = require('path');
const config = require('./config');

let lyricWindow = null;

const createWin = () => {
  console.log('Creating lyric window');
  lyricWindow = new BrowserWindow({
    width: 800,
    height: 200,
    frame: false,
    show: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: `${__dirname}/preload.js`,
      webSecurity: false,
    },
  });

  // 监听窗口关闭事件
  lyricWindow.on('closed', () => {
    console.log('Lyric window closed');
    lyricWindow = null;
  });
};

const loadLyricWindow = (ipcMain, mainWin) => {
  ipcMain.on('open-lyric', () => {
    console.log('Received open-lyric request');
    if (lyricWindow) {
      console.log('Lyric window exists, focusing');
      if (lyricWindow.isMinimized()) lyricWindow.restore();
      lyricWindow.focus();
      lyricWindow.show();
      return;
    }

    console.log('Creating new lyric window');
    createWin();
    if (process.env.NODE_ENV === 'development') {
      lyricWindow.webContents.openDevTools({ mode: 'detach' });
      lyricWindow.loadURL(`http://localhost:${config.development.lyricPort}/#/lyric`);
    } else {
      const distPath = path.resolve(__dirname, config.production.distPath);
      lyricWindow.loadURL(`file://${distPath}/index.html#/lyric`);
    }

    lyricWindow.setMinimumSize(600, 200);
    lyricWindow.setSkipTaskbar(true);

    lyricWindow.once('ready-to-show', () => {
      console.log('Lyric window ready to show');
      lyricWindow.show();
    });
  });

  ipcMain.on('send-lyric', (e, data) => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      try {
        lyricWindow.webContents.send('receive-lyric', data);
      } catch (error) {
        console.error('Error processing lyric data:', error);
      }
    } else {
      console.log('Cannot send lyric: window not available or destroyed');
    }
  });

  ipcMain.on('top-lyric', (e, data) => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setAlwaysOnTop(data);
    }
  });

  ipcMain.on('close-lyric', () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.webContents.send('lyric-window-close');
      mainWin.webContents.send('lyric-control-back', 'close');
      lyricWindow.close();
      lyricWindow = null;
    }
  });

  ipcMain.on('mouseenter-lyric', () => {
    lyricWindow.setIgnoreMouseEvents(true);
  });

  ipcMain.on('mouseleave-lyric', () => {
    lyricWindow.setIgnoreMouseEvents(false);
  });

  // 处理拖动移动
  ipcMain.on('lyric-drag-move', (e, { deltaX, deltaY }) => {
    if (!lyricWindow) return;

    const [currentX, currentY] = lyricWindow.getPosition();
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const [windowWidth, windowHeight] = lyricWindow.getSize();

    // 计算新位置，确保窗口不会移出屏幕
    const newX = Math.max(0, Math.min(currentX + deltaX, screenWidth - windowWidth));
    const newY = Math.max(0, Math.min(currentY + deltaY, screenHeight - windowHeight));

    lyricWindow.setPosition(newX, newY);
  });

  // 添加鼠标穿透事件处理
  ipcMain.on('set-ignore-mouse', (e, shouldIgnore) => {
    if (!lyricWindow) return;

    if (shouldIgnore) {
      // 设置鼠标穿透，但保留拖动区域可交互
      lyricWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      // 取消鼠标穿透
      lyricWindow.setIgnoreMouseEvents(false);
    }
  });

  // 添加播放控制处理
  ipcMain.on('control-back', (e, command) => {
    console.log('Received control-back request:', command);
    mainWin.webContents.send('lyric-control-back', command);
  });
};

module.exports = {
  loadLyricWindow,
};
