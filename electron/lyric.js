const { BrowserWindow, screen } = require('electron');
const path = require('path');
const config = require('./config');

let lyricWindow = null;
let isDragging = false;

const createWin = () => {
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
};

const loadLyricWindow = (ipcMain) => {
  ipcMain.on('open-lyric', () => {
    if (lyricWindow) {
      if (lyricWindow.isMinimized()) lyricWindow.restore();
      lyricWindow.focus();
      lyricWindow.show();
      return;
    }
    createWin();
    if (process.env.NODE_ENV === 'development') {
      lyricWindow.webContents.openDevTools({ mode: 'detach' });
      lyricWindow.loadURL(`http://localhost:${config.development.lyricPort}/#/lyric`);
    } else {
      const distPath = path.resolve(__dirname, config.production.distPath);
      lyricWindow.loadURL(`file://${distPath}/index.html#/lyric`);
    }

    lyricWindow.setMinimumSize(600, 200);

    // 隐藏任务栏
    lyricWindow.setSkipTaskbar(true);

    lyricWindow.show();
  });

  ipcMain.on('send-lyric', (e, data) => {
    if (lyricWindow) {
      lyricWindow.webContents.send('receive-lyric', data);
    }
  });

  ipcMain.on('top-lyric', (e, data) => {
    lyricWindow.setAlwaysOnTop(data);
  });

  ipcMain.on('close-lyric', () => {
    lyricWindow.close();
    lyricWindow = null;
  });

  ipcMain.on('mouseenter-lyric', () => {
    lyricWindow.setIgnoreMouseEvents(true);
  });

  ipcMain.on('mouseleave-lyric', () => {
    lyricWindow.setIgnoreMouseEvents(false);
  });

  // 开始拖动
  ipcMain.on('lyric-drag-start', () => {
    isDragging = true;
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

  // 结束拖动
  ipcMain.on('lyric-drag-end', () => {
    isDragging = false;
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
};

module.exports = {
  loadLyricWindow,
};
