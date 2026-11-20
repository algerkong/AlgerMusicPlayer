/**
 * WebDAV 备份客户端（不依赖 electron，便于单测）
 * 远端只读写一个文件：<用户目录>/AlgerMusicPlayer/backup.json
 */
import fetch from 'node-fetch';

import type { WebdavConfig, WebdavErrorKind } from '../../shared/webdav';

const BACKUP_DIR = 'AlgerMusicPlayer';
const BACKUP_FILE = 'backup.json';
const REQUEST_TIMEOUT_MS = 30000;

export class WebdavError extends Error {
  constructor(
    public kind: WebdavErrorKind,
    public status?: number
  ) {
    super(status ? `WebDAV ${kind} (${status})` : `WebDAV ${kind}`);
  }
}

const getBaseUrl = (config: WebdavConfig): string => {
  let parsed: URL;
  try {
    parsed = new URL(config.url.trim());
  } catch {
    throw new WebdavError('invalidUrl');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new WebdavError('invalidUrl');
  }
  return parsed.href.replace(/\/+$/, '');
};

const request = async (
  config: WebdavConfig,
  method: string,
  url: string,
  options: { headers?: Record<string, string>; body?: string } = {}
) => {
  const headers: Record<string, string> = { ...options.headers };
  if (config.username) {
    const token = Buffer.from(`${config.username}:${config.password}`, 'utf8').toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body,
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) {
      throw new WebdavError('auth', response.status);
    }
    return response;
  } catch (error) {
    if (error instanceof WebdavError) throw error;
    console.error(`[webdav] ${method} 请求失败:`, error);
    throw new WebdavError('network');
  } finally {
    clearTimeout(timer);
  }
};

export const testConnection = async (config: WebdavConfig): Promise<void> => {
  const response = await request(config, 'PROPFIND', `${getBaseUrl(config)}/`, {
    headers: { Depth: '0' }
  });
  if (!response.ok) {
    throw new WebdavError('http', response.status);
  }
};

export const uploadBackup = async (config: WebdavConfig, content: string): Promise<void> => {
  const dirUrl = `${getBaseUrl(config)}/${BACKUP_DIR}`;
  // 目录已存在时各家服务端返回 405/301 等不同状态，这里不判定，由后面的 PUT 决定成败
  await request(config, 'MKCOL', `${dirUrl}/`);

  const response = await request(config, 'PUT', `${dirUrl}/${BACKUP_FILE}`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: content
  });
  if (!response.ok) {
    throw new WebdavError('http', response.status);
  }
};

/** 远端还没有备份文件时返回 null */
export const downloadBackup = async (config: WebdavConfig): Promise<string | null> => {
  const response = await request(
    config,
    'GET',
    `${getBaseUrl(config)}/${BACKUP_DIR}/${BACKUP_FILE}`
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new WebdavError('http', response.status);
  }
  return await response.text();
};
