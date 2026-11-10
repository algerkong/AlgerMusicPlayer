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

  // 打开数据库并创建表
  const initDB = () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      // 数据库中版本变更导致旧连接需要关闭时触发。浏览器只允许一个连接等待升级，
      // 若其它同源上下文（如 PWA 窗口 + 普通标签页）仍持有着旧版本的连接，升级会
      // 一直阻塞，本 open 请求将永远停在 pending 状态。我们无法在此强制关闭其它
      // 上下文的连接，只能等待其自行关闭；配合下方的事件监听与 open 超时兜底，
      // 避免让顶层 await 永久挂起导致白屏。
      request.onblocked = () => {
        /* 等待其它同源上下文通过 onversionchange 自行关闭 */
      };

      // 本连接一旦成功建立，就监听版本变更：当其它同源上下文请求更高版本时，
      // 立即关闭本连接让升级得以继续进行，避免互相阻塞。
      const onVersionChange = () => {
        const current = db.value;
        current && current.close();
      };

      let timedOut = false;
      const timer = window.setTimeout(() => {
        timedOut = true;
        request.onblocked = null;
        request.onerror = null;
        try {
          request.transaction && request.transaction.abort();
        } catch {
          /* noop */
        }
        request.result && request.result.close();
        reject(new Error(`IndexedDB 打开超时: ${dbName}@${version}`));
      }, timeout);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        db.onversionchange = onVersionChange;
        stores.forEach((store) => {
          if (!db.objectStoreNames.contains(store.name)) {
            db.createObjectStore(store.name, {
              keyPath: store.keyPath || 'id',
              autoIncrement: true
            });
          }
        });
      };

      request.onsuccess = (event: any) => {
        if (timedOut) return;
        window.clearTimeout(timer);
        db.value = event.target.result;
        db.value!.onversionchange = onVersionChange;
        resolve();
      };

      request.onerror = (event: any) => {
        if (timedOut) return;
        window.clearTimeout(timer);
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
    addData,
    saveData,
    getData,
    deleteData,
    getAllData,
    getDataWithPagination
  };
};

export default useIndexedDB;
