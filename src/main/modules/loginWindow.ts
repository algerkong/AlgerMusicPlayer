import { BrowserWindow, ipcMain, session } from 'electron';
import { join } from 'path';

import i18n from '../../i18n/main';

let loginWindow: BrowserWindow | null = null;
let loginWindowOpening = false;
let activeLoginAttemptBinding: { currentId: string } | null = null;

const loginUrl = 'https://music.163.com/#/login/';
const loginWindowStatusChannel = 'login-window-status';
const createLoginAttemptId = () => `login-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

type LoginWindowStatus =
  | 'request-received'
  | 'opening'
  | 'focused-existing'
  | 'opened'
  | 'cookie-detected'
  | 'closed-without-cookie'
  | 'open-failed'
  | 'load-failed';

const sendLoginWindowStatus = (
  mainWin: BrowserWindow,
  status: LoginWindowStatus,
  extra: Record<string, unknown> = {},
  attemptId?: string
) => {
  if (mainWin.isDestroyed()) return;

  mainWin.webContents.send(loginWindowStatusChannel, {
    status,
    timestamp: Date.now(),
    ...(attemptId ? { attemptId } : {}),
    ...extra
  });
};

const sendCookiesToRenderer = (mainWin: BrowserWindow, value: string, attemptId: string) => {
  if (mainWin.isDestroyed()) return;
  mainWin.webContents.send('send-cookies', {
    value,
    attemptId
  });
};

/**
 * 打开登录窗口获取 Cookie
 */
const openLoginWindow = async (mainWin: BrowserWindow, requestAttemptId?: string) => {
  let loginTimer: ReturnType<typeof setTimeout> | null = null;
  let pollingCancelled = false;
  const nextAttemptId = requestAttemptId?.trim() || createLoginAttemptId();

  const stopLoginTimer = () => {
    pollingCancelled = true;
    if (!loginTimer) return;
    clearTimeout(loginTimer);
    loginTimer = null;
  };

  const scheduleLoginCheck = (checkLogin: () => Promise<void>, delayMs = 500) => {
    if (pollingCancelled) return;
    loginTimer = setTimeout(() => {
      void checkLogin();
    }, delayMs);
  };

  sendLoginWindowStatus(mainWin, 'request-received', {}, nextAttemptId);

  if (loginWindow && !loginWindow.isDestroyed()) {
    if (activeLoginAttemptBinding) {
      activeLoginAttemptBinding.currentId = nextAttemptId;
    }
    if (loginWindow.isMinimized()) {
      loginWindow.restore();
    }
    loginWindow.show();
    loginWindow.focus();
    sendLoginWindowStatus(mainWin, 'focused-existing', { url: loginUrl }, nextAttemptId);
    return;
  }

  if (loginWindowOpening) {
    if (activeLoginAttemptBinding) {
      activeLoginAttemptBinding.currentId = nextAttemptId;
    }
    sendLoginWindowStatus(
      mainWin,
      'opening',
      {
        phase: 'waiting-for-existing-request'
      },
      nextAttemptId
    );
    return;
  }

  loginWindowOpening = true;
  const attemptBinding = {
    currentId: nextAttemptId
  };
  activeLoginAttemptBinding = attemptBinding;

  try {
    const loginSession = session.fromPartition('persist:login');
    sendLoginWindowStatus(
      mainWin,
      'opening',
      { phase: 'clearing-storage' },
      attemptBinding.currentId
    );

    await loginSession.clearStorageData({
      storages: ['cookies', 'localstorage']
    });

    let cookieDetected = false;
    let openedNotified = false;

    const notifyOpened = () => {
      if (openedNotified) return;
      openedNotified = true;
      sendLoginWindowStatus(mainWin, 'opened', { url: loginUrl }, attemptBinding.currentId);
    };

    loginWindow = new BrowserWindow({
      parent: mainWin,
      // ??????????????????????? i18n locale ???????
      title: i18n.global.t('login.qrTitle'),
      width: 1280,
      height: 800,
      center: true,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        session: loginSession,
        sandbox: false,
        webSecurity: false,
        preload: join(__dirname, '../../preload/index.js')
      }
    });

    const currentLoginWindow = loginWindow;
    loginWindowOpening = false;

    currentLoginWindow.on('closed', () => {
      stopLoginTimer();
      if (loginWindow === currentLoginWindow) {
        loginWindow = null;
      }
      if (activeLoginAttemptBinding === attemptBinding) {
        activeLoginAttemptBinding = null;
      }
      if (cookieDetected) return;

      void (async () => {
        try {
          const musicCookie = await loginSession.cookies.get({
            name: 'MUSIC_U'
          });

          if (musicCookie?.length > 0) {
            cookieDetected = true;
            sendLoginWindowStatus(
              mainWin,
              'cookie-detected',
              {
                source: 'closed-final-check'
              },
              attemptBinding.currentId
            );
            const value = `MUSIC_U=${musicCookie[0].value};`;
            sendCookiesToRenderer(mainWin, value, attemptBinding.currentId);
            return;
          }
        } catch (error) {
          console.error('关闭后检查 Cookie 失败:', error);
        }

        sendLoginWindowStatus(mainWin, 'closed-without-cookie', {}, attemptBinding.currentId);
      })();
    });

    currentLoginWindow.once('ready-to-show', () => {
      if (currentLoginWindow.isDestroyed()) return;
      currentLoginWindow.show();
      notifyOpened();
    });

    currentLoginWindow.webContents.once('did-finish-load', () => {
      if (currentLoginWindow.isDestroyed()) return;
      if (!currentLoginWindow.isVisible()) {
        currentLoginWindow.show();
      }
      notifyOpened();
      pollingCancelled = false;
      scheduleLoginCheck(checkLogin);
    });

    currentLoginWindow.webContents.once(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        sendLoginWindowStatus(
          mainWin,
          'load-failed',
          {
            errorCode,
            errorDescription,
            url: validatedURL || loginUrl
          },
          attemptBinding.currentId
        );
      }
    );

    currentLoginWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    const checkLogin = async () => {
      try {
        if (pollingCancelled || cookieDetected || currentLoginWindow.isDestroyed()) {
          stopLoginTimer();
          return;
        }

        const musicCookie = await loginSession.cookies.get({
          name: 'MUSIC_U'
        });

        if (pollingCancelled || cookieDetected || currentLoginWindow.isDestroyed()) {
          return;
        }

        if (musicCookie?.length > 0) {
          cookieDetected = true;
          stopLoginTimer();
          sendLoginWindowStatus(mainWin, 'cookie-detected', {}, attemptBinding.currentId);
          const value = `MUSIC_U=${musicCookie[0].value};`;

          sendCookiesToRenderer(mainWin, value, attemptBinding.currentId);

          currentLoginWindow.close();
          return;
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
      }

      if (!pollingCancelled && !cookieDetected && !currentLoginWindow.isDestroyed()) {
        scheduleLoginCheck(checkLogin);
      }
    };

    sendLoginWindowStatus(
      mainWin,
      'opening',
      { phase: 'creating-window' },
      attemptBinding.currentId
    );

    void currentLoginWindow.loadURL(loginUrl).catch((error: unknown) => {
      stopLoginTimer();
      sendLoginWindowStatus(
        mainWin,
        'open-failed',
        {
          error: error instanceof Error ? error.message : String(error)
        },
        attemptBinding.currentId
      );
      if (!currentLoginWindow.isDestroyed()) {
        currentLoginWindow.close();
      }
    });
  } catch (error) {
    stopLoginTimer();
    loginWindow = null;
    loginWindowOpening = false;
    if (activeLoginAttemptBinding === attemptBinding) {
      activeLoginAttemptBinding = null;
    }
    sendLoginWindowStatus(
      mainWin,
      'open-failed',
      {
        error: error instanceof Error ? error.message : String(error)
      },
      attemptBinding.currentId
    );
    console.error('打开登录窗口失败:', error);
  }
};

/**
 * 初始化登录窗口相关的 IPC 监听
 */
export function initializeLoginWindow() {
  ipcMain.on('open-login', (event, payload?: { attemptId?: string }) => {
    const mainWin = BrowserWindow.fromWebContents(event.sender);
    if (mainWin) {
      void openLoginWindow(mainWin, payload?.attemptId);
    }
  });
}

export default openLoginWindow;
