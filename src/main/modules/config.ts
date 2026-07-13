import { app, ipcMain } from 'electron';
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
 * renderer 可通过 settings:get / settings:set 触达的字段白名单。
 * 不含 musicSourceSession 等敏感顶层键；敏感数据不得进入 set。
 */
const SETTINGS_ALLOWED_KEYS = new Set([
  'isProxy',
  'proxyConfig',
  'noAnimate',
  'animationSpeed',
  'author',
  'authorUrl',
  'closeAction',
  'musicQuality',
  'lyricTranslationEngine',
  'fontFamily',
  'fontScope',
  'autoPlay',
  'downloadPath',
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
  'diskCacheDir',
  'diskCacheMaxSizeMB',
  'diskCacheCleanupPolicy',
  'tabletMode'
]);

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

function pickAllowedSettings(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(src)) {
    if (SETTINGS_ALLOWED_KEYS.has(key)) {
      out[key] = src[key];
    }
  }
  return out;
}

function getPublicSettings(): Record<string, unknown> {
  try {
    const current = (store.get('set') || {}) as Record<string, unknown>;
    return pickAllowedSettings(current);
  } catch (error) {
    console.error('[config] 读取设置失败:', error);
    return {};
  }
}

function mergePublicSettings(partial: unknown): Record<string, unknown> {
  const allowed = pickAllowedSettings(partial);
  if (!Object.keys(allowed).length) {
    return getPublicSettings();
  }
  try {
    const current = (store.get('set') || {}) as Record<string, unknown>;
    const merged = { ...current, ...allowed };
    // 只写回白名单字段 + 保留已有但未在白名单的内部字段？为安全起见：
    // 合并时保留 current 中非敏感的全部已有键，但仅用 allowed 覆盖白名单字段。
    store.set('set', merged as SetConfig);
    // 下载/缓存目录变更后刷新 path jail 缓存（require 避免与 pathGuard 循环依赖）
    if ('downloadPath' in allowed || 'diskCacheDir' in allowed || 'enableDiskCache' in allowed) {
      try {
         
        require('./pathGuard').invalidatePathGuardCaches();
      } catch {
        // ignore
      }
    }
  } catch (error) {
    console.error('[config] 写入设置失败:', error);
  }
  return getPublicSettings();
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
    // GPU 始终开启，设置页不再暴露开关（纠正旧版关闭过的配置）
    store.set('set.enableGpuAcceleration', true);
  } catch (error) {
    console.error('[config] 初始化默认配置失败:', error);
  }

  // 字段级设置 API（禁止任意 key 读写整个 store）
  ipcMain.on('settings:get', (event) => {
    event.returnValue = getPublicSettings();
  });

  ipcMain.on('settings:set', (event, partial: unknown) => {
    event.returnValue = mergePublicSettings(partial);
  });

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
