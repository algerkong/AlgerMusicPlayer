import { app } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getStore } from './config';

/** 允许根缓存：避免每次 local:// / IPC 都扫盘 */
const ROOTS_TTL_MS = 30_000;
let rootsCache: { roots: string[]; expiresAt: number } | null = null;

/** 已判定路径缓存：同一缓存文件的 Range 请求极多，必须命中内存 */
const PATH_CACHE_TTL_MS = 60_000;
const PATH_CACHE_MAX = 512;
const pathCache = new Map<string, { value: string | null; expiresAt: number }>();

export function invalidatePathGuardCaches(): void {
  rootsCache = null;
  pathCache.clear();
}

/**
 * 解析真实路径；路径不存在时沿父目录 realpath，防止 symlink 逃逸。
 * 对已存在文件只做一次 realpathSync。
 */
function resolveRealCandidate(inputPath: string): string {
  const absolute = path.resolve(inputPath);
  try {
    return fs.realpathSync(absolute);
  } catch {
    const trailing: string[] = [];
    let current = absolute;
    // 最多向上 32 层，避免异常路径死循环
    for (let i = 0; i < 32; i++) {
      const parent = path.dirname(current);
      if (parent === current) {
        return absolute;
      }
      trailing.unshift(path.basename(current));
      try {
        // 优先 realpath，不存在再继续向上（少一次 existsSync）
        const realParent = fs.realpathSync(parent);
        return path.join(realParent, ...trailing);
      } catch {
        current = parent;
      }
    }
    return absolute;
  }
}

function addRoot(roots: Set<string>, dir?: string | null): void {
  if (!dir || typeof dir !== 'string') return;
  const trimmed = dir.trim();
  if (!trimmed) return;
  const resolved = path.resolve(trimmed);
  roots.add(resolved);
  try {
    roots.add(fs.realpathSync(resolved));
  } catch {
    // 目录尚不存在时只保留 resolve 结果
  }
}

function computeAllowedRoots(): string[] {
  const roots = new Set<string>();

  try {
    const store = getStore();
    addRoot(roots, store?.get('set.downloadPath') as string | undefined);
    addRoot(roots, store?.get('set.diskCacheDir') as string | undefined);
  } catch {
    // store 未就绪
  }

  addRoot(roots, app.getPath('downloads'));
  addRoot(roots, path.join(app.getPath('userData'), 'cache'));
  addRoot(roots, path.join(app.getPath('userData'), 'ly-music-cache'));
  addRoot(roots, path.join(app.getPath('userData'), 'AudioCache'));
  addRoot(roots, path.join(os.tmpdir(), 'LYMusicPlayerTemp'));

  return [...roots];
}

/**
 * 应用允许访问的文件系统根目录（带短 TTL 缓存）。
 */
export function getAllowedRoots(): string[] {
  const now = Date.now();
  if (rootsCache && rootsCache.expiresAt > now) {
    return rootsCache.roots;
  }
  const roots = computeAllowedRoots();
  rootsCache = { roots, expiresAt: now + ROOTS_TTL_MS };
  return roots;
}

/** path 是否位于 root 之内（两边应为已 resolve/realpath 的绝对路径） */
export function isPathInsideRoot(filePath: string, root: string): boolean {
  const normalizedFile = path.normalize(filePath);
  const normalizedRoot = path.normalize(root);

  if (process.platform === 'win32') {
    const file = normalizedFile.toLowerCase();
    const r = normalizedRoot.toLowerCase();
    if (file === r) return true;
    const prefix = r.endsWith('\\') || r.endsWith('/') ? r : r + path.sep;
    return file.startsWith(prefix.toLowerCase());
  }

  if (normalizedFile === normalizedRoot) return true;
  const prefix = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;
  return normalizedFile.startsWith(prefix);
}

function cachePathResult(key: string, value: string | null): string | null {
  if (pathCache.size >= PATH_CACHE_MAX) {
    // 简单淘汰：删最早插入的一半
    const drop = Math.floor(PATH_CACHE_MAX / 4);
    let i = 0;
    for (const k of pathCache.keys()) {
      pathCache.delete(k);
      if (++i >= drop) break;
    }
  }
  pathCache.set(key, { value, expiresAt: Date.now() + PATH_CACHE_TTL_MS });
  return value;
}

/**
 * 将 renderer/协议提供的路径约束到允许根内。
 * 失败返回 null。热路径（local:// Range）有内存缓存。
 */
export function resolveSafePath(input: unknown, roots?: string[]): string | null {
  if (typeof input !== 'string' || !input || input.includes('\0')) {
    return null;
  }

  // 自定义 roots 时不走全局缓存（调用方少见）
  if (!roots) {
    const hit = pathCache.get(input);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }
  }

  let candidate: string;
  try {
    candidate = resolveRealCandidate(input);
  } catch {
    return roots ? null : cachePathResult(input, null);
  }

  const allowed = roots ?? getAllowedRoots();
  for (const root of allowed) {
    if (isPathInsideRoot(candidate, root)) {
      return roots ? candidate : cachePathResult(input, candidate);
    }
  }
  return roots ? null : cachePathResult(input, null);
}

/** 解析 local:// URL 为绝对路径字符串（未做安全校验） */
export function parseLocalProtocolUrl(url: string): string | null {
  try {
    let filePath = decodeURIComponent(url.replace(/^local:\/\/\/?/, ''));

    // Windows 路径：/C:/... → C:/...
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
