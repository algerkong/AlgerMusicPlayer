import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import Store from 'electron-store';
import * as path from 'path';

import { createDefaultShortcuts, type ShortcutsConfig } from '../../shared/shortcuts';
import set from '../set.json';

type SetConfig = {
  isProxy: boolean;
  proxyConfig: {
    enable: boolean;
    protocol: string;
    host: string;
    port: number;
  };
  noAnimate: boolean;
  animationSpeed: number;
  author: string;
  authorUrl: string;
  closeAction: 'ask' | 'minimize' | 'close';
  musicQuality: string;
  fontFamily: string;
  fontScope: 'global' | 'lyric';
  language: string;
  showTopAction: boolean;
  enableGpuAcceleration: boolean;
  downloadPath: string;
  enableDiskCache: boolean;
  diskCacheDir: string;
  diskCacheMaxSizeMB: number;
  diskCacheCleanupPolicy: 'lru' | 'fifo';
  [key: string]: unknown;
};

interface StoreType {
  set: SetConfig;
  shortcuts: ShortcutsConfig;
}

/**
 * 文件系统信任根：仅可读；写入只能由主进程目录对话框落盘。
 * 禁止经 settings:set 扩大 pathGuard 允许根（防 XSS→本地任意读）。
 */
const SETTINGS_TRUST_ROOT_KEYS = new Set(['downloadPath', 'diskCacheDir']);

/**
 * renderer 可通过 settings:set 写入的字段白名单（不含信任根）。
 * 不含 musicSourceSession 等敏感顶层键；敏感数据不得进入 set。
 */
const SETTINGS_WRITABLE_KEYS = new Set([
  'isProxy',
  'proxyConfig',
  'noAnimate',
  'animationSpeed',
  'author',
  'authorUrl',
  'closeAction',
  'musicQuality',
  'fontFamily',
  'fontScope',
  'autoPlay',
  'downloadNameFormat',
  'downloadSeparator',
  'downloadSaveLyric',
  'language',
  'alwaysShowDownloadButton',
  'unlimitedDownload',
  'showTopAction',
  'contentZoomFactor',
  'autoTheme',
  'manualTheme',
  'isMenuExpanded',
  'enableGpuAcceleration',
  'enableDiskCache',
  'diskCacheMaxSizeMB',
  'diskCacheCleanupPolicy',
  'tabletMode'
]);

/** settings:get 可读：可写字段 + 信任根路径（仅展示） */
const SETTINGS_READABLE_KEYS = new Set([...SETTINGS_WRITABLE_KEYS, ...SETTINGS_TRUST_ROOT_KEYS]);

// 模块级单例：主进程所有模块共享同一个 config.json Store 实例。
// 多个独立 Store 实例并发读写同一文件，会在 Windows 上与杀毒/云同步的文件锁
// 叠加触发 EBUSY 未捕获异常（#714）
const store = new Store<StoreType>({
  name: 'config',
  defaults: {
    set: set as SetConfig,
    shortcuts: createDefaultShortcuts()
  }
});

let initialized = false;

function pickSettings(input: unknown, allowed: Set<string>): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(src)) {
    if (allowed.has(key)) {
      out[key] = src[key];
    }
  }
  return out;
}

function invalidatePathGuardIfAvailable(): void {
  try {
    require('./pathGuard').invalidatePathGuardCaches();
  } catch {
    // 忽略
  }
}

function getPublicSettings(): Record<string, unknown> {
  try {
    const current = (store.get('set') || {}) as Record<string, unknown>;
    return pickSettings(current, SETTINGS_READABLE_KEYS);
  } catch (error) {
    console.error('[config] 读取设置失败:', error);
    return {};
  }
}

function mergePublicSettings(partial: unknown): Record<string, unknown> {
  // 明确丢弃信任根字段，防止 renderer 经 setSettings 扩大 path jail
  const allowed = pickSettings(partial, SETTINGS_WRITABLE_KEYS);
  if (!Object.keys(allowed).length) {
    return getPublicSettings();
  }
  try {
    const current = (store.get('set') || {}) as Record<string, unknown>;
    const merged = { ...current, ...allowed };
    store.set('set', merged as SetConfig);
    if ('enableDiskCache' in allowed) {
      invalidatePathGuardIfAvailable();
    }
  } catch (error) {
    console.error('[config] 写入设置失败:', error);
  }
  return getPublicSettings();
}

async function selectAndPersistTrustRoot(
  event: Electron.IpcMainInvokeEvent,
  storeKey: 'downloadPath' | 'diskCacheDir',
  title: string
): Promise<{ canceled: true } | { canceled: false; path: string }> {
  const win = BrowserWindow.fromWebContents(event.sender);
  const dialogOpts = {
    properties: ['openDirectory' as const],
    title
  };
  const result = win
    ? await dialog.showOpenDialog(win, dialogOpts)
    : await dialog.showOpenDialog(dialogOpts);
  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }
  const selected = path.resolve(result.filePaths[0]);
  store.set(`set.${storeKey}`, selected);
  invalidatePathGuardIfAvailable();
  return { canceled: false, path: selected };
}

/**
 * 初始化配置管理（幂等：重复调用不会重复注册 IPC 监听）
 */
export function initializeConfig() {
  if (initialized) {
    return store;
  }
  initialized = true;

  try {
    store.get('set.downloadPath') || store.set('set.downloadPath', app.getPath('downloads'));
    store.get('set.diskCacheDir') ||
      store.set('set.diskCacheDir', path.join(app.getPath('userData'), 'cache'));
    if (store.get('set.diskCacheMaxSizeMB') === undefined) {
      store.set('set.diskCacheMaxSizeMB', 4096);
    }
    if (!store.get('set.diskCacheCleanupPolicy')) {
      store.set('set.diskCacheCleanupPolicy', 'lru');
    }
    if (store.get('set.enableDiskCache') === undefined) {
      store.set('set.enableDiskCache', true);
    }
    // GPU 始终开启；纠正旧版可能关掉的配置，设置页不暴露开关
    store.set('set.enableGpuAcceleration', true);
  } catch (error) {
    console.error('[config] 初始化默认配置失败:', error);
  }

  // 字段级设置 API（禁止任意 key 读写整个 store；信任根不可写）
  ipcMain.on('settings:get', (event) => {
    event.returnValue = getPublicSettings();
  });

  ipcMain.on('settings:set', (event, partial: unknown) => {
    event.returnValue = mergePublicSettings(partial);
  });

  // 信任根仅能经主进程对话框写入
  ipcMain.handle('settings:select-download-path', (event) =>
    selectAndPersistTrustRoot(event, 'downloadPath', '选择下载目录')
  );
  ipcMain.handle('settings:select-disk-cache-dir', (event) =>
    selectAndPersistTrustRoot(event, 'diskCacheDir', '选择缓存目录')
  );

  // GPU加速设置更新处理
  // 注意：GPU加速设置必须在应用启动时在app.ready之前设置才能生效
  ipcMain.on('update-gpu-acceleration', (event, enabled: boolean) => {
    try {
      console.log('GPU加速设置更新:', enabled);
      store.set('set.enableGpuAcceleration', enabled);

      // GPU加速设置需要重启应用才能生效
      event.sender.send('gpu-acceleration-updated', enabled);
      console.log('GPU加速设置已保存，重启应用后生效');
    } catch (error) {
      console.error('GPU加速设置更新失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      event.sender.send('gpu-acceleration-update-error', errorMessage);
    }
  });

  return store;
}

export function getStore() {
  return store;
}

/**
 * 供主进程其他模块共享同一个 config.json Store 实例
 * （不要再 new Store()，多实例并发读写是 #714 EBUSY 崩溃的诱因之一）
 */
export function getSharedStore(): Store<Record<string, unknown>> {
  return store as unknown as Store<Record<string, unknown>>;
}
