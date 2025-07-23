import { app, BrowserWindow, ipcMain, screen } from 'electron';
import Store from 'electron-store';

const store = new Store();

// 默认窗口尺寸
export const DEFAULT_MAIN_WIDTH = 1200;
export const DEFAULT_MAIN_HEIGHT = 780;
export const DEFAULT_MINI_WIDTH = 340;
export const DEFAULT_MINI_HEIGHT = 64;
export const DEFAULT_MINI_EXPANDED_HEIGHT = 400;

// 用于存储窗口状态的键名
export const WINDOW_STATE_KEY = 'windowState';

// 最小窗口尺寸
let MIN_WIDTH = Math.round(DEFAULT_MAIN_WIDTH * 0.5);
let MIN_HEIGHT = Math.round(DEFAULT_MAIN_HEIGHT * 0.5);

// 标记IPC处理程序是否已注册
let ipcHandlersRegistered = false;

/**
 * 窗口状态类型定义
 */
export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

/**
 * 窗口大小管理器
 * 负责保存、恢复和维护窗口大小状态
 */
class WindowSizeManager {
  private store: Store;
  private mainWindow: BrowserWindow | null = null;
  private savedState: WindowState | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.store = store;
    // 初始化时不做与screen相关的操作，等app ready后再初始化
  }

  /**
   * 初始化窗口大小管理器
   * 必须在app ready后调用
   */
  initialize(): void {
    if (!app.isReady()) {
      console.warn('WindowSizeManager.initialize() 必须在 app ready 之后调用！');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    this.initMinimumWindowSize();
    this.setupIPCHandlers();
    this.isInitialized = true;
    console.log('窗口大小管理器初始化完成');
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(win: BrowserWindow): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    this.mainWindow = win;

    // 读取保存的状态
    this.savedState = this.getWindowState();

    // 监听重要事件
    this.setupEventListeners(win);

    // 立即保存初始状态
    this.saveWindowState(win);
  }

  /**
   * 初始化最小窗口尺寸
   */
  private initMinimumWindowSize(): void {
    if (!app.isReady()) {
      console.warn('不能在 app ready 之前访问 screen 模块');
      return;
    }

    try {
      const { width: workAreaWidth, height: workAreaHeight } = screen.getPrimaryDisplay().workArea;

      // 根据工作区大小设置合理的最小尺寸
      MIN_WIDTH = Math.min(Math.round(DEFAULT_MAIN_WIDTH * 0.5), Math.round(workAreaWidth * 0.3));
      MIN_HEIGHT = Math.min(
        Math.round(DEFAULT_MAIN_HEIGHT * 0.5),
        Math.round(workAreaHeight * 0.3)
      );

      console.log(`设置最小窗口尺寸: ${MIN_WIDTH}x${MIN_HEIGHT}`);
    } catch (error) {
      console.error('初始化最小窗口尺寸失败:', error);
      // 使用默认值
      MIN_WIDTH = Math.round(DEFAULT_MAIN_WIDTH * 0.5);
      MIN_HEIGHT = Math.round(DEFAULT_MAIN_HEIGHT * 0.5);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(win: BrowserWindow): void {
    // 监听窗口大小调整事件
    win.on('resize', () => {
      if (!win.isDestroyed() && !win.isMinimized()) {
        this.saveWindowState(win);
      }
    });

    // 监听窗口移动事件
    win.on('move', () => {
      if (!win.isDestroyed() && !win.isMinimized()) {
        this.saveWindowState(win);
      }
    });

    // 监听窗口最大化事件
    win.on('maximize', () => {
      if (!win.isDestroyed()) {
        this.saveWindowState(win);
      }
    });

    // 监听窗口从最大化恢复事件
    win.on('unmaximize', () => {
      if (!win.isDestroyed()) {
        this.saveWindowState(win);
      }
    });

    // 监听窗口关闭事件，确保保存最终状态
    win.on('close', () => {
      if (!win.isDestroyed()) {
        this.saveWindowState(win);
      }
    });

    // 在页面加载完成后确保窗口大小正确
    win.webContents.on('did-finish-load', () => {
      this.enforceCorrectSize(win);
    });

    // 在窗口准备好显示时确保尺寸正确
    win.on('ready-to-show', () => {
      this.enforceCorrectSize(win);
    });
  }

  /**
   * 强制应用正确的窗口大小
   */
  private enforceCorrectSize(win: BrowserWindow): void {
    if (!this.savedState || win.isMaximized() || win.isMinimized() || win.isDestroyed()) {
      return;
    }

    const [currentWidth, currentHeight] = win.getSize();

    if (
      Math.abs(currentWidth - this.savedState.width) > 2 ||
      Math.abs(currentHeight - this.savedState.height) > 2
    ) {
      console.log(
        `强制调整窗口大小: 当前=${currentWidth}x${currentHeight}, 目标=${this.savedState.width}x${this.savedState.height}`
      );

      // 临时禁用minimum size限制
      const [minWidth, minHeight] = win.getMinimumSize();
      win.setMinimumSize(1, 1);

      // 强制设置正确大小
      win.setSize(this.savedState.width, this.savedState.height, false);

      // 恢复原始minimum size
      win.setMinimumSize(minWidth, minHeight);

      // 验证尺寸设置是否成功
      const [newWidth, newHeight] = win.getSize();
      console.log(`调整后窗口大小: ${newWidth}x${newHeight}`);

      // 如果调整后的大小仍然与目标不一致，尝试再次调整
      if (
        Math.abs(newWidth - this.savedState.width) > 1 ||
        Math.abs(newHeight - this.savedState.height) > 1
      ) {
        console.log(`窗口大小调整后仍不一致，将再次尝试调整`);
        setTimeout(() => {
          if (!win.isDestroyed() && !win.isMaximized() && !win.isMinimized()) {
            win.setSize(this.savedState!.width, this.savedState!.height, false);
          }
        }, 50);
      }

      // // 开始尺寸强制执行
      // this.startSizeEnforcement(win);
    }
  }

  /**
   * 开启尺寸强制执行定时器
   */
  // private startSizeEnforcement(win: BrowserWindow): void {
  //   // 清除之前的定时器
  //   if (this.enforceTimer) {
  //     clearInterval(this.enforceTimer);
  //     this.enforceTimer = null;
  //   }

  //   this.enforceCount = 0;

  //   // 创建新的定时器，每50ms检查一次窗口大小
  //   this.enforceTimer = setInterval(() => {
  //     if (this.enforceCount >= this.MAX_ENFORCE_COUNT ||
  //         !this.savedState ||
  //         win.isDestroyed() ||
  //         win.isMaximized() ||
  //         win.isMinimized()) {
  //       // 达到最大检查次数或不需要检查，清除定时器
  //       if (this.enforceTimer) {
  //         clearInterval(this.enforceTimer);
  //         this.enforceTimer = null;
  //       }
  //       return;
  //     }

  //     const [currentWidth, currentHeight] = win.getSize();

  //     if (Math.abs(currentWidth - this.savedState.width) > 2 ||
  //         Math.abs(currentHeight - this.savedState.height) > 2) {
  //       console.log(`[定时检查] 强制调整窗口大小: 当前=${currentWidth}x${currentHeight}, 目标=${this.savedState.width}x${this.savedState.height}`);

  //       // 临时禁用minimum size限制
  //       const [minWidth, minHeight] = win.getMinimumSize();
  //       win.setMinimumSize(1, 1);

  //       // 强制设置正确大小
  //       win.setSize(this.savedState.width, this.savedState.height, false);

  //       // 恢复原始minimum size
  //       win.setMinimumSize(minWidth, minHeight);

  //       // 验证尺寸设置是否成功
  //       const [newWidth, newHeight] = win.getSize();
  //       if (Math.abs(newWidth - this.savedState.width) <= 1 &&
  //           Math.abs(newHeight - this.savedState.height) <= 1) {
  //         console.log(`窗口大小已成功调整为目标尺寸: ${newWidth}x${newHeight}`);
  //       }
  //     }

  //     this.enforceCount++;
  //   }, 50);
  // }

  /**
   * 获取窗口创建选项
   */
  getWindowOptions(): Electron.BrowserWindowConstructorOptions {
    // 确保初始化
    if (!this.isInitialized && app.isReady()) {
      this.initialize();
    }

    // 读取保存的状态
    const savedState = this.getWindowState();

    // 准备选项
    const options: Electron.BrowserWindowConstructorOptions = {
      width: savedState?.width || DEFAULT_MAIN_WIDTH,
      height: savedState?.height || DEFAULT_MAIN_HEIGHT,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      show: false,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    };

    // 如果有保存的位置，且位置有效，则使用该位置
    if (savedState?.x !== undefined && savedState?.y !== undefined && app.isReady()) {
      if (this.isPositionVisible(savedState.x, savedState.y)) {
        options.x = savedState.x;
        options.y = savedState.y;
      }
    }

    console.log(
      `窗口创建选项: 大小=${options.width}x${options.height}, 位置=(${options.x}, ${options.y})`
    );

    return options;
  }

  /**
   * 应用窗口初始状态
   * 在窗口创建后调用
   */
  applyInitialState(win: BrowserWindow): void {
    const savedState = this.getWindowState();

    if (!savedState) {
      win.center();
      return;
    }

    // 如果需要最大化，直接最大化
    if (savedState.isMaximized) {
      console.log('应用已保存的最大化状态');
      win.maximize();
    }
    // 如果位置无效，则居中显示
    else if (
      !app.isReady() ||
      savedState.x === undefined ||
      savedState.y === undefined ||
      !this.isPositionVisible(savedState.x, savedState.y)
    ) {
      console.log('保存的位置无效，窗口居中显示');
      win.center();
    }
  }

  /**
   * 保存窗口状态
   */
  saveWindowState(win: BrowserWindow): WindowState {
    // 如果窗口已销毁，则返回之前的状态或默认状态
    console.log('win.isDestroyed()', win.isDestroyed());
    if (win.isDestroyed()) {
      return (
        this.savedState || {
          width: DEFAULT_MAIN_WIDTH,
          height: DEFAULT_MAIN_HEIGHT,
          isMaximized: false
        }
      );
    }

    // 检查是否是mini模式窗口（根据窗口大小判断）
    const [currentWidth, currentHeight] = win.getSize();
    const isMiniMode = currentWidth === DEFAULT_MINI_WIDTH && currentHeight === DEFAULT_MINI_HEIGHT;

    const isMaximized = win.isMaximized();
    let state: WindowState;

    if (isMaximized) {
      // 如果窗口处于最大化状态，保存最大化标志
      // 由于 Electron 的限制，最大化状态下 getBounds() 可能不准确
      // 所以我们尽量保留之前保存的非最大化时的大小
      const currentBounds = win.getBounds();
      const previousSize =
        this.savedState && !this.savedState.isMaximized
          ? { width: this.savedState.width, height: this.savedState.height }
          : { width: currentBounds.width, height: currentBounds.height };

      state = {
        width: previousSize.width,
        height: previousSize.height,
        x: currentBounds.x,
        y: currentBounds.y,
        isMaximized: true
      };
      console.log('state IsMaximized', state);
    } else if (win.isMinimized()) {
      // 最小化状态下不保存窗口大小，因为可能不准确
      console.log('state IsMinimized', this.savedState);
      return (
        this.savedState || {
          width: DEFAULT_MAIN_WIDTH,
          height: DEFAULT_MAIN_HEIGHT,
          isMaximized: false
        }
      );
    } else {
      // 正常状态下保存当前大小和位置
      const [width, height] = win.getSize();
      const [x, y] = win.getPosition();

      state = {
        width,
        height,
        x,
        y,
        isMaximized: false
      };
      console.log('state IsNormal', state);
    }

    // 如果是mini模式，不保存到持久化存储，只返回状态用于内存中的恢复
    if (isMiniMode) {
      console.log('检测到mini模式窗口，不保存到持久化存储');
      return state;
    }

    // 保存状态到存储
    this.store.set(WINDOW_STATE_KEY, state);
    console.log(`已保存窗口状态: ${JSON.stringify(state)}`);

    // 更新内部状态
    this.savedState = state;
    console.log('state', state);

    return state;
  }

  /**
   * 获取保存的窗口状态
   */
  getWindowState(): WindowState | null {
    const state = this.store.get(WINDOW_STATE_KEY) as WindowState | undefined;

    if (!state) {
      console.log('未找到保存的窗口状态，将使用默认值');
      return null;
    }

    // 验证尺寸，确保不小于最小值
    const validatedState: WindowState = {
      width: Math.max(MIN_WIDTH, state.width || DEFAULT_MAIN_WIDTH),
      height: Math.max(MIN_HEIGHT, state.height || DEFAULT_MAIN_HEIGHT),
      x: state.x,
      y: state.y,
      isMaximized: !!state.isMaximized
    };

    console.log(`读取保存的窗口状态: ${JSON.stringify(validatedState)}`);

    return validatedState;
  }

  /**
   * 检查位置是否在可见屏幕范围内
   */
  isPositionVisible(x: number, y: number): boolean {
    if (!app.isReady()) {
      return false;
    }

    try {
      const displays = screen.getAllDisplays();

      for (const display of displays) {
        const { x: screenX, y: screenY, width, height } = display.workArea;
        if (x >= screenX && x < screenX + width && y >= screenY && y < screenY + height) {
          return true;
        }
      }
    } catch (error) {
      console.error('检查位置可见性失败:', error);
      return false;
    }

    return false;
  }

  /**
   * 计算适合当前缩放比的缩放因子
   */
  calculateContentZoomFactor(): number {
    // 只有在 app 准备好后才能使用screen
    if (!app.isReady()) {
      return 1;
    }

    try {
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
      const userZoomFactor = this.store.get('set.contentZoomFactor') as number | undefined;
      if (userZoomFactor) {
        zoomFactor = userZoomFactor;
      }

      return zoomFactor;
    } catch (error) {
      console.error('计算内容缩放因子失败:', error);
      return 1;
    }
  }

  /**
   * 应用页面内容缩放
   */
  applyContentZoom(win: BrowserWindow): void {
    const zoomFactor = this.calculateContentZoomFactor();
    win.webContents.setZoomFactor(zoomFactor);

    if (app.isReady()) {
      try {
        console.log(
          `应用页面缩放因子: ${zoomFactor}, 系统缩放比: ${screen.getPrimaryDisplay().scaleFactor}`
        );
      } catch (error) {
        console.error('获取系统缩放比失败:', error);
      }
    } else {
      console.log(`应用页面缩放因子: ${zoomFactor}`);
    }
  }

  /**
   * 初始化IPC消息处理程序
   */
  setupIPCHandlers(): void {
    // 防止重复注册IPC处理程序
    if (ipcHandlersRegistered) {
      console.log('IPC处理程序已注册，跳过重复注册');
      return;
    }

    console.log('注册窗口大小相关的IPC处理程序');

    // 标记为已注册
    ipcHandlersRegistered = true;

    // 安全地移除已存在的处理程序（如果有）
    const removeHandlerSafely = (channel: string) => {
      try {
        ipcMain.removeHandler(channel);
      } catch (error) {
        console.warn(`移除IPC处理程序 ${channel} 时出错:`, error);
      }
    };

    // 为需要使用handle方法的通道先移除已有处理程序
    removeHandlerSafely('get-content-zoom');
    removeHandlerSafely('get-system-scale-factor');

    // 注册新的处理程序
    ipcMain.on('set-content-zoom', (event, zoomFactor) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.webContents.setZoomFactor(zoomFactor);
        this.store.set('set.contentZoomFactor', zoomFactor);
      }
    });

    ipcMain.handle('get-content-zoom', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        return win.webContents.getZoomFactor();
      }
      return 1;
    });

    ipcMain.handle('get-system-scale-factor', () => {
      if (!app.isReady()) {
        return 1;
      }

      try {
        return screen.getPrimaryDisplay().scaleFactor;
      } catch (error) {
        console.error('获取系统缩放因子失败:', error);
        return 1;
      }
    });

    ipcMain.on('reset-content-zoom', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        this.store.delete('set.contentZoomFactor');
        this.applyContentZoom(win);
      }
    });

    ipcMain.on('resize-window', (event, width, height) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        console.log(`接收到调整窗口大小请求: ${width}x${height}`);

        // 确保尺寸不小于最小值
        const adjustedWidth = Math.max(width, MIN_WIDTH);
        const adjustedHeight = Math.max(height, MIN_HEIGHT);

        // 设置窗口的大小
        win.setSize(adjustedWidth, adjustedHeight);
        console.log(`窗口大小已调整为: ${adjustedWidth}x${adjustedHeight}`);

        // 保存窗口状态
        this.saveWindowState(win);
      }
    });

    ipcMain.on('resize-mini-window', (event, showPlaylist) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        if (showPlaylist) {
          console.log(`扩大迷你窗口至 ${DEFAULT_MINI_WIDTH} x ${DEFAULT_MINI_EXPANDED_HEIGHT}`);
          win.setMinimumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
          win.setMaximumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_EXPANDED_HEIGHT);
          win.setSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_EXPANDED_HEIGHT, false);
        } else {
          console.log(`缩小迷你窗口至 ${DEFAULT_MINI_WIDTH} x ${DEFAULT_MINI_HEIGHT}`);
          win.setMaximumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
          win.setMinimumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
          win.setSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT, false);
        }
      }
    });

    // 只在app ready后设置显示器变化监听
    if (app.isReady()) {
      // 监听显示器变化事件
      screen.on('display-metrics-changed', (_event, _display, changedMetrics) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          // 当缩放因子变化时，重新应用页面缩放
          if (changedMetrics.includes('scaleFactor')) {
            this.applyContentZoom(this.mainWindow);
          }

          // 重新初始化最小尺寸
          this.initMinimumWindowSize();
        }
      });
    }

    // 监听 store 中的缩放设置变化
    this.store.onDidChange('set.contentZoomFactor', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.applyContentZoom(this.mainWindow);
      }
    });
  }
}

// 创建窗口大小管理器实例
const windowSizeManager = new WindowSizeManager();

// 导出初始化函数
export const initWindowSizeManager = (): void => {
  // 等待app ready后再初始化
  if (app.isReady()) {
    windowSizeManager.initialize();
  } else {
    app.on('ready', () => {
      windowSizeManager.initialize();
    });
  }
};

// 导出实例方法
export const getWindowOptions = (): Electron.BrowserWindowConstructorOptions => {
  return windowSizeManager.getWindowOptions();
};

export const applyInitialState = (win: BrowserWindow): void => {
  windowSizeManager.applyInitialState(win);
};

export const saveWindowState = (win: BrowserWindow): WindowState => {
  return windowSizeManager.saveWindowState(win);
};

export const getWindowState = (): WindowState | null => {
  return windowSizeManager.getWindowState();
};

export const applyContentZoom = (win: BrowserWindow): void => {
  windowSizeManager.applyContentZoom(win);
};

export const initWindowSizeHandlers = (mainWindow: BrowserWindow | null): void => {
  // 确保app ready后再初始化
  if (!app.isReady()) {
    app.on('ready', () => {
      if (mainWindow) {
        windowSizeManager.setMainWindow(mainWindow);
      }
    });
  } else {
    if (mainWindow) {
      windowSizeManager.setMainWindow(mainWindow);
    }
  }
};

export const calculateMinimumWindowSize = (): { minWidth: number; minHeight: number } => {
  return { minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT };
};
