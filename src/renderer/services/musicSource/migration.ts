/**
 * 存量数据迁移（一次性、幂等）
 *
 * 旧三套存储收敛到统一模型：
 *  - lxMusicScripts + activeLxMusicApiId → 插件库（lxmusic 方言），
 *    旧 key 'lxMusic' 在全局勾选/歌曲级配置中 remap 为 plugin:<id>
 *  - customApiPlugin → customApi 内置 provider（配置字段沿用 customApiPlugin*）
 *  - enabledMusicSources 里的 'custom' → 'customApi'
 *  - 初始化 musicSourceOrder（用户排序），此后排序只有一个模型
 *
 * 旧字段保留不删（可回滚），消费方全部停用。
 */
import { useSettingsStore } from '@/store';
import type { MusicSourcePlugin } from '@/types/musicSourcePlugin';
import { hashMusicSource, sanitizeMusicSourcePlatform } from '@/utils/musicSourcePlugin';

/** 迁移标记（写入 set 配置） */
const MIGRATED_FLAG = 'musicSourceUnifiedMigrated';

type LegacyLxScript = {
  id: string;
  name: string;
  script: string;
  info?: { version?: string; author?: string };
  createdAt?: number;
};

/** 全局勾选与歌曲级配置里的旧 key remap 表（含 lxMusic → 激活插件） */
export const buildLegacyKeyRemap = (): Record<string, string> => {
  const remap: Record<string, string> = { custom: 'customApi' };
  const settingsStore = useSettingsStore();
  const scripts = (settingsStore.setData.lxMusicScripts || []) as LegacyLxScript[];
  const activeId = settingsStore.setData.activeLxMusicApiId as string | null;

  const activeScript = scripts.find((script) => script.id === activeId);
  if (activeScript?.script) {
    remap.lxMusic = `plugin:${hashMusicSource(activeScript.script)}`;
  }
  return remap;
};

const remapKeys = (keys: string[], remap: Record<string, string>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    const mapped = remap[key] ?? key;
    if (!seen.has(mapped)) {
      seen.add(mapped);
      out.push(mapped);
    }
  }
  return out;
};

/** 歌曲级音源配置（localStorage song_source_*）里的旧 key 同步 remap */
const remapSongLevelConfigs = (remap: Record<string, string>): void => {
  const entries = Object.entries(remap).filter(([from]) => from !== to(remap, from));
  if (!entries.length) return;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('song_source_') || key.startsWith('song_source_type_')) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const sources = JSON.parse(raw) as string[];
      if (!Array.isArray(sources)) continue;
      const remapped = remapKeys(sources, remap);
      if (JSON.stringify(remapped) !== JSON.stringify(sources)) {
        localStorage.setItem(key, JSON.stringify(remapped));
      }
    } catch {
      // 损坏的条目跳过，不阻塞迁移
    }
  }
};

const to = (remap: Record<string, string>, from: string): string => remap[from] ?? from;

/**
 * 启动时调用（App 初始化）。幂等：标记存在即跳过。
 * @returns 本次是否执行了迁移（false = 已迁移过或无旧数据）
 */
export const migrateLegacyMusicSources = (): boolean => {
  const settingsStore = useSettingsStore();
  const data = settingsStore.setData;

  if (data[MIGRATED_FLAG]) return false;

  const scripts = (data.lxMusicScripts || []) as LegacyLxScript[];
  const activeId = (data.activeLxMusicApiId as string | null) || null;
  const plugins: MusicSourcePlugin[] = [
    ...((data.musicSourcePlugins || []) as MusicSourcePlugin[])
  ];
  const now = Date.now();

  // 1. LX 脚本 → 插件库（hash 幂等，已导入的跳过）
  let order = plugins.length ? Math.max(...plugins.map((p) => p.order)) + 1 : 0;
  for (const script of scripts) {
    if (!script?.script) continue;
    const id = hashMusicSource(script.script);
    if (plugins.some((p) => p.id === id)) continue;
    plugins.push({
      id,
      platform: sanitizeMusicSourcePlatform(script.name, `lx-${id.slice(0, 6)}`),
      name: script.name || 'LX Music 音源',
      dialect: 'lxmusic',
      ...(script.info?.version ? { version: script.info.version } : {}),
      ...(script.info?.author ? { author: script.info.author } : {}),
      source: script.script,
      vars: [],
      userVars: {},
      // 旧模型只有一个激活脚本；迁移后只有它是启用的
      enabled: script.id === activeId,
      order: order++,
      createdAt: script.createdAt ?? now,
      updatedAt: now
    });
  }

  // 2. 旧 key remap（全局勾选 + 歌曲级配置）
  const remap = buildLegacyKeyRemap();
  const enabledSources = remapKeys((data.enabledMusicSources || []) as string[], remap);
  remapSongLevelConfigs(remap);

  // 3. 初始化用户排序：默认序 = 自定义API → 网易云 → 插件（启用在前）→ GD → unblock 平台
  const pluginKeys = plugins
    .slice()
    .sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.order - b.order)
    .map((p) => `plugin:${p.id}`);
  const defaultOrder = ['customApi', 'netease', ...pluginKeys, 'gdmusic', 'pyncmd'];

  settingsStore.setSetData({
    musicSourcePlugins: plugins,
    enabledMusicSources: enabledSources,
    musicSourceOrder: defaultOrder,
    [MIGRATED_FLAG]: true
  });

  const migratedCount = plugins.length;
  console.log(
    `[migration] 音源统一迁移完成：LX 脚本 ${scripts.length} 个入库（激活 ${activeId ? 1 : 0}），remap ${JSON.stringify(remap)}`
  );
  return migratedCount > 0 || scripts.length > 0;
};
