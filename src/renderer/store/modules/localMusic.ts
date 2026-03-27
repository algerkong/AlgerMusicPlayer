// 本地音乐 Pinia Store
// 管理本地音乐列表、扫描状态和文件夹配置
// 使用 IndexedDB 缓存音乐元数据，localStorage 持久化文件夹路径

import { createDiscreteApi } from 'naive-ui';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import useIndexedDB from '@/hooks/IndexDBHook';
import type { LocalMusicEntry } from '@/types/localMusic';
import { removeStaleEntries } from '@/utils/localMusicUtils';

const { message } = createDiscreteApi(['message']);

/** IndexedDB store 名称 */
const LOCAL_MUSIC_STORE = 'local_music' as const;

/** IndexedDB 数据类型映射 */
type LocalMusicDBStores = {
  local_music: LocalMusicEntry;
};

/**
 * 使用 filePath 生成唯一 ID
 * 采用简单的字符串 hash 算法，确保同一路径始终生成相同 ID
 * @param filePath 文件绝对路径
 * @returns hash 字符串作为唯一 ID
 */
function generateId(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // 转为正数的十六进制字符串
  return (hash >>> 0).toString(16);
}

/**
 * 初始化 IndexedDB 实例
 * 使用 localMusicDB 数据库，包含 local_music 表
 */
async function initLocalMusicDB() {
  return await useIndexedDB<typeof LOCAL_MUSIC_STORE, LocalMusicDBStores>(
    'localMusicDB',
    [{ name: LOCAL_MUSIC_STORE, keyPath: 'id' }],
    1
  );
}

/**
 * 本地音乐管理 Store
 * 负责：文件夹管理、音乐扫描、IndexedDB 缓存、增量更新
 */
export const useLocalMusicStore = defineStore(
  'localMusic',
  () => {
    // ==================== 状态 ====================
    /** 已配置的文件夹路径列表 */
    const folderPaths = ref<string[]>([]);
    /** 本地音乐列表（从 IndexedDB 加载） */
    const musicList = ref<LocalMusicEntry[]>([]);
    /** 是否正在扫描 */
    const scanning = ref(false);
    /** 已扫描文件数（用于显示进度） */
    const scanProgress = ref(0);

    /** IndexedDB 实例（延迟初始化） */
    let db: Awaited<ReturnType<typeof initLocalMusicDB>> | null = null;

    /**
     * 获取 IndexedDB 实例，首次调用时初始化
     */
    async function getDB() {
      if (!db) {
        db = await initLocalMusicDB();
      }
      return db;
    }

    // ==================== 动作 ====================

    /**
     * 添加文件夹路径
     * 如果路径已存在则忽略
     * @param path 文件夹路径
     */
    function addFolder(path: string): void {
      if (!path || folderPaths.value.includes(path)) {
        return;
      }
      folderPaths.value.push(path);
    }

    /**
     * 移除文件夹路径
     * @param path 要移除的文件夹路径
     */
    function removeFolder(path: string): void {
      const index = folderPaths.value.indexOf(path);
      if (index !== -1) {
        folderPaths.value.splice(index, 1);
      }
    }

    /**
     * 扫描所有已配置的文件夹
     * 流程：IPC 扫描文件 → 增量对比 → 解析变更文件元数据 → 存入 IndexedDB → 更新列表
     */
    async function scanFolders(): Promise<void> {
      if (scanning.value || folderPaths.value.length === 0) {
        return;
      }

      scanning.value = true;
      scanProgress.value = 0;

      try {
        const localDB = await getDB();

        // 加载当前缓存数据用于增量对比
        const cachedEntries = await localDB.getAllData(LOCAL_MUSIC_STORE);
        const cachedMap = new Map<string, LocalMusicEntry>();
        for (const entry of cachedEntries) {
          cachedMap.set(entry.filePath, entry);
        }

        // 磁盘上实际存在的文件路径集合（扫描时收集）
        const diskFilePaths = new Set<string>();

        // 遍历每个文件夹进行扫描
        for (const folderPath of folderPaths.value) {
          try {
            // 1. 调用 IPC 扫描文件夹，获取文件路径与修改时间
            const result = await window.api.scanLocalMusicWithStats(folderPath);

            // 检查是否返回错误
            if ((result as any).error) {
              console.error(`扫描文件夹失败: ${folderPath}`, (result as any).error);
              message.error(`扫描失败: ${(result as any).error}`);
              continue;
            }

            const { files } = result;
            scanProgress.value += files.length;

            // 记录磁盘上存在的文件
            for (const file of files) {
              diskFilePaths.add(file.path);
            }

            // 2. 增量扫描：基于修改时间筛选需重新解析的文件
            const parseTargets: string[] = [];
            for (const file of files) {
              const cached = cachedMap.get(file.path);
              if (!cached || cached.modifiedTime !== file.modifiedTime) {
                parseTargets.push(file.path);
              }
            }

            // 3. 仅解析新增或变更文件，避免对未变更文件重复解析元数据
            if (parseTargets.length > 0) {
              const metas = await window.api.parseLocalMusicMetadata(parseTargets);
              for (const meta of metas) {
                const entry: LocalMusicEntry = {
                  ...meta,
                  id: generateId(meta.filePath)
                };
                await localDB.saveData(LOCAL_MUSIC_STORE, entry);
                cachedMap.set(entry.filePath, entry);
              }
            }
          } catch (error) {
            console.error(`扫描文件夹出错: ${folderPath}`, error);
            message.error(`扫描文件夹出错: ${folderPath}`);
          }
        }

        // 4. 清理已删除文件：从 IndexedDB 移除磁盘上不存在的条目
        for (const [filePath, entry] of cachedMap) {
          if (!diskFilePaths.has(filePath)) {
            await localDB.deleteData(LOCAL_MUSIC_STORE, entry.id);
          }
        }

        // 5. 从 IndexedDB 重新加载完整列表
        musicList.value = await localDB.getAllData(LOCAL_MUSIC_STORE);
      } catch (error) {
        console.error('扫描本地音乐失败:', error);
        message.error('扫描本地音乐失败');
      } finally {
        scanning.value = false;
      }
    }

    /**
     * 从 IndexedDB 缓存加载音乐列表
     * 应用启动时或进入本地音乐页面时调用
     */
    async function loadFromCache(): Promise<void> {
      try {
        const localDB = await getDB();
        musicList.value = await localDB.getAllData(LOCAL_MUSIC_STORE);
      } catch (error) {
        console.error('从缓存加载本地音乐失败:', error);
        // 降级：缓存加载失败时保持空列表，用户可手动触发扫描
        musicList.value = [];
      }
    }

    /**
     * 清理缓存：检查文件存在性，移除已不存在的文件条目
     */
    async function clearCache(): Promise<void> {
      try {
        const localDB = await getDB();
        const allEntries = await localDB.getAllData(LOCAL_MUSIC_STORE);

        if (allEntries.length === 0) {
          return;
        }

        // 构建文件存在性映射
        const existsMap: Record<string, boolean> = {};
        for (const entry of allEntries) {
          try {
            // 使用已有的 IPC 通道检查文件是否存在
            const exists = await window.electron.ipcRenderer.invoke(
              'check-file-exists',
              entry.filePath
            );
            existsMap[entry.filePath] = exists !== false;
          } catch {
            // 检查失败时假设文件存在，避免误删
            existsMap[entry.filePath] = true;
          }
        }

        // 使用工具函数过滤出仍然存在的条目
        const validEntries = removeStaleEntries(allEntries, existsMap);
        const removedEntries = allEntries.filter(
          (entry) => !validEntries.some((v) => v.id === entry.id)
        );

        // 从 IndexedDB 中删除不存在的条目
        for (const entry of removedEntries) {
          await localDB.deleteData(LOCAL_MUSIC_STORE, entry.id);
        }

        // 更新内存中的列表
        musicList.value = validEntries;
      } catch (error) {
        console.error('清理缓存失败:', error);
      }
    }

    return {
      // 状态
      folderPaths,
      musicList,
      scanning,
      scanProgress,

      // 动作
      addFolder,
      removeFolder,
      scanFolders,
      loadFromCache,
      clearCache
    };
  },
  {
    // 持久化配置：仅持久化文件夹路径到 localStorage
    // 音乐列表存储在 IndexedDB 中，不需要 localStorage 持久化
    persist: {
      key: 'local-music-store',
      storage: localStorage,
      pick: ['folderPaths']
    }
  }
);
