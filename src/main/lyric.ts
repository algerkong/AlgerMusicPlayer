import { BrowserWindow, IpcMain, screen } from 'electron';
import Store from 'electron-store';
import path, { join } from 'path';

const store = new Store();
let lyricWindow: BrowserWindow | null = null;

const createWin = () => {
  console.log('Creating lyric window');

  // 获取保存的窗口位置
  const windowBounds =
    (store.get('lyricWindowBounds') as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }) || {};
  const { x, y, width, height } = windowBounds;

  // 获取屏幕尺寸
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // 验证保存的位置是否有效
  const validPosition =
    x !== undefined && y !== undefined && x >= 0 && y >= 0 && x < screenWidth && y < screenHeight;

  lyricWindow = new BrowserWindow({
    width: width || 800,
    height: height || 200,
    x: validPosition ? x : undefined,
    y: validPosition ? y : undefined,
    frame: false,
    show: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  });

  // 监听窗口关闭事件
  lyricWindow.on('closed', () => {
    if (lyricWindow) {
      lyricWindow.destroy();
      lyricWindow = null;
    }
  });

  return lyricWindow;
};

export const loadLyricWindow = (ipcMain: IpcMain, mainWin: BrowserWindow): void => {
  const showLyricWindow = () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      if (lyricWindow.isMinimized()) {
        lyricWindow.restore();
      }
      lyricWindow.focus();
      lyricWindow.show();
      return true;
    }
    return false;
  };

  ipcMain.on('open-lyric', () => {
    console.log('Received open-lyric request');

    if (showLyricWindow()) {
      return;
    }

    console.log('Creating new lyric window');
    const win = createWin();

    if (!win) {
      console.error('Failed to create lyric window');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools({ mode: 'detach' });
      win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/#/lyric`);
    } else {
      const distPath = path.resolve(__dirname, '../renderer');
      win.loadURL(`file://${distPath}/index.html#/lyric`);
    }

    win.setMinimumSize(600, 200);
    win.setSkipTaskbar(true);

    win.once('ready-to-show', () => {
      console.log('Lyric window ready to show');
      win.show();
    });
  });

  ipcMain.on('send-lyric', (_, data) => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      try {
        lyricWindow.webContents.send('receive-lyric', data);
      } catch (error) {
        console.error('Error processing lyric data:', error);
      }
    }
  });

  ipcMain.on('top-lyric', (_, data) => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setAlwaysOnTop(data);
    }
  });

  ipcMain.on('close-lyric', () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.webContents.send('lyric-window-close');
      mainWin.webContents.send('lyric-control-back', 'close');
      lyricWindow.destroy();
      lyricWindow = null;
    }
  });

  // 处理鼠标事件
  ipcMain.on('mouseenter-lyric', () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setIgnoreMouseEvents(true);
    }
  });

  ipcMain.on('mouseleave-lyric', () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setIgnoreMouseEvents(false);
    }
  });

  // 处理拖动移动
  ipcMain.on('lyric-drag-move', (_, { deltaX, deltaY }) => {
    if (!lyricWindow || lyricWindow.isDestroyed()) return;

    const [currentX, currentY] = lyricWindow.getPosition();
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const [windowWidth, windowHeight] = lyricWindow.getSize();

    // 计算新位置，确保窗口不会移出屏幕
    const newX = Math.max(0, Math.min(currentX + deltaX, screenWidth - windowWidth));
    const newY = Math.max(0, Math.min(currentY + deltaY, screenHeight - windowHeight));

    lyricWindow.setPosition(newX, newY);

    // 保存新位置
    store.set('lyricWindowBounds', {
      ...lyricWindow.getBounds(),
      x: newX,
      y: newY
    });
  });

  // 添加鼠标穿透事件处理
  ipcMain.on('set-ignore-mouse', (_, shouldIgnore) => {
    if (!lyricWindow || lyricWindow.isDestroyed()) return;

    lyricWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  });

  // 添加播放控制处理
  ipcMain.on('control-back', (_, command) => {
    console.log('command', command);
    if (mainWin && !mainWin.isDestroyed()) {
      console.log('Sending control-back command:', command);
      mainWin.webContents.send('lyric-control-back', command);
    }
  });
};
