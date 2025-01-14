import { app, ipcMain } from 'electron';
import Store from 'electron-store';

import set from '../set.json';
import { defaultShortcuts } from './shortcuts';

interface StoreType {
  set: {
    isProxy: boolean;
    noAnimate: boolean;
    animationSpeed: number;
    author: string;
    authorUrl: string;
    musicApiPort: number;
  };
  shortcuts: typeof defaultShortcuts;
}

let store: Store<StoreType>;

/**
 * 初始化配置管理
 */
export function initializeConfig() {
  store = new Store<StoreType>({
    name: 'config',
    defaults: {
      set,
      shortcuts: defaultShortcuts
    }
  });

  store.get('set.downloadPath') || store.set('set.downloadPath', app.getPath('downloads'));

  // 定义ipcRenderer监听事件
  ipcMain.on('set-store-value', (_, key, value) => {
    store.set(key, value);
  });

  ipcMain.on('get-store-value', (_, key) => {
    const value = store.get(key);
    _.returnValue = value || '';
  });

  return store;
}

export function getStore() {
  return store;
}
