import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { BackupCategory } from '@/utils/backupData';

export type WebdavSyncStatus = '' | 'success' | 'conflict' | 'error';

/**
 * WebDAV 同步的本机选项与状态（连接配置在主进程 config.json，不在这里）
 */
export const useWebdavSyncStore = defineStore(
  'webdavSync',
  () => {
    // 登录状态含 Cookie，默认不同步，需用户确认后开启
    const categories = ref<Record<BackupCategory, boolean>>({
      settings: true,
      plugins: true,
      history: true,
      favorites: true,
      login: false
    });
    const syncOnStartup = ref(false);
    /** 定时同步间隔（分钟），0 为关闭 */
    const intervalMinutes = ref(0);
    /** 各分类上次同步成功时的内容指纹，用来判断是哪一边改了 */
    const syncedHashes = ref<Partial<Record<BackupCategory, string>>>({});
    const lastSyncAt = ref(0);
    const lastStatus = ref<WebdavSyncStatus>('');
    const lastError = ref('');
    const syncing = ref(false);

    return {
      categories,
      syncOnStartup,
      intervalMinutes,
      syncedHashes,
      lastSyncAt,
      lastStatus,
      lastError,
      syncing
    };
  },
  {
    persist: {
      key: 'webdav-sync-store',
      storage: localStorage,
      pick: [
        'categories',
        'syncOnStartup',
        'intervalMinutes',
        'syncedHashes',
        'lastSyncAt',
        'lastStatus',
        'lastError'
      ]
    }
  }
);
