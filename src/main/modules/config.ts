import { app, ipcMain } from 'electron';
import Store from 'electron-store';

import set from '../set.json';
import { defaultShortcuts } from './shortcuts';

type SetConfig = {
  isProxy: boolean;
  proxyConfig: {
    enable: boolean;
    protocol: string;
    host: string;
    port: number;
  };
  enableRealIP: boolean;
  realIP: string;
  noAnimate: boolean;
  animationSpeed: number;
  author: string;
  authorUrl: string;
  musicApiPort: number;
  closeAction: 'ask' | 'minimize' | 'close';
  musicQuality: string;
  fontFamily: string;
  fontScope: 'global' | 'lyric';
  language: string;
  showTopAction: boolean;
  enableGpuAcceleration: boolean;
};
interface StoreType {
  set: SetConfig;
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
      set: set as SetConfig,
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

  // GPU加速设置更新处理
  // 注意：GPU加速设置必须在应用启动时在app.ready之前设置才能生效
  ipcMain.on('update-gpu-acceleration', (event, enabled: boolean) => {
    try {
      console.log('GPU加速设置更新:', enabled);
      store.set('set.enableGpuAcceleration', enabled);

      // GPU加速设置需要重启应用才能生效
      event.sender.send('gpu-acceleration-updated', enabled);
      console.log('GPU加速设置已保存，重启应用后生效');
    } catch (error) {
      console.error('GPU加速设置更新失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      event.sender.send('gpu-acceleration-update-error', errorMessage);
    }
  });

  return store;
}

export function getStore() {
  return store;
}
