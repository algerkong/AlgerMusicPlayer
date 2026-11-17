import { ref } from 'vue';

// 定义表配置的泛型接口
export interface StoreConfig<T extends string> {
  name: T;
  keyPath?: string;
}

// 创建一个使用 IndexedDB 的组合函数
const useIndexedDB = async <T extends string, S extends Record<T, Record<string, any>>>(
  dbName: string,
  stores: StoreConfig<T>[],
  version: number = 1,
  timeout: number = 8000
) => {
  const db = ref<IDBDatabase | null>(null);

  // 连接关闭时同步清空句柄，避免后续操作命中已关闭的连接
  const closeDatabase = (database: IDBDatabase) => {
    try {
      database.close();
    } catch {
      /* 忽略重复关闭 */
    }
    if (db.value === database) {
      db.value = null;
    }
  };

  // 打开数据库并创建表
  const initDB = () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, version);
      let timedOut = false;

      // 版本升级时若同源其它上下文仍持有旧连接，open 会停在 pending 并反复
      // 触发 onblocked。这里不能依赖 blocked 事件自行恢复，只能超时兜底。
      const timer = setTimeout(() => {
        timedOut = true;
        reject(new Error(`IndexedDB 打开超时: ${dbName}@${version}`));
      }, timeout);

      request.onblocked = () => {
        if (timedOut) return;
        console.warn(`[IndexedDB] ${dbName}@${version} 打开被同源其它页面阻塞，等待旧连接关闭…`);
      };

      request.onupgradeneeded = (event: any) => {
        const database: IDBDatabase = event.target.result;
        database.onversionchange = () => closeDatabase(database);
        stores.forEach((store) => {
          if (!database.objectStoreNames.contains(store.name)) {
            database.createObjectStore(store.name, {
              keyPath: store.keyPath || 'id',
              autoIncrement: true
            });
          }
        });
      };

      request.onsuccess = (event: any) => {
        // 超时后迟到的成功连接也必须关闭，否则会泄漏并阻塞后续版本升级。
        // 注意：不能访问 pending 请求的 request.result，会抛 InvalidStateError。
        if (timedOut) {
          try {
            event.target.result?.close();
          } catch {
            /* noop */
          }
          return;
        }
        clearTimeout(timer);
        const database: IDBDatabase = event.target.result;
        database.onversionchange = () => closeDatabase(database);
        db.value = database;
        resolve();
      };

      request.onerror = (event: any) => {
        if (timedOut) return;
        clearTimeout(timer);
        reject(event.target.error);
      };
    });
  };

  await initDB();

  // 通用新增数据
  const addData = <K extends T>(storeName: K, value: S[K]) => {
    return new Promise<void>((resolve, reject) => {
      if (!db.value) return reject('数据库未初始化');
      const tx = db.value.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      const request = store.add(value);

      request.onsuccess = () => {
        console.log('成功');
        resolve();
      };

      request.onerror = (event) => {
        console.error('新增失败:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  };

  // 通用保存数据（新增或更新）
  const saveData = <K extends T>(storeName: K, value: S[K]) => {
    return new Promise<void>((resolve, reject) => {
      if (!db.value) return reject('数据库未初始化');
      const tx = db.value.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => {
        console.log('成功');
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  };

  // 通用获取数据
  const getData = <K extends T>(storeName: K, key: string | number) => {
    return new Promise<S[K]>((resolve, reject) => {
      if (!db.value) return reject('数据库未初始化');
      const tx = db.value.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = (event) => {
        if (event.target) {
          resolve((event.target as IDBRequest).result);
        } else {
          reject('事件目标为空');
        }
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  };

  // 删除数据
  const deleteData = <K extends T>(storeName: K, key: string | number) => {
    return new Promise<void>((resolve, reject) => {
      if (!db.value) return reject('数据库未初始化');
      const tx = db.value.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log('删除成功');
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  };

  // 查询所有数据
  const getAllData = <K extends T>(storeName: K) => {
    return new Promise<S[K][]>((resolve, reject) => {
      if (!db.value) return reject('数据库未初始化');
      const tx = db.value.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = (event) => {
        if (event.target) {
          resolve((event.target as IDBRequest).result);
        } else {
          reject('事件目标为空');
        }
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  };

  // 分页查询数据
  const getDataWithPagination = <K extends T>(storeName: K, page: number, pageSize: number) => {
    return new Promise<S[K][]>((resolve, reject) => {
      if (!db.value) return reject('数据库未初始化');
      const tx = db.value.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.openCursor();
      const results: S[K][] = [];
      let index = 0;
      const skip = (page - 1) * pageSize;

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve(results);
          return;
        }

        if (index >= skip && results.length < pageSize) {
          results.push(cursor.value);
        }

        index++;
        cursor.continue();
      };

      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });
  };

  return {
    initDB,
    // 供上层门面判断连接是否仍然可用（versionchange 关闭后为 false）
    isOpen: () => db.value !== null,
    addData,
    saveData,
    getData,
    deleteData,
    getAllData,
    getDataWithPagination
  };
};

export default useIndexedDB;
