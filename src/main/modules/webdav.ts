/**
 * WebDAV 备份（主进程）：保存连接配置，并代渲染进程发起 WebDAV 请求（绕过 CORS）
 */
import { ipcMain, safeStorage } from 'electron';

import {
  createDefaultWebdavConfig,
  type WebdavConfig,
  type WebdavResult
} from '../../shared/webdav';
import { getSharedStore } from './config';
import { downloadBackup, testConnection, uploadBackup, WebdavError } from './webdavClient';

const STORE_KEY = 'webdav';

type StoredWebdavConfig = {
  url: string;
  username: string;
  password: string;
  /** password 是否为 safeStorage 加密后的 base64 */
  encrypted: boolean;
};

const readConfig = (): WebdavConfig => {
  const stored = getSharedStore().get(STORE_KEY) as StoredWebdavConfig | undefined;
  if (!stored) return createDefaultWebdavConfig();

  let password = stored.password || '';
  if (stored.encrypted && password) {
    try {
      password = safeStorage.decryptString(Buffer.from(password, 'base64'));
    } catch (error) {
      console.error('[webdav] 密码解密失败，需要重新填写:', error);
      password = '';
    }
  }
  return { url: stored.url || '', username: stored.username || '', password };
};

const writeConfig = (config: WebdavConfig): void => {
  const password = String(config.password ?? '');
  const encrypted = Boolean(password) && safeStorage.isEncryptionAvailable();
  const stored: StoredWebdavConfig = {
    url: String(config.url ?? '').trim(),
    username: String(config.username ?? '').trim(),
    password: encrypted ? safeStorage.encryptString(password).toString('base64') : password,
    encrypted
  };
  getSharedStore().set(STORE_KEY, stored);
};

const run = async <T>(action: (config: WebdavConfig) => Promise<T>): Promise<WebdavResult<T>> => {
  try {
    return { ok: true, data: await action(readConfig()) };
  } catch (error) {
    if (error instanceof WebdavError) {
      return { ok: false, error: error.kind, status: error.status };
    }
    console.error('[webdav] 操作失败:', error);
    return { ok: false, error: 'network' };
  }
};

export function initializeWebdav(): void {
  ipcMain.handle('webdav:get-config', () => readConfig());
  ipcMain.handle('webdav:save-config', (_, config: WebdavConfig) => writeConfig(config));
  ipcMain.handle('webdav:test', () => run(testConnection));
  ipcMain.handle('webdav:upload', (_, content: string) =>
    run((config) => uploadBackup(config, content))
  );
  ipcMain.handle('webdav:download', () => run(downloadBackup));
}
