/**
 * musicDB IndexedDB 门面
 *
 * 背景：IndexedDB 的 open 在版本升级时，若同源其它上下文（旧 PWA 窗口、
 * 其它标签页）仍持有旧版本连接，会触发 onblocked 并可能永久 pending。
 * 之前 musicDB 在 MusicHook 模块顶层 await，一旦 open 挂起，整个模块图
 * 无法求值，页面白屏且只有清空站点数据才能恢复。
 *
 * 现在改为：
 * - 模块求值阶段不 await，后台打开数据库，应用挂载不受影响；
 * - 读写等待打开结束（正常为毫秒级，被阻塞时最多 DB_OPEN_TIMEOUT），
 *   保证桌面端 / Web 端冷启动都能命中已持久化的歌词与 URL 缓存；
 * - 打开失败 / 超时后缓存读写走内存 Map，播放和歌词加载照常进行；
 * - 连接因 versionchange 关闭时 isOpen() 返回 false，自动降级内存。
 */
import useIndexedDB, { type StoreConfig } from '@/hooks/IndexDBHook';

const DB_NAME = 'musicDB';
const DB_VERSION = 3;
const DB_OPEN_TIMEOUT = 3000;
const MAX_MEMORY_ENTRIES = 1000;

type MusicStoreName =
  | 'music'
  | 'music_lyric'
  | 'api_cache'
  | 'music_url_cache'
  | 'music_failed_cache';
type MusicDBStores = Record<MusicStoreName, Record<string, any>>;

const stores: StoreConfig<MusicStoreName>[] = [
  { name: 'music', keyPath: 'id' },
  { name: 'music_lyric', keyPath: 'id' },
  { name: 'api_cache', keyPath: 'id' },
  { name: 'music_url_cache', keyPath: 'id' },
  { name: 'music_failed_cache', keyPath: 'id' }
];

const openMusicDB = () =>
  useIndexedDB<MusicStoreName, MusicDBStores>(DB_NAME, stores, DB_VERSION, DB_OPEN_TIMEOUT);

type MusicDBHandle = Awaited<ReturnType<typeof openMusicDB>>;

// 后台打开：失败或超时只降级为内存缓存，不向上抛错
const realDBPromise: Promise<MusicDBHandle | null> = openMusicDB().catch((error) => {
  console.warn('[musicDB] IndexedDB 打开失败，缓存降级为内存:', error);
  return null;
});

// 内存兜底：storeName -> (key -> value)
const memoryStores = new Map<string, Map<string | number, any>>();
let autoIncrementKey = 0;

const memoryStore = (storeName: string) => {
  let store = memoryStores.get(storeName);
  if (!store) {
    store = new Map();
    memoryStores.set(storeName, store);
  }
  return store;
};

const setMemoryValue = (storeName: string, key: string | number, value: any) => {
  const store = memoryStore(storeName);
  // 兜底缓存也要有上限，避免 PWA 长期运行无限增长
  if (!store.has(key) && store.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }
  store.set(key, value);
};

const getValueKey = (value: any) => value?.id ?? `__auto_${++autoIncrementKey}`;

/**
 * 真实 DB 可用时优先使用；打开失败、已关闭或单次操作失败时回退内存。
 * 等待的 realDBPromise 必然在 DB_OPEN_TIMEOUT 内 settle，不会挂起调用方。
 */
const withDB = async <T>(
  run: (db: MusicDBHandle) => Promise<T>,
  memoryRun: () => T | Promise<T>
): Promise<T> => {
  const db = await realDBPromise;
  if (db && db.isOpen()) {
    try {
      return await run(db);
    } catch (error) {
      console.warn('[musicDB] IndexedDB 操作失败，回退到内存缓存:', error);
    }
  }
  return memoryRun();
};

export const musicDB = {
  /** 等待后台打开结束（成功或降级为内存），一般不需要主动调用 */
  initDB: async (): Promise<void> => {
    await realDBPromise;
  },
  addData: (storeName: string, value: any) =>
    withDB(
      (db) => db.addData(storeName as MusicStoreName, value),
      () => {
        const store = memoryStore(storeName);
        const key = getValueKey(value);
        if (store.has(key)) {
          throw new Error('ConstraintError: key already exists');
        }
        setMemoryValue(storeName, key, value);
      }
    ),
  saveData: (storeName: string, value: any) =>
    withDB(
      (db) => db.saveData(storeName as MusicStoreName, value),
      () => setMemoryValue(storeName, getValueKey(value), value)
    ),
  getData: (storeName: string, key: string | number) =>
    withDB(
      (db) => db.getData(storeName as MusicStoreName, key),
      () => memoryStore(storeName).get(key)
    ),
  deleteData: (storeName: string, key: string | number) =>
    withDB(
      (db) => db.deleteData(storeName as MusicStoreName, key),
      () => {
        memoryStore(storeName).delete(key);
      }
    ),
  getAllData: (storeName: string) =>
    withDB(
      (db) => db.getAllData(storeName as MusicStoreName),
      () => Array.from(memoryStore(storeName).values())
    ),
  getDataWithPagination: (storeName: string, page: number, pageSize: number) =>
    withDB(
      (db) => db.getDataWithPagination(storeName as MusicStoreName, page, pageSize),
      () => {
        const values = Array.from(memoryStore(storeName).values());
        const start = (page - 1) * pageSize;
        return values.slice(start, start + pageSize);
      }
    )
};
