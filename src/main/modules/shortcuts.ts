import { globalShortcut, ipcMain } from 'electron';

import { getStore } from './config';

// 添加获取平台信息的 IPC 处理程序
ipcMain.on('get-platform', (event) => {
  event.returnValue = process.platform;
});

// 定义快捷键配置接口
export interface ShortcutConfig {
  key: string;
  enabled: boolean;
  scope: 'global' | 'app';
}

export interface ShortcutsConfig {
  [key: string]: ShortcutConfig;
}

// 定义默认快捷键
export const defaultShortcuts: ShortcutsConfig = {
  togglePlay: { key: 'CommandOrControl+Alt+P', enabled: true, scope: 'global' },
  prevPlay: { key: 'Alt+Left', enabled: true, scope: 'global' },
  nextPlay: { key: 'Alt+Right', enabled: true, scope: 'global' },
  volumeUp: { key: 'Alt+Up', enabled: true, scope: 'app' },
  volumeDown: { key: 'Alt+Down', enabled: true, scope: 'app' },
  toggleFavorite: { key: 'CommandOrControl+Alt+L', enabled: true, scope: 'app' },
  toggleWindow: { key: 'CommandOrControl+Alt+Shift+M', enabled: true, scope: 'global' }
};

let mainWindowRef: Electron.BrowserWindow | null = null;

// 注册快捷键
export function registerShortcuts(
  mainWindow: Electron.BrowserWindow,
  shortcutsConfig?: ShortcutsConfig
) {
  mainWindowRef = mainWindow;
  const store = getStore();
  const shortcuts =
    shortcutsConfig || (store.get('shortcuts') as ShortcutsConfig) || defaultShortcuts;

  // 注销所有已注册的快捷键
  globalShortcut.unregisterAll();

  // 对旧格式数据进行兼容处理
  if (shortcuts && typeof shortcuts.togglePlay === 'string') {
    // 将 shortcuts 强制转换为 unknown，再转为 Record<string, string>
    const oldShortcuts = { ...shortcuts } as unknown as Record<string, string>;
    const newShortcuts: ShortcutsConfig = {};

    Object.entries(oldShortcuts).forEach(([key, value]) => {
      newShortcuts[key] = {
        key: value,
        enabled: true,
        scope: ['volumeUp', 'volumeDown', 'toggleFavorite'].includes(key) ? 'app' : 'global'
      };
    });

    store.set('shortcuts', newShortcuts);
    registerShortcuts(mainWindow, newShortcuts);
    return;
  }

  // 注册全局快捷键
  Object.entries(shortcuts).forEach(([action, config]) => {
    const { key, enabled, scope } = config as ShortcutConfig;

    // 只注册启用且作用域为全局的快捷键
    if (!enabled || scope !== 'global') return;

    try {
      switch (action) {
        case 'toggleWindow':
          globalShortcut.register(key, () => {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
            }
          });
          break;
        default:
          globalShortcut.register(key, () => {
            mainWindow.webContents.send('global-shortcut', action);
          });
          break;
      }
    } catch (error) {
      console.error(`注册快捷键 ${key} 失败:`, error);
    }
  });

  // 通知渲染进程更新应用内快捷键
  mainWindow.webContents.send('update-app-shortcuts', shortcuts);
}

// 初始化快捷键
export function initializeShortcuts(mainWindow: Electron.BrowserWindow) {
  mainWindowRef = mainWindow;
  registerShortcuts(mainWindow);

  // 监听禁用快捷键事件
  ipcMain.on('disable-shortcuts', () => {
    globalShortcut.unregisterAll();
  });

  // 监听启用快捷键事件
  ipcMain.on('enable-shortcuts', () => {
    if (mainWindowRef) {
      registerShortcuts(mainWindowRef);
    }
  });

  // 监听快捷键更新事件
  ipcMain.on('update-shortcuts', (_, shortcutsConfig: ShortcutsConfig) => {
    if (mainWindowRef) {
      registerShortcuts(mainWindowRef, shortcutsConfig);
    }
  });
}
