import { type BrowserWindow, globalShortcut, ipcMain } from 'electron';

import {
  defaultShortcuts,
  getReservedAccelerators,
  getShortcutConflicts,
  hasShortcutAction,
  isModifierOnlyShortcut,
  normalizeShortcutAccelerator,
  normalizeShortcutsConfig,
  type ShortcutAction,
  shortcutActionOrder,
  type ShortcutPlatform,
  type ShortcutsConfig,
  type ShortcutScope
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

type ShortcutValidationReason = 'invalid' | 'conflict' | 'reserved';

type ShortcutValidationIssue = {
  action: ShortcutAction;
  key: string;
  scope: ShortcutScope;
  reason: ShortcutValidationReason;
  conflictWith?: ShortcutAction;
};

type ShortcutValidationResult = {
  shortcuts: ShortcutsConfig;
  hasBlockingIssue: boolean;
  issues: ShortcutValidationIssue[];
};

type ShortcutSaveResult = {
  ok: boolean;
  validation: ShortcutValidationResult;
  registration: ShortcutRegistrationResult;
};

let mainWindowRef: BrowserWindow | null = null;
let shortcutsEnabled = true;
let shortcutIpcReady = false;

const managedGlobalShortcuts = new Map<ShortcutAction, string>();

function currentPlatform(): ShortcutPlatform {
  if (
    process.platform === 'darwin' ||
    process.platform === 'win32' ||
    process.platform === 'linux'
  ) {
    return process.platform;
  }
  return 'linux';
}

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

function validateShortcuts(rawShortcuts: unknown): ShortcutValidationResult {
  const shortcuts = normalizeShortcutsConfig(rawShortcuts);
  const issues: ShortcutValidationIssue[] = [];
  const issueKeys = new Set<string>();

  const rawShortcutMap =
    rawShortcuts && typeof rawShortcuts === 'object'
      ? (rawShortcuts as Record<string, unknown>)
      : {};

  const pushIssue = (issue: ShortcutValidationIssue) => {
    const issueKey = `${issue.reason}:${issue.action}:${issue.scope}:${issue.key}:${issue.conflictWith ?? ''}`;
    if (issueKeys.has(issueKey)) {
      return;
    }
    issueKeys.add(issueKey);
    issues.push(issue);
  };

  shortcutActionOrder.forEach((action) => {
    const rawActionConfig = rawShortcutMap[action];
    if (!rawActionConfig) {
      return;
    }

    const rawKey =
      typeof rawActionConfig === 'string'
        ? rawActionConfig
        : typeof rawActionConfig === 'object' && rawActionConfig !== null
          ? (rawActionConfig as { key?: unknown }).key
          : null;

    if (typeof rawKey !== 'string') {
      return;
    }

    const normalizedKey = normalizeShortcutAccelerator(rawKey);
    if (!normalizedKey || isModifierOnlyShortcut(rawKey)) {
      pushIssue({
        action,
        key: rawKey,
        scope: shortcuts[action].scope,
        reason: 'invalid'
      });
    }
  });

  const conflicts = getShortcutConflicts(shortcuts);
  conflicts.forEach((conflict) => {
    conflict.actions.forEach((action, index) => {
      const conflictWith = conflict.actions[(index + 1) % conflict.actions.length];
      pushIssue({
        action,
        key: conflict.key,
        scope: conflict.scope,
        reason: 'conflict',
        conflictWith
      });
    });
  });

  const reservedAccelerators = new Set(getReservedAccelerators(currentPlatform()));
  shortcutActionOrder.forEach((action) => {
    const config = shortcuts[action];
    if (!config.enabled || config.scope !== 'global') {
      return;
    }

    const accelerator = normalizeShortcutAccelerator(config.key);
    if (accelerator && reservedAccelerators.has(accelerator)) {
      pushIssue({
        action,
        key: accelerator,
        scope: config.scope,
        reason: 'reserved'
      });
    }
  });

  return {
    shortcuts,
    hasBlockingIssue: issues.length > 0,
    issues
  };
}

function applyShortcuts(shortcuts: ShortcutsConfig): ShortcutRegistrationResult {
  const registration = registerManagedGlobalShortcuts(shortcuts);
  emitShortcutsChanged(shortcuts, registration);
  return registration;
}

function saveShortcuts(rawShortcuts: unknown): ShortcutSaveResult {
  const validation = validateShortcuts(rawShortcuts);

  if (validation.hasBlockingIssue) {
    return {
      ok: false,
      validation,
      registration: {
        success: false,
        failed: []
      }
    };
  }

  persistShortcuts(validation.shortcuts);
  const registration = applyShortcuts(validation.shortcuts);

  return {
    ok: true,
    validation,
    registration
  };
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

  ipcMain.on('update-shortcuts', (_, shortcutsConfig: unknown) => {
    saveShortcuts(shortcutsConfig);
  });

  ipcMain.handle('shortcuts:get-config', () => {
    return getStoredShortcuts();
  });

  ipcMain.handle('shortcuts:validate', (_, shortcutsConfig: unknown) => {
    return validateShortcuts(shortcutsConfig);
  });

  ipcMain.handle('shortcuts:save', (_, shortcutsConfig: unknown) => {
    return saveShortcuts(shortcutsConfig);
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
