// WebDAV 同步文件的结构、分类拆分与同步决策（纯函数，不依赖 store / DOM）

export const BACKUP_CATEGORIES = ['settings', 'plugins', 'history', 'favorites', 'login'] as const;
export type BackupCategory = (typeof BACKUP_CATEGORIES)[number];

const BACKUP_APP = 'AlgerMusicPlayer';
const BACKUP_VERSION = 1;
const MAX_HISTORY_SIZE = 500;

// 与设备绑定的设置项：不上传，恢复时也不覆盖本机的值
const DEVICE_SET_KEYS: Record<string, true> = {
  downloadPath: true,
  enableDiskCache: true,
  diskCacheDir: true,
  diskCacheMaxSizeMB: true,
  diskCacheCleanupPolicy: true,
  isProxy: true,
  proxyConfig: true,
  enableRealIP: true,
  realIP: true,
  musicApiPort: true,
  enableGpuAcceleration: true,
  author: true,
  authorUrl: true
};

// 音源与插件相关的设置项：归到 plugins 分类
// （含迁移标记，保证旧版脚本字段与标记作为一个整体保持一致）
const PLUGIN_SET_KEYS: Record<string, true> = {
  musicSourcePlugins: true,
  musicSourceOrder: true,
  musicSourceUnifiedMigrated: true,
  enableMusicUnblock: true,
  enabledMusicSources: true,
  customApiPlugin: true,
  customApiPluginName: true,
  lxMusicScripts: true,
  activeLxMusicApiId: true
};

/** 归到 settings 分类的 localStorage 项（歌词页、桌面歌词、均衡器、列表布局） */
export const SETTINGS_LOCAL_KEYS = [
  'music-full-config',
  'lyricData',
  'lyricFontSize',
  'eqSettings',
  'currentPreset',
  'eqBypass',
  'musicListLayout'
] as const;

/** 归到 login 分类的 localStorage 项 */
export const LOGIN_LOCAL_KEYS = ['token', 'user', 'loginType', 'uidLogin'] as const;

export const HISTORY_KEYS = [
  'musicHistory',
  'podcastHistory',
  'playlistHistory',
  'albumHistory',
  'podcastRadioHistory'
] as const;

type SetData = Record<string, unknown>;
/** localStorage 原始字符串；不存在的 key 不出现 */
type LocalItems = Record<string, string>;
type HistoryItem = { id: number | string; count?: number; lastPlayTime?: number };

export type HistoryData = Record<(typeof HISTORY_KEYS)[number], HistoryItem[]>;

export type BackupData = {
  settings: { set: SetData; shortcuts?: unknown; local: LocalItems };
  plugins: { set: SetData };
  history: HistoryData;
  favorites: { favoriteList: Array<number | string>; dislikeList: Array<number | string> };
  login: { local: LocalItems };
};

type BackupEntry<K extends BackupCategory> = {
  hash: string;
  updatedAt: number;
  data: BackupData[K];
};

export type BackupFile = {
  app: typeof BACKUP_APP;
  version: number;
  updatedAt: number;
  appVersion: string;
  categories: { [K in BackupCategory]?: BackupEntry<K> };
};

export type SyncMode = 'sync' | 'upload' | 'restore';
export type SyncAction = 'none' | 'upload' | 'download' | 'merge' | 'conflict';

const pickSet = (set: SetData, predicate: (key: string) => boolean): SetData =>
  Object.fromEntries(Object.entries(set).filter(([key]) => predicate(key)));

export const pickSettingsSet = (set: SetData): SetData =>
  pickSet(set, (key) => !DEVICE_SET_KEYS[key] && !PLUGIN_SET_KEYS[key]);

export const pickPluginSet = (set: SetData): SetData =>
  pickSet(set, (key) => PLUGIN_SET_KEYS[key] === true);

// key 排序后的序列化：同样的内容不因 key 顺序不同而得到不同 hash
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

/** 分类内容指纹（cyrb53），只用于判断内容是否变化 */
export const hashBackupData = (data: unknown): string => {
  const text = stableStringify(data);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

/**
 * 决定一个分类这次同步要做什么。
 * baseHash 是本机上次同步成功时的指纹；remoteHash 为空表示远端还没有这个分类。
 */
export const planCategorySync = (input: {
  category: BackupCategory;
  mode: SyncMode;
  localHash: string;
  remoteHash?: string;
  baseHash?: string;
}): SyncAction => {
  const { category, mode, localHash, remoteHash, baseHash } = input;
  if (mode === 'restore') return remoteHash && remoteHash !== localHash ? 'download' : 'none';
  if (localHash === remoteHash) return 'none';
  if (mode === 'upload' || !remoteHash || remoteHash === baseHash) return 'upload';
  if (localHash === baseHash) return 'download';
  // 两边都改了：播放记录可以无损合并，其余整类覆盖的分类交给用户决定
  return category === 'history' ? 'merge' : 'conflict';
};

const mergeHistoryList = (local: HistoryItem[], remote: HistoryItem[]): HistoryItem[] => {
  const merged = new Map<number | string, HistoryItem>();
  for (const item of [...local, ...remote]) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      continue;
    }
    const newer = (item.lastPlayTime ?? 0) > (existing.lastPlayTime ?? 0) ? item : existing;
    const count = Math.max(item.count ?? 0, existing.count ?? 0);
    merged.set(item.id, count ? { ...newer, count } : newer);
  }
  // 稳定排序：没有时间戳的记录（播客节目）保持「本机在前、远端在后」的原顺序
  return [...merged.values()]
    .sort((a, b) => (b.lastPlayTime ?? 0) - (a.lastPlayTime ?? 0))
    .slice(0, MAX_HISTORY_SIZE);
};

/** 按 id 合并两端播放记录：保留较新的一条，播放次数取较大值 */
export const mergeHistory = (local: HistoryData, remote: Partial<HistoryData>): HistoryData =>
  Object.fromEntries(
    HISTORY_KEYS.map((key) => [key, mergeHistoryList(local[key] ?? [], remote[key] ?? [])])
  ) as HistoryData;

export const createBackupFile = (
  categories: BackupFile['categories'],
  appVersion: string,
  updatedAt: number
): BackupFile => ({ app: BACKUP_APP, version: BACKUP_VERSION, updatedAt, appVersion, categories });

/** 解析远端文件；不是本应用的同步文件或版本过新时抛错 */
export const parseBackupFile = (text: string): BackupFile => {
  const parsed = JSON.parse(text) as Partial<BackupFile> | null;
  if (
    !parsed ||
    parsed.app !== BACKUP_APP ||
    typeof parsed.version !== 'number' ||
    parsed.version > BACKUP_VERSION ||
    typeof parsed.categories !== 'object' ||
    parsed.categories === null
  ) {
    throw new Error('无效的同步文件');
  }
  return parsed as BackupFile;
};
