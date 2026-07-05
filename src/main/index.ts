import { electronApp, optimizer } from '@electron-toolkit/utils';
import { app, dialog, ipcMain, nativeImage, protocol, session } from 'electron';
import { join } from 'path';

// 全局兜底（#714）：Windows 上 config.json 等文件可能被杀毒/云同步软件短暂锁定，
// electron-store 读写撞锁会抛 EBUSY 等未捕获异常，Electron 默认弹出致命错误框。
// 对带 path 的文件系统锁类错误仅记录日志；其余异常保留报错弹窗以免掩盖真 bug。
const FILE_LOCK_ERROR_CODES = new Set(['EBUSY', 'EPERM', 'EACCES', 'EAGAIN', 'EMFILE', 'ENFILE']);
process.on('uncaughtException', (error: NodeJS.ErrnoException) => {
  if (error?.code && FILE_LOCK_ERROR_CODES.has(error.code) && typeof error.path === 'string') {
    console.error('[main] 文件被占用/锁定，已忽略本次读写:', error.message);
    return;
  }
  console.error('[main] 未捕获异常:', error);
  dialog.showErrorBox(
    'A JavaScript error occurred in the main process',
    error?.stack || String(error)
  );
});
process.on('unhandledRejection', (reason) => {
  console.error('[main] 未处理的 Promise 拒绝:', reason);
});

// 必须在 app.whenReady() 之前注册自定义协议为特权协议，
// 否则 http(s) 页面（dev server、生产环境的 file://）无法把 local:// 当成
// 安全/可 fetch/可流式的资源加载，会触发 CORS 拦截或 net::ERR_UNKNOWN_URL_SCHEME
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
]);

import type { Language } from '../i18n/main';
import i18n from '../i18n/main';
import { loadLyricWindow } from './lyric';
import { initializeCacheManager } from './modules/cache';
import { initializeConfig } from './modules/config';
import { initializeDownloadManager, setDownloadManagerWindow } from './modules/downloadManager';
import { initializeFileManager } from './modules/fileManager';
import { initializeFonts } from './modules/fonts';
import { initializeLocalMusicScanner } from './modules/localMusicScanner';
import { initializeLoginWindow } from './modules/loginWindow';
import { initLxMusicHttp } from './modules/lxMusicHttp';
import { initializeMpris, updateMprisCurrentSong, updateMprisPlayState } from './modules/mpris';
import { initializeOtherApi } from './modules/otherApi';
import { initializeRemoteControl } from './modules/remoteControl';
import { initializeShortcuts } from './modules/shortcuts';
import { initializeTray, updateCurrentSong, updatePlayState, updateTrayMenu } from './modules/tray';
import { setupUpdateHandlers } from './modules/update';
import { createMainWindow, initializeWindowManager, setAppQuitting } from './modules/window';
import { initWindowSizeManager } from './modules/window-size';
import { startMusicApi } from './server';

// 导入所有图标
const iconPath = join(__dirname, '../../resources');
const icon = nativeImage.createFromPath(
  process.platform === 'darwin' ? join(iconPath, 'icon.icns') : join(iconPath, 'icon.png')
);

let mainWindow: Electron.BrowserWindow;

// 初始化应用
function initialize(configStore: any) {
  // 使用已初始化的配置存储
  const store = configStore;

  // 设置初始语言
  const savedLanguage = store.get('set.language') as Language;
  if (savedLanguage) {
    i18n.global.locale = savedLanguage;
  }

  // 初始化文件管理
  initializeFileManager();
  // 初始化下载管理
  initializeDownloadManager();
  // 初始化歌词缓存管理
  initializeCacheManager();
  // 初始化其他 API （搜索建议等）
  initializeOtherApi();
  // 初始化窗口管理
  initializeWindowManager();
  // 初始化字体管理
  initializeFonts();
  // 初始化登录窗口
  initializeLoginWindow();
  // 初始化本地音乐扫描模块
  initializeLocalMusicScanner();

  // 创建主窗口
  mainWindow = createMainWindow(icon);

  // 设置下载管理器窗口引用
  setDownloadManagerWindow(mainWindow);

  // 初始化托盘
  initializeTray(iconPath, mainWindow);

  // 启动音乐API
  startMusicApi();

  // 初始化落雪音乐 HTTP 请求处理
  initLxMusicHttp();

  // 加载歌词窗口
  loadLyricWindow(ipcMain, mainWindow);

  // 初始化快捷键
  initializeShortcuts(mainWindow);

  // 初始化远程控制服务
  initializeRemoteControl(mainWindow);

  // 初始化 MPRIS 服务 (Linux)
  initializeMpris(mainWindow);

  // 初始化更新处理程序
  setupUpdateHandlers(mainWindow);
}

// 检查是否为第一个实例
const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  app.quit();
} else {
  // 禁用 Chromium 内置的 MediaSession MPRIS 服务，避免重复显示
  if (process.platform === 'linux') {
    app.commandLine.appendSwitch('disable-features', 'MediaSessionService');
  }

  // 在应用准备就绪前初始化GPU加速设置
  // 必须在 app.ready 之前调用 disableHardwareAcceleration
  try {
    // 初始化配置管理以获取GPU加速设置
    const store = initializeConfig();
    const enableGpuAcceleration = store.get('set.enableGpuAcceleration', true) as boolean;

    if (!enableGpuAcceleration) {
      console.log('GPU加速已禁用');
      app.disableHardwareAcceleration();
    } else {
      console.log('GPU加速已启用');
    }
  } catch (error) {
    console.error('GPU加速设置初始化失败:', error);
    // 如果配置读取失败，默认启用GPU加速
  }
  // 当第二个实例启动时，将焦点转移到第一个实例的窗口
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 应用程序准备就绪时的处理
  app.whenReady().then(() => {
    // 设置应用ID
    electronApp.setAppUserModelId('com.alger.music');

    // 监听窗口创建事件
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // 初始化窗口大小管理器
    initWindowSizeManager();

    // 媒体设备权限：应用没有任何录音功能，麦克风/摄像头采集一律拒绝，
    // 防止依赖库静默调用 getUserMedia 触发系统麦克风授权弹窗（#147/#246/#440/#639 防御性加固）。
    // 输出设备切换走 speaker-selection / enumerateDevices，不受影响
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (permission === ('media' as any) || permission === ('audioCapture' as any)) {
        callback(false);
        return;
      }
      callback(true);
    });

    // 保持放行：enumerateDevices 依赖它返回真实设备名（不访问麦克风硬件、不触发系统授权）
    session.defaultSession.setPermissionCheckHandler(() => {
      return true;
    });

    // 重新初始化配置管理以获取完整的配置存储
    const store = initializeConfig();

    // 初始化应用
    initialize(store);

    // macOS 激活应用时的处理
    app.on('activate', () => {
      if (mainWindow === null) initialize(store);
    });
  });

  // 监听语言切换
  ipcMain.on('change-language', (_, locale: Language) => {
    // 更新主进程的语言设置
    i18n.global.locale = locale;
    // 更新托盘菜单
    updateTrayMenu(mainWindow);
    // 通知所有窗口语言已更改
    mainWindow?.webContents.send('language-changed', locale);
  });

  // 监听播放状态变化
  ipcMain.on('update-play-state', (_, playing: boolean) => {
    updatePlayState(playing);
    updateMprisPlayState(playing);
  });

  // 监听当前歌曲变化
  ipcMain.on('update-current-song', (_, song: any) => {
    updateCurrentSong(song);
    updateMprisCurrentSong(song);
  });

  // 所有窗口关闭时的处理
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 应用即将退出时的处理
  app.on('before-quit', () => {
    // 设置退出标志
    setAppQuitting(true);
  });

  // 重启应用
  ipcMain.on('restart', () => {
    app.relaunch();
    app.exit(0);
  });

  // 获取系统架构信息
  ipcMain.on('get-arch', (event) => {
    event.returnValue = process.arch;
  });
}
