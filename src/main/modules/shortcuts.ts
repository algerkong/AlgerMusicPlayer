import { type BrowserWindow, globalShortcut, ipcMain } from 'electron';

import {
  createDefaultShortcuts,
  hasShortcutAction,
  isModifierOnlyShortcut,
  normalizeShortcutAccelerator,
  type ShortcutAction,
  shortcutActionOrder,
  type ShortcutsConfig
} from '../../shared/shortcuts';
import { getStore } from './config';

type ShortcutRegistrationFailure = {
  action: ShortcutAction;
  key: string;
  reason: 'invalid' | 'occupied';
};

type ShortcutRegistrationResult = {
  success: boolean;
  failed: ShortcutRegistrationFailure[];
};

let mainWindowRef: BrowserWindow | null = null;
let shortcutIpcReady = false;

const managedGlobalShortcuts = new Map<ShortcutAction, string>();

function hasAvailableMainWindow(): boolean {
  return Boolean(mainWindowRef && !mainWindowRef.isDestroyed());
}

/** 始终使用内置默认；覆盖升级前自定义/禁用的持久化配置 */
function forceBuiltinShortcuts(): ShortcutsConfig {
  const shortcuts = createDefaultShortcuts();
  try {
    getStore().set('shortcuts', shortcuts);
  } catch (error) {
    console.error('[Shortcuts] 写入默认快捷键失败:', error);
  }
  return shortcuts;
}

function unregisterManagedGlobalShortcuts() {
  managedGlobalShortcuts.forEach((accelerator) => {
    try {
      globalShortcut.unregister(accelerator);
    } catch (error) {
      console.error(`[Shortcuts] 注销快捷键失败: ${accelerator}`, error);
    }
  });
  managedGlobalShortcuts.clear();
}

function handleShortcutAction(action: ShortcutAction) {
  if (!hasAvailableMainWindow()) {
    return;
  }

  const mainWindow = mainWindowRef!;

  if (action === 'toggleWindow') {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow.webContents.send('global-shortcut', action);
}

function registerManagedGlobalShortcuts(shortcuts: ShortcutsConfig): ShortcutRegistrationResult {
  unregisterManagedGlobalShortcuts();

  const failed: ShortcutRegistrationFailure[] = [];

  shortcutActionOrder.forEach((action) => {
    const config = shortcuts[action];
    if (!config.enabled || config.scope !== 'global') {
      return;
    }

    const accelerator = normalizeShortcutAccelerator(config.key);
    if (!accelerator || isModifierOnlyShortcut(accelerator)) {
      failed.push({
        action,
        key: config.key,
        reason: 'invalid'
      });
      return;
    }

    try {
      const registered = globalShortcut.register(accelerator, () => {
        handleShortcutAction(action);
      });

      if (!registered) {
        failed.push({
          action,
          key: accelerator,
          reason: 'occupied'
        });
        return;
      }

      managedGlobalShortcuts.set(action, accelerator);
    } catch (error) {
      console.error(`[Shortcuts] 注册快捷键失败: ${accelerator}`, error);
      failed.push({
        action,
        key: accelerator,
        reason: 'invalid'
      });
    }
  });

  return {
    success: failed.length === 0,
    failed
  };
}

function applyBuiltinShortcuts(): ShortcutRegistrationResult {
  const shortcuts = forceBuiltinShortcuts();
  return registerManagedGlobalShortcuts(shortcuts);
}

function setupShortcutIpcHandlers() {
  if (shortcutIpcReady) {
    return;
  }

  shortcutIpcReady = true;

  // 兼容旧调用；平台信息 preload 已可直读 process.platform
  ipcMain.on('get-platform', (event) => {
    event.returnValue = process.platform;
  });
}

export function registerShortcuts(mainWindow: BrowserWindow, _shortcutsConfig?: ShortcutsConfig) {
  mainWindowRef = mainWindow;
  return applyBuiltinShortcuts();
}

export function initializeShortcuts(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;
  setupShortcutIpcHandlers();
  applyBuiltinShortcuts();
}

export function isShortcutActionSupported(action: string): action is ShortcutAction {
  return hasShortcutAction(action);
}

export { createDefaultShortcuts as defaultShortcuts };
