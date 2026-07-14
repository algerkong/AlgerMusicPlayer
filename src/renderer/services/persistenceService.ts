/**
 * 版本化持久化服务：统一 localStorage 读写入口。
 * 每个 schema 声明 owner、version、migrations；业务勿直接 localStorage.setItem 关键状态。
 */

export type PersistOwner = 'settings' | 'playback' | 'history' | 'auth-ui' | 'eq' | 'misc';

export interface PersistEnvelope<T> {
  v: number;
  data: T;
}

export interface PersistSchema<T> {
  owner: PersistOwner;
  /** localStorage 键 */
  key: string;
  version: number;
  defaultValue: T;
  /** fromVersion -> migrate(data) 得到下一版 data */
  migrations?: Record<number, (data: unknown) => unknown>;
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`[persistence] write failed key=${key}:`, error);
  }
}

function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 忽略
  }
}

function applyMigrations(schema: PersistSchema<unknown>, version: number, data: unknown): unknown {
  let v = version;
  let cur = data;
  const migrations = schema.migrations || {};
  while (v < schema.version) {
    const mig = migrations[v];
    if (!mig) {
      console.warn(`[persistence] missing migration ${schema.key} v${v}→${v + 1}, reset default`);
      return schema.defaultValue;
    }
    cur = mig(cur);
    v += 1;
  }
  return cur;
}

export const persistenceService = {
  /**
   * 读取 schema；支持：
   * - 新格式 `{ v, data }`
   * - 旧格式裸 JSON（视为 v0 或 v1 无 envelope，走 migrations from 0）
   */
  load<T>(schema: PersistSchema<T>): T {
    const raw = readRaw(schema.key);
    if (raw == null || raw === '') {
      return structuredClone(schema.defaultValue);
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        'v' in (parsed as object) &&
        'data' in (parsed as object)
      ) {
        const env = parsed as PersistEnvelope<unknown>;
        const data = applyMigrations(schema as PersistSchema<unknown>, env.v, env.data);
        if (env.v !== schema.version) {
          this.save(schema, data as T);
        }
        return data as T;
      }
      // 旧裸数据：当 version 0
      const data = applyMigrations(schema as PersistSchema<unknown>, 0, parsed);
      this.save(schema, data as T);
      return data as T;
    } catch (error) {
      console.error(`[persistence] parse failed key=${schema.key}:`, error);
      return structuredClone(schema.defaultValue);
    }
  },

  save<T>(schema: PersistSchema<T>, data: T): void {
    const env: PersistEnvelope<T> = { v: schema.version, data };
    writeRaw(schema.key, JSON.stringify(env));
  },

  remove(schema: PersistSchema<unknown>): void {
    removeRaw(schema.key);
  }
};

// ─── 已声明 schema ───────────────────────────────────────────────

export const playProgressSchema: PersistSchema<{ songId?: string | number; progress?: number }> = {
  owner: 'playback',
  key: 'playProgress',
  version: 1,
  defaultValue: {},
  migrations: {
    0: (data) => (data && typeof data === 'object' ? data : {})
  }
};

export const volumeSchema: PersistSchema<number> = {
  owner: 'playback',
  key: 'volume',
  version: 1,
  defaultValue: 1,
  migrations: {
    0: (data) => {
      const n = typeof data === 'number' ? data : parseFloat(String(data));
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
    }
  }
};

export const eqBypassSchema: PersistSchema<boolean> = {
  owner: 'eq',
  key: 'eqBypass',
  version: 1,
  defaultValue: false,
  migrations: {
    0: (data) => data === true || data === 'true'
  }
};
