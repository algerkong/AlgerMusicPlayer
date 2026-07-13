import { type BrowserWindow, globalShortcut, ipcMain } from 'electron';

import {
  defaultShortcuts,
  hasShortcutAction,
  isModifierOnlyShortcut,
  normalizeShortcutAccelerator,
  normalizeShortcutsConfig,
  type ShortcutAction,
  shortcutActionOrder,
  type ShortcutsConfig
} from '../../shared/shortcuts';
import { getStore } from './config';

type ShortcutRegistrationFailureReason = 'invalid' | 'occupied';

type ShortcutRegistrationFailure = {
  action: ShortcutAction;
  key: string;
  reason: ShortcutRegistrationFailureReason;
};

type ShortcutRegistrationResult = {
  success: boolean;
  failed: ShortcutRegistrationFailure[];
};

let mainWindowRef: BrowserWindow | null = null;
let shortcutsEnabled = true;
let shortcutIpcReady = false;

const managedGlobalShortcuts = new Map<ShortcutAction, string>();

function hasAvailableMainWindow(): boolean {
  return Boolean(mainWindowRef && !mainWindowRef.isDestroyed());
}

function isShortcutsConfigEqual(left: ShortcutsConfig, right: ShortcutsConfig): boolean {
  return shortcutActionOrder.every((action) => {
    const leftConfig = left[action];
    const rightConfig = right[action];
    return (
      leftConfig.key === rightConfig.key &&
      leftConfig.enabled === rightConfig.enabled &&
      leftConfig.scope === rightConfig.scope
    );
  });
}

function getStoredShortcuts(): ShortcutsConfig {
  const store = getStore();
  const rawShortcuts = store.get('shortcuts');
  const normalizedShortcuts = normalizeShortcutsConfig(rawShortcuts);

  const serializedRaw = JSON.stringify(rawShortcuts ?? null);
  const serializedNormalized = JSON.stringify(normalizedShortcuts);

  if (serializedRaw !== serializedNormalized) {
    store.set('shortcuts', normalizedShortcuts);
  }

  return normalizedShortcuts;
}

function persistShortcuts(shortcuts: ShortcutsConfig) {
  const store = getStore();
  const currentShortcuts = normalizeShortcutsConfig(store.get('shortcuts'));

  if (!isShortcutsConfigEqual(currentShortcuts, shortcuts)) {
    store.set('shortcuts', shortcuts);
  }
}

function emitShortcutsChanged(
  shortcuts: ShortcutsConfig,
  registration: ShortcutRegistrationResult
): void {
  if (!hasAvailableMainWindow()) {
    return;
  }

  mainWindowRef!.webContents.send('update-app-shortcuts', shortcuts);
  mainWindowRef!.webContents.send('shortcuts-updated', shortcuts, registration);
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

  if (!shortcutsEnabled) {
    return {
      success: true,
      failed
    };
  }

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

function applyShortcuts(shortcuts: ShortcutsConfig): ShortcutRegistrationResult {
  const registration = registerManagedGlobalShortcuts(shortcuts);
  emitShortcutsChanged(shortcuts, registration);
  return registration;
}

function setupShortcutIpcHandlers() {
  if (shortcutIpcReady) {
    return;
  }

  shortcutIpcReady = true;

  ipcMain.on('get-platform', (event) => {
    event.returnValue = process.platform;
  });

  ipcMain.on('disable-shortcuts', () => {
    shortcutsEnabled = false;
    unregisterManagedGlobalShortcuts();
  });

  ipcMain.on('enable-shortcuts', () => {
    shortcutsEnabled = true;
    const shortcuts = getStoredShortcuts();
    applyShortcuts(shortcuts);
  });

  // 无自定义设置 UI：仅读取配置供应用内快捷键使用
  ipcMain.handle('shortcuts:get-config', () => {
    return getStoredShortcuts();
  });
}

export function registerShortcuts(mainWindow: BrowserWindow, shortcutsConfig?: ShortcutsConfig) {
  mainWindowRef = mainWindow;

  const shortcuts = shortcutsConfig
    ? normalizeShortcutsConfig(shortcutsConfig)
    : getStoredShortcuts();

  if (shortcutsConfig) {
    persistShortcuts(shortcuts);
  }

  return applyShortcuts(shortcuts);
}

export function initializeShortcuts(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;
  setupShortcutIpcHandlers();

  const shortcuts = getStoredShortcuts();
  applyShortcuts(shortcuts);
}

export function isShortcutActionSupported(action: string): action is ShortcutAction {
  return hasShortcutAction(action);
}

export { defaultShortcuts };
