import { BrowserWindow, ipcMain, session } from 'electron';
import { join } from 'path';

import i18n from '../../i18n/main';

let loginWindow: BrowserWindow | null = null;

const loginUrl = 'https://music.163.com/#/login/';
const loginTitle = i18n.global.t('login.qrTitle');

/**
 * 打开登录窗口获取Cookie
 */
const openLoginWindow = async (mainWin: BrowserWindow) => {
  let loginTimer: NodeJS.Timeout;

  // 如果登录窗口已存在，则聚焦并返回
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return;
  }

  const loginSession = session.fromPartition('persist:login');

  // 清除 Cookie
  await loginSession.clearStorageData({
    storages: ['cookies', 'localstorage']
  });

  loginWindow = new BrowserWindow({
    parent: mainWin,
    title: loginTitle,
    width: 1280,
    height: 800,
    center: true,
    autoHideMenuBar: true,
    webPreferences: {
      session: loginSession,
      sandbox: false,
      webSecurity: false,
      preload: join(__dirname, '../../preload/index.js')
    }
  });

  // 打开网易云登录页面
  loginWindow.loadURL(loginUrl);

  // 阻止新窗口创建
  loginWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // 检查是否登录
  const checkLogin = async () => {
    try {
      if (!loginWindow || loginWindow.isDestroyed()) {
        if (loginTimer) clearInterval(loginTimer);
        return;
      }

      const MUSIC_U = await loginSession.cookies.get({
        name: 'MUSIC_U'
      });

      if (MUSIC_U && MUSIC_U?.length > 0) {
        if (loginTimer) clearInterval(loginTimer);
        const value = `MUSIC_U=${MUSIC_U[0].value};`;

        mainWin?.webContents.send('send-cookies', value);

        // 关闭登录窗口
        loginWindow.destroy();
        loginWindow = null;
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  };

  // 循环检查登录状态
  loginWindow.webContents.once('did-finish-load', () => {
    loginWindow?.show();
    loginTimer = setInterval(checkLogin, 500);

    loginWindow?.on('closed', () => {
      if (loginTimer) clearInterval(loginTimer);
      loginWindow = null;
    });
  });
};

/**
 * 初始化登录窗口相关的IPC监听
 */
export function initializeLoginWindow() {
  ipcMain.on('open-login', (event) => {
    const mainWin = BrowserWindow.fromWebContents(event.sender);
    if (mainWin) {
      openLoginWindow(mainWin);
    }
  });
}

export default openLoginWindow;
