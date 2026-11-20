/**
 * WebDAV 同步：采集本机数据、与远端文件比对、上传/应用，以及启动与定时调度。
 * 决策规则在 utils/backupData.ts，网络请求在主进程 modules/webdav.ts。
 */
import { cloneDeep } from 'lodash';
import { createDiscreteApi } from 'naive-ui';
import { watch } from 'vue';

import i18n from '@/../i18n/renderer';
import { useFavoriteStore } from '@/store/modules/favorite';
import { usePlayHistoryStore } from '@/store/modules/playHistory';
import { useSettingsStore } from '@/store/modules/settings';
import { useWebdavSyncStore } from '@/store/modules/webdavSync';
import {
  BACKUP_CATEGORIES,
  type BackupCategory,
  type BackupData,
  type BackupFile,
  createBackupFile,
  hashBackupData,
  HISTORY_KEYS,
  type HistoryData,
  LOGIN_LOCAL_KEYS,
  mergeHistory,
  parseBackupFile,
  pickPluginSet,
  pickSettingsSet,
  planCategorySync,
  SETTINGS_LOCAL_KEYS,
  type SyncAction,
  type SyncMode
} from '@/utils/backupData';
import { setLocalStorageItem } from '@/utils/playerUtils';

import packageJson from '../../../package.json';
import type { WebdavErrorKind } from '../../shared/webdav';

export type WebdavSyncErrorKind = WebdavErrorKind | 'invalidFile' | 'noBackup' | 'busy';

export type WebdavSyncResult =
  | {
      ok: true;
      uploaded: BackupCategory[];
      downloaded: BackupCategory[];
      /** 两边都改了且没有决定保留哪一边，本次跳过的分类 */
      conflicts: BackupCategory[];
      /** 应用的远端数据里有需要重启才生效的内容 */
      needsRestart: boolean;
    }
  | { ok: false; error: WebdavSyncErrorKind; status?: number };

export type ConflictResolver = (categories: BackupCategory[]) => Promise<'local' | 'remote' | null>;

// 这两类应用后要重启：歌词/均衡器等配置和登录信息只在启动时从 localStorage 读取
const RESTART_CATEGORIES: BackupCategory[] = ['settings', 'login'];

const readLocalItems = (keys: readonly string[]): Record<string, string> => {
  const items: Record<string, string> = {};
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value !== null) items[key] = value;
  }
  return items;
};

const writeLocalItems = (keys: readonly string[], items: Record<string, string> = {}): void => {
  for (const key of keys) {
    if (typeof items[key] === 'string') {
      localStorage.setItem(key, items[key]);
    } else {
      localStorage.removeItem(key);
    }
  }
};

const collectors: { [K in BackupCategory]: () => BackupData[K] | Promise<BackupData[K]> } = {
  settings: async () => ({
    set: pickSettingsSet(cloneDeep(useSettingsStore().setData)),
    shortcuts: await window.electron.ipcRenderer.invoke('shortcuts:get-config'),
    local: readLocalItems(SETTINGS_LOCAL_KEYS)
  }),
  plugins: () => ({ set: pickPluginSet(cloneDeep(useSettingsStore().setData)) }),
  history: () => {
    const store = usePlayHistoryStore();
    return Object.fromEntries(
      HISTORY_KEYS.map((key) => [key, JSON.parse(JSON.stringify(store[key]))])
    ) as HistoryData;
  },
  favorites: () => {
    const store = useFavoriteStore();
    return { favoriteList: [...store.favoriteList], dislikeList: [...store.dislikeList] };
  },
  login: () => ({ local: readLocalItems(LOGIN_LOCAL_KEYS) })
};

const appliers: { [K in BackupCategory]: (data: BackupData[K]) => void | Promise<void> } = {
  settings: async (data) => {
    // 再过滤一遍：被手改过的远端文件也碰不到设备相关项
    useSettingsStore().setSetData(pickSettingsSet(data.set ?? {}));
    if (data.shortcuts) {
      await window.electron.ipcRenderer.invoke('shortcuts:save', data.shortcuts);
    }
    writeLocalItems(SETTINGS_LOCAL_KEYS, data.local);
  },
  plugins: (data) => {
    useSettingsStore().setSetData(pickPluginSet(data.set ?? {}));
  },
  history: (data) => {
    usePlayHistoryStore().$patch(
      Object.fromEntries(HISTORY_KEYS.map((key) => [key, data[key] ?? []])) as any
    );
  },
  favorites: (data) => {
    // 只改本地列表，不调用网易云的喜欢/取消喜欢接口
    const store = useFavoriteStore();
    store.favoriteList = data.favoriteList ?? [];
    store.dislikeList = data.dislikeList ?? [];
    setLocalStorageItem('favoriteList', store.favoriteList);
    setLocalStorageItem('dislikeList', store.dislikeList);
  },
  login: (data) => writeLocalItems(LOGIN_LOCAL_KEYS, data.local)
};

const performSync = async (
  mode: SyncMode,
  resolveConflicts?: ConflictResolver
): Promise<WebdavSyncResult> => {
  const store = useWebdavSyncStore();

  const fetched = await window.api.webdavDownload();
  if (!fetched.ok) return fetched;

  let remote: BackupFile | null = null;
  if (fetched.data !== null) {
    try {
      remote = parseBackupFile(fetched.data);
    } catch {
      // 「上传覆盖远端」可以盖掉损坏的文件，其余模式不能拿它做判断
      if (mode !== 'upload') return { ok: false, error: 'invalidFile' };
    }
  }
  if (mode === 'restore' && !remote) return { ok: false, error: 'noBackup' };

  const plans: { category: BackupCategory; data: any; hash: string; action: SyncAction }[] = [];
  for (const category of BACKUP_CATEGORIES) {
    if (!store.categories[category]) continue;
    const data = await collectors[category]();
    const hash = hashBackupData(data);
    const action = planCategorySync({
      category,
      mode,
      localHash: hash,
      remoteHash: remote?.categories[category]?.hash,
      baseHash: store.syncedHashes[category]
    });
    plans.push({ category, data, hash, action });
  }

  const conflicted = plans.filter((plan) => plan.action === 'conflict');
  if (conflicted.length && resolveConflicts) {
    const choice = await resolveConflicts(conflicted.map((plan) => plan.category));
    if (choice) {
      for (const plan of conflicted) plan.action = choice === 'local' ? 'upload' : 'download';
    }
  }

  const now = Date.now();
  const categories: Record<string, unknown> = { ...remote?.categories };
  const syncedHashes = { ...store.syncedHashes };
  // 先算出要上传的内容并上传成功，再改本机数据：上传失败时本机保持原样
  const pendingApply: { category: BackupCategory; data: any }[] = [];
  for (const plan of plans) {
    const remoteEntry = remote?.categories[plan.category];
    if (plan.action === 'upload') {
      categories[plan.category] = { hash: plan.hash, updatedAt: now, data: plan.data };
      syncedHashes[plan.category] = plan.hash;
    } else if (plan.action === 'merge') {
      const merged = mergeHistory(plan.data, remoteEntry!.data as HistoryData);
      const hash = hashBackupData(merged);
      categories[plan.category] = { hash, updatedAt: now, data: merged };
      syncedHashes[plan.category] = hash;
      pendingApply.push({ category: plan.category, data: merged });
    } else if (plan.action === 'download') {
      syncedHashes[plan.category] = remoteEntry!.hash;
      pendingApply.push({ category: plan.category, data: remoteEntry!.data });
    } else if (plan.action === 'none' && plan.hash === remoteEntry?.hash) {
      syncedHashes[plan.category] = plan.hash;
    }
  }

  const uploaded = plans
    .filter((plan) => plan.action === 'upload' || plan.action === 'merge')
    .map((plan) => plan.category);
  if (uploaded.length) {
    const file = createBackupFile(categories as BackupFile['categories'], packageJson.version, now);
    const sent = await window.api.webdavUpload(JSON.stringify(file));
    if (!sent.ok) return sent;
  }

  for (const item of pendingApply) {
    await (appliers[item.category] as (data: any) => void | Promise<void>)(item.data);
  }
  store.syncedHashes = syncedHashes;

  const downloaded = plans
    .filter((plan) => plan.action === 'download')
    .map((plan) => plan.category);
  return {
    ok: true,
    uploaded,
    downloaded,
    conflicts: plans.filter((plan) => plan.action === 'conflict').map((plan) => plan.category),
    needsRestart: downloaded.some((category) => RESTART_CATEGORIES.includes(category))
  };
};

/**
 * 执行一次同步并记录结果。
 * sync：按两边的改动自动决定方向；upload：本机覆盖远端；restore：远端覆盖本机。
 * 不传 resolveConflicts 时，冲突的分类原样跳过。
 */
export const runWebdavSync = async (
  mode: SyncMode,
  resolveConflicts?: ConflictResolver
): Promise<WebdavSyncResult> => {
  const store = useWebdavSyncStore();
  if (store.syncing) return { ok: false, error: 'busy' };

  store.syncing = true;
  let result: WebdavSyncResult;
  try {
    result = await performSync(mode, resolveConflicts);
  } catch (error) {
    console.error('[webdavSync] 同步失败:', error);
    result = { ok: false, error: 'network' };
  } finally {
    store.syncing = false;
  }

  if (result.ok) {
    store.lastSyncAt = Date.now();
    store.lastStatus = result.conflicts.length ? 'conflict' : 'success';
    store.lastError = '';
  } else {
    store.lastStatus = 'error';
    store.lastError = result.status ? `${result.error}:${result.status}` : result.error;
  }
  return result;
};

let autoSyncTimer: ReturnType<typeof setInterval> | null = null;

const runAutoSync = async (): Promise<void> => {
  const config = await window.api.webdavGetConfig();
  if (!config.url) return;

  const result = await runWebdavSync('sync');
  if (!result.ok) return;

  const { message } = createDiscreteApi(['message']);
  if (result.conflicts.length) {
    message.warning(i18n.global.t('webdav.result.conflictSkipped'), { duration: 6000 });
  }
  if (result.needsRestart) {
    message.info(i18n.global.t('webdav.result.restartRequired'), { duration: 6000 });
  }
};

/** 应用启动时调用一次：按配置做启动同步，并跟随间隔设置启停定时同步 */
export const initWebdavAutoSync = (): void => {
  const store = useWebdavSyncStore();
  const safeAutoSync = () => {
    runAutoSync().catch((error) => console.error('[webdavSync] 自动同步失败:', error));
  };

  watch(
    () => store.intervalMinutes,
    (minutes) => {
      clearInterval(autoSyncTimer ?? undefined);
      autoSyncTimer = minutes > 0 ? setInterval(safeAutoSync, minutes * 60 * 1000) : null;
    },
    { immediate: true }
  );

  if (store.syncOnStartup) safeAutoSync();
};
