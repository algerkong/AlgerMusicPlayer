/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue';

// 创建一个使用 IndexedDB 的组合函数
const useIndexedDB = () => {
  const db = ref<IDBDatabase | null>(null); // 数据库引用

  // 打开数据库并创建表
  const initDB = (dbName: string, version: number, stores: { name: string; keyPath?: string }[]) => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, version); // 打开数据库请求

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result; // 获取数据库实例
        stores.forEach((store) => {
          if (!db.objectStoreNames.contains(store.name)) {
            // 确保对象存储（表）创建
            db.createObjectStore(store.name, {
              keyPath: store.keyPath || 'id',
              autoIncrement: true,
            });
          }
        });
      };

      request.onsuccess = (event: any) => {
        db.value = event.target.result; // 保存数据库实例
        resolve(); // 成功时解析 Promise
      };

      request.onerror = (event: any) => {
        reject(event.target.error); // 失败时拒绝 Promise
      };
    });
  };

  // 通用新增数据
  const addData = (storeName: string, value: any) => {
    return new Promise<void>((resolve, reject) => {
      if (!db.value) return reject('数据库未初始化'); // 检查数据库是否已初始化
      const tx = db.value.transaction(storeName, 'readwrite'); // 创建事务
      const store = tx.objectStore(storeName); // 获取对象存储

      const request = store.add(value); // 添加数据请求

      request.onsuccess = () => {
        console.log('成功'); // 成功时输出
        resolve(); // 解析 Promise
      };

      request.onerror = (event) => {
        console.error('新增失败:', (event.target as IDBRequest).error); // 输出错误
        reject((event.target as IDBRequest).error); // 拒绝 Promise
      };
    });
  };

  // 通用保存数据（新增或更新）
  const saveData = (storeName: string, value: any) => {
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
  const getData = (storeName: string, key: string | number) => {
    return new Promise<any>((resolve, reject) => {
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
  const deleteData = (storeName: string, key: string | number) => {
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
  const getAllData = (storeName: string) => {
    return new Promise<any[]>((resolve, reject) => {
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
  const getDataWithPagination = (storeName: string, page: number, pageSize: number) => {
    return new Promise<any[]>((resolve, reject) => {
      if (!db.value) return reject('数据库未初始化');
      const tx = db.value.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.openCursor(); // 打开游标请求
      const results: any[] = []; // 存储结果的数组
      let index = 0; // 当前索引
      const skip = (page - 1) * pageSize; // 计算跳过的数量

      request.onsuccess = (event: any) => {
        const cursor = event.target.result; // 获取游标
        if (!cursor) {
          resolve(results); // 如果没有更多数据，解析结果
          return;
        }

        if (index >= skip && results.length < pageSize) {
          results.push(cursor.value); // 添加当前游标值到结果
        }

        index++; // 增加索引
        cursor.continue(); // 继续游标
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
    getDataWithPagination,
  };
};

export default useIndexedDB;
