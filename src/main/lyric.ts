import { BrowserWindow, IpcMain, screen } from 'electron';
import Store from 'electron-store';
import path, { join } from 'path';

const store = new Store();
let lyricWindow: BrowserWindow | null = null;

// 跟踪拖动状态
let isDragging = false;

// 添加窗口大小变化防护
let originalSize = { width: 0, height: 0 };

const createWin = () => {
  console.log('Creating lyric window');

  // 获取保存的窗口位置
  const windowBounds =
    (store.get('lyricWindowBounds') as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      displayId?: number;
    }) || {};

  const { x, y, width, height, displayId } = windowBounds;

  // 获取所有屏幕的信息
  const displays = screen.getAllDisplays();
  let isValidPosition = false;
  let targetDisplay = displays[0]; // 默认使用主显示器

  // 如果有显示器ID，尝试按ID匹配
  if (displayId) {
    const matchedDisplay = displays.find((d) => d.id === displayId);
    if (matchedDisplay) {
      targetDisplay = matchedDisplay;
      console.log('Found matching display by ID:', displayId);
    }
  }

  // 验证位置是否在任何显示器的范围内
  if (x !== undefined && y !== undefined) {
    for (const display of displays) {
      const { bounds } = display;
      if (
        x >= bounds.x - 50 && // 允许一点偏移，避免卡在边缘
        x < bounds.x + bounds.width + 50 &&
        y >= bounds.y - 50 &&
        y < bounds.y + bounds.height + 50
      ) {
        isValidPosition = true;
        targetDisplay = display;
        break;
      }
    }
  }

  // 确保宽高合理
  const defaultWidth = 800;
  const defaultHeight = 200;
  const maxWidth = 1600; // 设置最大宽度限制
  const maxHeight = 800; // 设置最大高度限制

  const validWidth = width && width > 0 && width <= maxWidth ? width : defaultWidth;
  const validHeight = height && height > 0 && height <= maxHeight ? height : defaultHeight;

  // 确定窗口位置
  let windowX = isValidPosition ? x : undefined;
  let windowY = isValidPosition ? y : undefined;

  // 如果位置无效，默认在当前显示器中居中
  if (windowX === undefined || windowY === undefined) {
    windowX = targetDisplay.bounds.x + (targetDisplay.bounds.width - validWidth) / 2;
    windowY = targetDisplay.bounds.y + (targetDisplay.bounds.height - validHeight) / 2;
  }

  lyricWindow = new BrowserWindow({
    width: validWidth,
    height: validHeight,
    x: windowX,
    y: windowY,
    frame: false,
    show: false,
    transparent: true,
    opacity: 1,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    roundedCorners: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    // 添加跨屏幕支持选项
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    },
    backgroundColor: '#00000000'
  });

  // 监听窗口关闭事件
  lyricWindow.on('closed', () => {
    if (lyricWindow) {
      lyricWindow.destroy();
      lyricWindow = null;
    }
  });

  // 监听窗口大小变化事件，保存新的尺寸
  lyricWindow.on('resize', () => {
    // 如果正在拖动，忽略大小调整事件
    if (isDragging) return;

    if (lyricWindow && !lyricWindow.isDestroyed()) {
      const [width, height] = lyricWindow.getSize();
      const [x, y] = lyricWindow.getPosition();

      // 保存窗口位置和大小
      store.set('lyricWindowBounds', { x, y, width, height });
    }
  });

  lyricWindow.on('blur', () => lyricWindow && lyricWindow.setMaximizable(false));

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
      mainWin.webContents.send('lyric-window-closed');
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

  // 开始拖动时设置标志
  ipcMain.on('lyric-drag-start', () => {
    isDragging = true;
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      // 记录原始窗口大小
      const [width, height] = lyricWindow.getSize();
      originalSize = { width, height };

      // 在拖动时暂时禁用大小调整
      lyricWindow.setResizable(false);
    }
  });

  // 结束拖动时清除标志
  ipcMain.on('lyric-drag-end', () => {
    isDragging = false;
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      // 确保窗口大小恢复原样
      lyricWindow.setSize(originalSize.width, originalSize.height);

      // 拖动结束后恢复可调整大小
      lyricWindow.setResizable(true);
    }
  });

  // 处理拖动移动
  ipcMain.on('lyric-drag-move', (_, { deltaX, deltaY }) => {
    if (!lyricWindow || lyricWindow.isDestroyed() || !isDragging) return;

    const [currentX, currentY] = lyricWindow.getPosition();

    // 使用记录的原始大小，而不是当前大小
    const windowWidth = originalSize.width;
    const windowHeight = originalSize.height;

    // 计算新位置
    const newX = currentX + deltaX;
    const newY = currentY + deltaY;

    try {
      // 获取当前鼠标所在的显示器
      const mousePoint = screen.getCursorScreenPoint();
      const currentDisplay = screen.getDisplayNearestPoint(mousePoint);

      // 拖动期间使用setBounds确保大小不变，使用false避免动画卡顿
      lyricWindow.setBounds(
        {
          x: newX,
          y: newY,
          width: windowWidth,
          height: windowHeight
        },
        false
      );

      // 更新存储的位置
      const windowBounds = {
        x: newX,
        y: newY,
        width: windowWidth,
        height: windowHeight,
        displayId: currentDisplay.id // 记录当前显示器ID，有助于多屏幕处理
      };
      store.set('lyricWindowBounds', windowBounds);
    } catch (error) {
      console.error('Error during window drag:', error);
      // 出错时尝试使用更简单的方法
      lyricWindow.setPosition(newX, newY);
    }
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
