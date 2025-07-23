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
  version: number = 1
) => {
  const db = ref<IDBDatabase | null>(null);

  // 打开数据库并创建表
  const initDB = () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
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
        db.value = event.target.result;
        resolve();
      };

      request.onerror = (event: any) => {
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
