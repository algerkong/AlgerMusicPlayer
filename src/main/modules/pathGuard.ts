import { app } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getStore } from './config';

/**
 * 解析真实路径；路径不存在时沿父目录 realpath，防止 symlink 逃逸。
 */
function resolveRealCandidate(inputPath: string): string {
  const absolute = path.resolve(inputPath);
  try {
    return fs.realpathSync(absolute);
  } catch {
    const trailing: string[] = [];
    let current = absolute;
    while (true) {
      const parent = path.dirname(current);
      if (parent === current) {
        return absolute;
      }
      trailing.unshift(path.basename(current));
      try {
        if (fs.existsSync(parent)) {
          return path.join(fs.realpathSync(parent), ...trailing);
        }
      } catch {
        return absolute;
      }
      current = parent;
    }
  }
}

function addRoot(roots: Set<string>, dir?: string | null): void {
  if (!dir || typeof dir !== 'string') return;
  const trimmed = dir.trim();
  if (!trimmed) return;
  const resolved = path.resolve(trimmed);
  roots.add(resolved);
  try {
    if (fs.existsSync(resolved)) {
      roots.add(fs.realpathSync(resolved));
    }
  } catch {
    // ignore
  }
}

/**
 * 应用允许访问的文件系统根目录（下载、磁盘缓存、音源缓存、临时下载等）。
 * 不包含整个 userData，避免 local:// 读出配置/会话。
 */
export function getAllowedRoots(): string[] {
  const roots = new Set<string>();

  try {
    const store = getStore();
    addRoot(roots, store?.get('set.downloadPath') as string | undefined);
    addRoot(roots, store?.get('set.diskCacheDir') as string | undefined);
  } catch {
    // store 未就绪时仍加入默认根
  }

  addRoot(roots, app.getPath('downloads'));
  addRoot(roots, path.join(app.getPath('userData'), 'cache'));
  addRoot(roots, path.join(app.getPath('userData'), 'ly-music-cache'));
  addRoot(roots, path.join(app.getPath('userData'), 'AudioCache'));
  addRoot(roots, path.join(os.tmpdir(), 'LYMusicPlayerTemp'));

  return [...roots];
}

/** path 是否位于 root 之内（含 root 自身） */
export function isPathInsideRoot(filePath: string, root: string): boolean {
  const normalizedFile = path.resolve(filePath);
  const normalizedRoot = path.resolve(root);
  const relative = path.relative(normalizedRoot, normalizedFile);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * 将 renderer/协议提供的路径约束到允许根内。
 * 失败返回 null（调用方应拒绝操作）。
 */
export function resolveSafePath(input: unknown, roots?: string[]): string | null {
  if (typeof input !== 'string' || !input || input.includes('\0')) {
    return null;
  }

  let candidate: string;
  try {
    candidate = resolveRealCandidate(input);
  } catch {
    return null;
  }

  const allowed = roots ?? getAllowedRoots();
  for (const root of allowed) {
    if (isPathInsideRoot(candidate, root)) {
      return candidate;
    }
  }
  return null;
}

/** 解析 local:// URL 为绝对路径字符串（未做安全校验） */
export function parseLocalProtocolUrl(url: string): string | null {
  try {
    let filePath = decodeURIComponent(url.replace(/^local:\/\/\/?/, ''));

    // Windows: /C:/... → C:/...
    if (/^\/[a-zA-Z]:\//.test(filePath)) {
      filePath = filePath.slice(1);
    }

    // POSIX: 保证绝对路径
    if (process.platform !== 'win32' && !filePath.startsWith('/')) {
      filePath = `/${filePath}`;
    }

    return path.normalize(filePath);
  } catch {
    return null;
  }
}
