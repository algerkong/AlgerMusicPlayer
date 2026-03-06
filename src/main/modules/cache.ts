import { createHash } from 'node:crypto';

import axios from 'axios';
import { app, ipcMain } from 'electron';
import Store from 'electron-store';
import * as fs from 'fs';
import * as path from 'path';

import { getStore } from './config';

type CacheCleanupPolicy = 'lru' | 'fifo';
type CacheItemType = 'music' | 'lyrics';
type CacheScope = 'all' | CacheItemType;
type CacheSwitchAction = 'migrate' | 'destroy' | 'keep';

type DiskCacheConfig = {
  enabled: boolean;
  directory: string;
  maxSizeMB: number;
  cleanupPolicy: CacheCleanupPolicy;
};

type MusicCacheEntry = {
  key: string;
  songId: number;
  source: string;
  filePath: string;
  urlHash: string;
  size: number;
  createdAt: number;
  lastAccessAt: number;
  playCount: number;
  title?: string;
  artist?: string;
};

type LyricCacheEntry = {
  key: string;
  songId: number;
  filePath: string;
  size: number;
  createdAt: number;
  lastAccessAt: number;
  title?: string;
  artist?: string;
};

type CacheStoreSchema = {
  musicEntries: Record<string, MusicCacheEntry>;
  lyricEntries: Record<string, LyricCacheEntry>;
};

type ResolveMusicUrlPayload = {
  songId: number;
  source?: string;
  url: string;
  title?: string;
  artist?: string;
};

type ResolveMusicUrlResult = {
  url: string;
  cached: boolean;
  queued: boolean;
};

type DiskCacheStats = {
  enabled: boolean;
  directory: string;
  maxSizeMB: number;
  cleanupPolicy: CacheCleanupPolicy;
  totalSizeBytes: number;
  musicSizeBytes: number;
  lyricSizeBytes: number;
  totalFiles: number;
  musicFiles: number;
  lyricFiles: number;
  usage: number;
};

type SwitchCacheDirectoryPayload = {
  directory: string;
  action?: CacheSwitchAction;
};

type SwitchCacheDirectoryResult = {
  success: boolean;
  config: DiskCacheConfig;
  migratedFiles: number;
  destroyedFiles: number;
};

type CacheEvictionItem = {
  type: CacheItemType;
  key: string;
  filePath: string;
  size: number;
  createdAt: number;
  lastAccessAt: number;
};

const DEFAULT_CACHE_MAX_SIZE_MB = 4096;
const MIN_CACHE_SIZE_MB = 256;
const MAX_CACHE_SIZE_MB = 102400;
const DEFAULT_CLEANUP_POLICY: CacheCleanupPolicy = 'lru';
const CACHE_ROOT_DIR_NAME = 'cache';
const MUSIC_CACHE_DIR = 'music';
const LYRIC_CACHE_DIR = 'lyrics';

const AUDIO_EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm'
};

class DiskCacheManager {
  private metadataStore: Store<CacheStoreSchema>;

  private pendingMusicDownloads = new Map<string, Promise<void>>();

  constructor() {
    this.metadataStore = new Store<CacheStoreSchema>({
      name: 'disk-cache',
      defaults: {
        musicEntries: {},
        lyricEntries: {}
      }
    });
  }

  public initialize(): void {
    this.ensureConfigDefaults();
    this.ensureDirectories();
  }

  private getDefaultCacheDirectory(): string {
    return path.join(app.getPath('userData'), CACHE_ROOT_DIR_NAME);
  }

  private normalizeCacheDirectory(directory: string): string {
    const trimmed = directory?.trim();
    if (!trimmed) {
      return this.getDefaultCacheDirectory();
    }
    if (path.isAbsolute(trimmed)) {
      return path.normalize(trimmed);
    }
    return path.resolve(trimmed);
  }

  private normalizeCacheSize(maxSizeMB: number): number {
    if (!Number.isFinite(maxSizeMB)) {
      return DEFAULT_CACHE_MAX_SIZE_MB;
    }
    return Math.min(MAX_CACHE_SIZE_MB, Math.max(MIN_CACHE_SIZE_MB, Math.floor(maxSizeMB)));
  }

  private ensureConfigDefaults(): void {
    const configStore = getStore();
    if (!configStore) return;

    const defaultDirectory = this.getDefaultCacheDirectory();

    if (configStore.get('set.enableDiskCache') === undefined) {
      configStore.set('set.enableDiskCache', true);
    }
    if (!configStore.get('set.diskCacheDir')) {
      configStore.set('set.diskCacheDir', defaultDirectory);
    }
    if (configStore.get('set.diskCacheMaxSizeMB') === undefined) {
      configStore.set('set.diskCacheMaxSizeMB', DEFAULT_CACHE_MAX_SIZE_MB);
    }
    if (!configStore.get('set.diskCacheCleanupPolicy')) {
      configStore.set('set.diskCacheCleanupPolicy', DEFAULT_CLEANUP_POLICY);
    }
  }

  private saveConfig(config: DiskCacheConfig): void {
    const configStore = getStore();
    if (!configStore) return;

    configStore.set('set.enableDiskCache', config.enabled);
    configStore.set('set.diskCacheDir', config.directory);
    configStore.set('set.diskCacheMaxSizeMB', config.maxSizeMB);
    configStore.set('set.diskCacheCleanupPolicy', config.cleanupPolicy);
  }

  private getMusicCacheDir(directory: string): string {
    return path.join(directory, MUSIC_CACHE_DIR);
  }

  private getLyricCacheDir(directory: string): string {
    return path.join(directory, LYRIC_CACHE_DIR);
  }

  private ensureDirectories(config?: DiskCacheConfig): void {
    const currentConfig = config ?? this.getCacheConfig();
    try {
      fs.mkdirSync(currentConfig.directory, { recursive: true });
      fs.mkdirSync(this.getMusicCacheDir(currentConfig.directory), { recursive: true });
      fs.mkdirSync(this.getLyricCacheDir(currentConfig.directory), { recursive: true });
    } catch (error) {
      console.error('创建缓存目录失败:', error);
    }
  }

  private isPathInsideDirectory(filePath: string, directory: string): boolean {
    const normalizedFile = path.resolve(filePath);
    const normalizedDir = path.resolve(directory);
    const relativePath = path.relative(normalizedDir, normalizedFile);
    return (
      relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
    );
  }

  private async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      await fs.promises.rename(sourcePath, targetPath);
      return;
    } catch {
      await fs.promises.copyFile(sourcePath, targetPath);
      await fs.promises.unlink(sourcePath);
    }
  }

  private generateAvailableFilePath(directory: string, fileName: string): string {
    const extension = path.extname(fileName);
    const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
    let nextPath = path.join(directory, fileName);
    let index = 1;

    while (fs.existsSync(nextPath)) {
      nextPath = path.join(directory, `${baseName}_${index}${extension}`);
      index++;
    }

    return nextPath;
  }

  private async migrateEntriesToDirectory(
    type: CacheItemType,
    oldDirectory: string,
    newDirectory: string
  ): Promise<number> {
    let migratedCount = 0;

    if (type === 'music') {
      const entries = this.getMusicEntries();
      for (const [key, entry] of Object.entries(entries)) {
        if (!this.isPathInsideDirectory(entry.filePath, oldDirectory)) {
          continue;
        }

        if (!fs.existsSync(entry.filePath)) {
          delete entries[key];
          continue;
        }

        try {
          const targetPath = this.generateAvailableFilePath(
            newDirectory,
            path.basename(entry.filePath)
          );
          await this.moveFile(entry.filePath, targetPath);
          const latestSize = fs.statSync(targetPath).size;
          entries[key] = {
            ...entry,
            filePath: targetPath,
            size: latestSize
          };
          migratedCount++;
        } catch (error) {
          console.error(`迁移音乐缓存失败: ${key}`, error);
        }
      }
      this.setMusicEntries(entries);
      return migratedCount;
    }

    const entries = this.getLyricEntries();
    for (const [key, entry] of Object.entries(entries)) {
      if (!this.isPathInsideDirectory(entry.filePath, oldDirectory)) {
        continue;
      }

      if (!fs.existsSync(entry.filePath)) {
        delete entries[key];
        continue;
      }

      try {
        const targetPath = this.generateAvailableFilePath(
          newDirectory,
          path.basename(entry.filePath)
        );
        await this.moveFile(entry.filePath, targetPath);
        const latestSize = fs.statSync(targetPath).size;
        entries[key] = {
          ...entry,
          filePath: targetPath,
          size: latestSize
        };
        migratedCount++;
      } catch (error) {
        console.error(`迁移歌词缓存失败: ${key}`, error);
      }
    }
    this.setLyricEntries(entries);

    return migratedCount;
  }

  private async removeEntriesInDirectory(type: CacheItemType, directory: string): Promise<number> {
    let removedCount = 0;

    if (type === 'music') {
      const entries = this.getMusicEntries();
      for (const [key, entry] of Object.entries(entries)) {
        if (!this.isPathInsideDirectory(entry.filePath, directory)) {
          continue;
        }

        if (fs.existsSync(entry.filePath)) {
          try {
            await fs.promises.unlink(entry.filePath);
          } catch (error) {
            console.error(`删除音乐缓存文件失败: ${entry.filePath}`, error);
          }
        }

        delete entries[key];
        removedCount++;
      }
      this.setMusicEntries(entries);
      return removedCount;
    }

    const entries = this.getLyricEntries();
    for (const [key, entry] of Object.entries(entries)) {
      if (!this.isPathInsideDirectory(entry.filePath, directory)) {
        continue;
      }

      if (fs.existsSync(entry.filePath)) {
        try {
          await fs.promises.unlink(entry.filePath);
        } catch (error) {
          console.error(`删除歌词缓存文件失败: ${entry.filePath}`, error);
        }
      }

      delete entries[key];
      removedCount++;
    }
    this.setLyricEntries(entries);

    return removedCount;
  }

  private async cleanupCacheDirectory(oldDirectory: string): Promise<void> {
    const oldMusicDir = this.getMusicCacheDir(oldDirectory);
    const oldLyricDir = this.getLyricCacheDir(oldDirectory);

    for (const targetDir of [oldMusicDir, oldLyricDir, oldDirectory]) {
      if (!fs.existsSync(targetDir)) {
        continue;
      }

      try {
        const files = await fs.promises.readdir(targetDir);
        if (files.length === 0) {
          await fs.promises.rmdir(targetDir);
        }
      } catch (error) {
        // 目录不为空或权限不足时忽略
        console.warn(`清理缓存目录失败: ${targetDir}`, error);
      }
    }
  }

  public getCacheConfig(): DiskCacheConfig {
    const configStore = getStore();
    const defaultDirectory = this.getDefaultCacheDirectory();

    const enabled = Boolean(configStore?.get('set.enableDiskCache') ?? true);
    const directory = this.normalizeCacheDirectory(
      String(configStore?.get('set.diskCacheDir') ?? defaultDirectory)
    );

    const rawMaxSize = Number(
      configStore?.get('set.diskCacheMaxSizeMB') ?? DEFAULT_CACHE_MAX_SIZE_MB
    );
    const maxSizeMB = this.normalizeCacheSize(rawMaxSize);

    const rawPolicy = String(
      configStore?.get('set.diskCacheCleanupPolicy') ?? DEFAULT_CLEANUP_POLICY
    );
    const cleanupPolicy: CacheCleanupPolicy = rawPolicy === 'fifo' ? 'fifo' : 'lru';

    const normalizedConfig: DiskCacheConfig = {
      enabled,
      directory,
      maxSizeMB,
      cleanupPolicy
    };

    this.saveConfig(normalizedConfig);
    return normalizedConfig;
  }

  public async updateCacheConfig(partial: Partial<DiskCacheConfig>): Promise<DiskCacheConfig> {
    const current = this.getCacheConfig();
    const updated: DiskCacheConfig = {
      enabled: partial.enabled ?? current.enabled,
      directory: this.normalizeCacheDirectory(partial.directory ?? current.directory),
      maxSizeMB: this.normalizeCacheSize(partial.maxSizeMB ?? current.maxSizeMB),
      cleanupPolicy:
        partial.cleanupPolicy === 'fifo' || partial.cleanupPolicy === 'lru'
          ? partial.cleanupPolicy
          : current.cleanupPolicy
    };

    this.saveConfig(updated);
    this.ensureDirectories(updated);
    await this.enforceCacheLimit();

    return updated;
  }

  public async switchCacheDirectory(
    payload: SwitchCacheDirectoryPayload
  ): Promise<SwitchCacheDirectoryResult> {
    const currentConfig = this.getCacheConfig();
    const targetDirectory = this.normalizeCacheDirectory(payload.directory);
    const action: CacheSwitchAction =
      payload.action === 'migrate' || payload.action === 'destroy' || payload.action === 'keep'
        ? payload.action
        : 'keep';

    if (targetDirectory === currentConfig.directory) {
      return {
        success: true,
        config: currentConfig,
        migratedFiles: 0,
        destroyedFiles: 0
      };
    }

    await this.pruneMissingEntries();

    const oldDirectory = currentConfig.directory;
    const oldMusicDir = this.getMusicCacheDir(oldDirectory);
    const oldLyricDir = this.getLyricCacheDir(oldDirectory);
    const newMusicDir = this.getMusicCacheDir(targetDirectory);
    const newLyricDir = this.getLyricCacheDir(targetDirectory);

    let migratedFiles = 0;
    let destroyedFiles = 0;

    try {
      fs.mkdirSync(targetDirectory, { recursive: true });
      fs.mkdirSync(newMusicDir, { recursive: true });
      fs.mkdirSync(newLyricDir, { recursive: true });

      if (action === 'migrate') {
        migratedFiles += await this.migrateEntriesToDirectory('music', oldMusicDir, newMusicDir);
        migratedFiles += await this.migrateEntriesToDirectory('lyrics', oldLyricDir, newLyricDir);
      } else if (action === 'destroy') {
        destroyedFiles += await this.removeEntriesInDirectory('music', oldMusicDir);
        destroyedFiles += await this.removeEntriesInDirectory('lyrics', oldLyricDir);
        await this.cleanupCacheDirectory(oldDirectory);
      }

      const updatedConfig: DiskCacheConfig = {
        ...currentConfig,
        directory: targetDirectory
      };

      this.saveConfig(updatedConfig);
      this.ensureDirectories(updatedConfig);
      await this.enforceCacheLimit();

      return {
        success: true,
        config: updatedConfig,
        migratedFiles,
        destroyedFiles
      };
    } catch (error) {
      console.error('切换缓存目录失败:', error);
      return {
        success: false,
        config: currentConfig,
        migratedFiles,
        destroyedFiles
      };
    }
  }

  private getMusicEntries(): Record<string, MusicCacheEntry> {
    return this.metadataStore.get('musicEntries');
  }

  private getLyricEntries(): Record<string, LyricCacheEntry> {
    return this.metadataStore.get('lyricEntries');
  }

  private setMusicEntries(entries: Record<string, MusicCacheEntry>): void {
    this.metadataStore.set('musicEntries', entries);
  }

  private setLyricEntries(entries: Record<string, LyricCacheEntry>): void {
    this.metadataStore.set('lyricEntries', entries);
  }

  private buildMusicKey(songId: number, source?: string): string {
    const safeSource = (source || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${songId}_${safeSource}`;
  }

  private buildLyricKey(songId: number): string {
    return String(songId);
  }

  private buildUrlHash(url: string): string {
    return createHash('sha1').update(url).digest('hex');
  }

  private toLocalUrl(filePath: string): string {
    const normalized = path.normalize(filePath).replace(/\\/g, '/');
    return `local:///${encodeURIComponent(normalized)}`;
  }

  private isRemoteAudioUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  private getExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const ext = path.extname(pathname).toLowerCase();
      if (ext && ext.length <= 6) {
        return ext;
      }
    } catch {
      // 忽略 URL 解析错误，回退到默认扩展名
    }
    return '';
  }

  private getExtensionFromContentType(contentType?: string): string {
    if (!contentType) {
      return '';
    }
    const normalizedType = contentType.split(';')[0].trim().toLowerCase();
    return AUDIO_EXTENSION_BY_CONTENT_TYPE[normalizedType] || '';
  }

  private resolveAudioExtension(url: string, contentType?: string): string {
    const urlExtension = this.getExtensionFromUrl(url);
    if (urlExtension) {
      return urlExtension;
    }
    const contentTypeExtension = this.getExtensionFromContentType(contentType);
    if (contentTypeExtension) {
      return contentTypeExtension;
    }
    return '.mp3';
  }

  private async pruneMissingEntries(): Promise<void> {
    let musicEntriesChanged = false;
    const musicEntries = this.getMusicEntries();
    const nextMusicEntries = { ...musicEntries };

    for (const [key, entry] of Object.entries(musicEntries)) {
      if (!fs.existsSync(entry.filePath)) {
        delete nextMusicEntries[key];
        musicEntriesChanged = true;
        continue;
      }

      try {
        const currentSize = fs.statSync(entry.filePath).size;
        if (currentSize !== entry.size) {
          nextMusicEntries[key] = {
            ...entry,
            size: currentSize
          };
          musicEntriesChanged = true;
        }
      } catch {
        delete nextMusicEntries[key];
        musicEntriesChanged = true;
      }
    }

    if (musicEntriesChanged) {
      this.setMusicEntries(nextMusicEntries);
    }

    let lyricEntriesChanged = false;
    const lyricEntries = this.getLyricEntries();
    const nextLyricEntries = { ...lyricEntries };

    for (const [key, entry] of Object.entries(lyricEntries)) {
      if (!fs.existsSync(entry.filePath)) {
        delete nextLyricEntries[key];
        lyricEntriesChanged = true;
        continue;
      }

      try {
        const currentSize = fs.statSync(entry.filePath).size;
        if (currentSize !== entry.size) {
          nextLyricEntries[key] = {
            ...entry,
            size: currentSize
          };
          lyricEntriesChanged = true;
        }
      } catch {
        delete nextLyricEntries[key];
        lyricEntriesChanged = true;
      }
    }

    if (lyricEntriesChanged) {
      this.setLyricEntries(nextLyricEntries);
    }
  }

  private getEvictionItems(): CacheEvictionItem[] {
    const musicItems: CacheEvictionItem[] = Object.entries(this.getMusicEntries()).map(
      ([key, entry]) => ({
        type: 'music',
        key,
        filePath: entry.filePath,
        size: entry.size,
        createdAt: entry.createdAt,
        lastAccessAt: entry.lastAccessAt
      })
    );

    const lyricItems: CacheEvictionItem[] = Object.entries(this.getLyricEntries()).map(
      ([key, entry]) => ({
        type: 'lyrics',
        key,
        filePath: entry.filePath,
        size: entry.size,
        createdAt: entry.createdAt,
        lastAccessAt: entry.lastAccessAt
      })
    );

    return [...musicItems, ...lyricItems];
  }

  private async removeEntry(type: CacheItemType, key: string): Promise<number> {
    if (type === 'music') {
      const entries = this.getMusicEntries();
      const entry = entries[key];
      if (!entry) return 0;

      if (fs.existsSync(entry.filePath)) {
        try {
          await fs.promises.unlink(entry.filePath);
        } catch (error) {
          console.error('删除音乐缓存文件失败:', error);
        }
      }

      delete entries[key];
      this.setMusicEntries(entries);
      return entry.size;
    }

    const entries = this.getLyricEntries();
    const entry = entries[key];
    if (!entry) return 0;

    if (fs.existsSync(entry.filePath)) {
      try {
        await fs.promises.unlink(entry.filePath);
      } catch (error) {
        console.error('删除歌词缓存文件失败:', error);
      }
    }

    delete entries[key];
    this.setLyricEntries(entries);
    return entry.size;
  }

  private async enforceCacheLimit(): Promise<void> {
    const config = this.getCacheConfig();
    await this.pruneMissingEntries();

    const maxBytes = config.maxSizeMB * 1024 * 1024;
    const items = this.getEvictionItems();
    let totalBytes = items.reduce((sum, item) => sum + item.size, 0);

    if (totalBytes <= maxBytes) {
      return;
    }

    items.sort((a, b) => {
      if (config.cleanupPolicy === 'fifo') {
        return a.createdAt - b.createdAt;
      }
      return a.lastAccessAt - b.lastAccessAt;
    });

    for (const item of items) {
      if (totalBytes <= maxBytes) break;
      const removedSize = await this.removeEntry(item.type, item.key);
      totalBytes -= removedSize;
    }
  }

  private updateMusicAccess(key: string): void {
    const entries = this.getMusicEntries();
    const entry = entries[key];
    if (!entry) return;

    entries[key] = {
      ...entry,
      lastAccessAt: Date.now(),
      playCount: entry.playCount + 1
    };
    this.setMusicEntries(entries);
  }

  private updateLyricAccess(key: string): void {
    const entries = this.getLyricEntries();
    const entry = entries[key];
    if (!entry) return;

    entries[key] = {
      ...entry,
      lastAccessAt: Date.now()
    };
    this.setLyricEntries(entries);
  }

  private async getCachedMusicUrl(payload: ResolveMusicUrlPayload): Promise<string | null> {
    const key = this.buildMusicKey(payload.songId, payload.source);
    const entries = this.getMusicEntries();
    const entry = entries[key];
    if (!entry) return null;

    if (!fs.existsSync(entry.filePath)) {
      delete entries[key];
      this.setMusicEntries(entries);
      return null;
    }

    if (entry.urlHash !== this.buildUrlHash(payload.url)) {
      return null;
    }

    this.updateMusicAccess(key);
    return this.toLocalUrl(entry.filePath);
  }

  private async downloadAndCacheMusic(payload: ResolveMusicUrlPayload): Promise<void> {
    const config = this.getCacheConfig();
    if (!config.enabled || !this.isRemoteAudioUrl(payload.url)) {
      return;
    }

    this.ensureDirectories(config);

    const key = this.buildMusicKey(payload.songId, payload.source);
    const source = payload.source || 'unknown';
    const urlHash = this.buildUrlHash(payload.url);
    const musicDir = this.getMusicCacheDir(config.directory);

    const existingEntry = this.getMusicEntries()[key];
    if (
      existingEntry &&
      existingEntry.urlHash === urlHash &&
      fs.existsSync(existingEntry.filePath)
    ) {
      return;
    }

    const tempFilePath = path.join(musicDir, `${key}_${Date.now()}.tmp`);
    let contentType: string | undefined;

    try {
      const response = await axios({
        url: payload.url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000,
        maxRedirects: 5
      });

      contentType =
        typeof response.headers['content-type'] === 'string'
          ? response.headers['content-type']
          : undefined;

      const writer = fs.createWriteStream(tempFilePath);
      await new Promise<void>((resolve, reject) => {
        response.data.on('error', reject);
        writer.on('error', reject);
        writer.on('finish', resolve);
        response.data.pipe(writer);
      });

      const extension = this.resolveAudioExtension(payload.url, contentType);
      const filePath = path.join(musicDir, `${key}_${urlHash}${extension}`);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(tempFilePath);
      } else {
        await fs.promises.rename(tempFilePath, filePath);
      }

      if (
        existingEntry?.filePath &&
        existingEntry.filePath !== filePath &&
        fs.existsSync(existingEntry.filePath)
      ) {
        await fs.promises.unlink(existingEntry.filePath);
      }

      const size = fs.statSync(filePath).size;
      const now = Date.now();

      const entries = this.getMusicEntries();
      entries[key] = {
        key,
        songId: payload.songId,
        source,
        filePath,
        urlHash,
        size,
        createdAt: existingEntry?.createdAt || now,
        lastAccessAt: now,
        playCount: (existingEntry?.playCount || 0) + 1,
        title: payload.title,
        artist: payload.artist
      };
      this.setMusicEntries(entries);

      await this.enforceCacheLimit();
    } catch (error) {
      console.error(`缓存音乐失败: ${payload.songId}`, error);
      if (fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {
          // 忽略临时文件清理错误
        }
      }
    }
  }

  private queueMusicCache(payload: ResolveMusicUrlPayload): void {
    const key = this.buildMusicKey(payload.songId, payload.source);
    const task = this.pendingMusicDownloads.get(key);
    if (task) return;

    const pendingTask = this.downloadAndCacheMusic(payload).finally(() => {
      this.pendingMusicDownloads.delete(key);
    });
    this.pendingMusicDownloads.set(key, pendingTask);
  }

  public async resolveMusicUrl(payload: ResolveMusicUrlPayload): Promise<ResolveMusicUrlResult> {
    if (!payload || !payload.url || !payload.songId) {
      return {
        url: payload?.url || '',
        cached: false,
        queued: false
      };
    }

    if (/^(local|file):\/\//i.test(payload.url)) {
      return {
        url: payload.url,
        cached: true,
        queued: false
      };
    }

    const config = this.getCacheConfig();
    if (!config.enabled) {
      return {
        url: payload.url,
        cached: false,
        queued: false
      };
    }

    await this.pruneMissingEntries();

    const cachedUrl = await this.getCachedMusicUrl(payload);
    if (cachedUrl) {
      return {
        url: cachedUrl,
        cached: true,
        queued: false
      };
    }

    this.queueMusicCache(payload);
    return {
      url: payload.url,
      cached: false,
      queued: true
    };
  }

  public async cacheLyric(songId: number, lyricData: unknown): Promise<boolean> {
    try {
      const config = this.getCacheConfig();
      if (!config.enabled) {
        return false;
      }

      this.ensureDirectories(config);
      const key = this.buildLyricKey(songId);
      const lyricDir = this.getLyricCacheDir(config.directory);
      const filePath = path.join(lyricDir, `${key}.json`);
      const content = JSON.stringify(lyricData);

      await fs.promises.writeFile(filePath, content, 'utf8');

      const now = Date.now();
      const entries = this.getLyricEntries();
      entries[key] = {
        key,
        songId,
        filePath,
        size: Buffer.byteLength(content, 'utf8'),
        createdAt: entries[key]?.createdAt || now,
        lastAccessAt: now
      };
      this.setLyricEntries(entries);

      await this.enforceCacheLimit();
      return true;
    } catch (error) {
      console.error('缓存歌词失败:', error);
      return false;
    }
  }

  public async getCachedLyric(songId: number): Promise<unknown | undefined> {
    try {
      const config = this.getCacheConfig();
      if (!config.enabled) {
        return undefined;
      }

      const key = this.buildLyricKey(songId);
      const entries = this.getLyricEntries();
      const entry = entries[key];
      if (!entry) {
        return undefined;
      }

      if (!fs.existsSync(entry.filePath)) {
        delete entries[key];
        this.setLyricEntries(entries);
        return undefined;
      }

      const content = await fs.promises.readFile(entry.filePath, 'utf8');
      this.updateLyricAccess(key);
      return JSON.parse(content);
    } catch (error) {
      console.error('读取缓存歌词失败:', error);
      return undefined;
    }
  }

  private async clearByType(type: CacheItemType): Promise<void> {
    if (type === 'music') {
      const keys = Object.keys(this.getMusicEntries());
      for (const key of keys) {
        await this.removeEntry('music', key);
      }
      return;
    }

    const keys = Object.keys(this.getLyricEntries());
    for (const key of keys) {
      await this.removeEntry('lyrics', key);
    }
  }

  public async clearCache(scope: CacheScope = 'all'): Promise<boolean> {
    try {
      if (scope === 'all' || scope === 'music') {
        await this.clearByType('music');
      }
      if (scope === 'all' || scope === 'lyrics') {
        await this.clearByType('lyrics');
      }
      return true;
    } catch (error) {
      console.error('清理缓存失败:', error);
      return false;
    }
  }

  public async clearLyricCache(): Promise<boolean> {
    return await this.clearCache('lyrics');
  }

  public async getCacheStats(): Promise<DiskCacheStats> {
    const config = this.getCacheConfig();
    await this.pruneMissingEntries();

    const musicEntries = Object.values(this.getMusicEntries());
    const lyricEntries = Object.values(this.getLyricEntries());

    const musicSizeBytes = musicEntries.reduce((sum, entry) => sum + entry.size, 0);
    const lyricSizeBytes = lyricEntries.reduce((sum, entry) => sum + entry.size, 0);
    const totalSizeBytes = musicSizeBytes + lyricSizeBytes;
    const totalLimitBytes = config.maxSizeMB * 1024 * 1024;
    const usage = totalLimitBytes > 0 ? Math.min(1, totalSizeBytes / totalLimitBytes) : 0;

    return {
      enabled: config.enabled,
      directory: config.directory,
      maxSizeMB: config.maxSizeMB,
      cleanupPolicy: config.cleanupPolicy,
      totalSizeBytes,
      musicSizeBytes,
      lyricSizeBytes,
      totalFiles: musicEntries.length + lyricEntries.length,
      musicFiles: musicEntries.length,
      lyricFiles: lyricEntries.length,
      usage
    };
  }
}

export const cacheManager = new DiskCacheManager();

export function initializeCacheManager(): void {
  const CLEAR_LYRIC_CHANNELS = ['clear-lyric-cache', 'clear-lyrics-cache'] as const;
  cacheManager.initialize();

  ipcMain.handle('cache-lyric', async (_, id: number, lyricData: unknown) => {
    return await cacheManager.cacheLyric(id, lyricData);
  });

  ipcMain.handle('get-cached-lyric', async (_, id: number) => {
    return await cacheManager.getCachedLyric(id);
  });

  ipcMain.handle('resolve-cached-music-url', async (_, payload: ResolveMusicUrlPayload) => {
    return await cacheManager.resolveMusicUrl(payload);
  });

  ipcMain.handle('get-disk-cache-config', async () => {
    return cacheManager.getCacheConfig();
  });

  ipcMain.handle('set-disk-cache-config', async (_, partial: Partial<DiskCacheConfig>) => {
    return await cacheManager.updateCacheConfig(partial);
  });

  ipcMain.handle('switch-disk-cache-directory', async (_, payload: SwitchCacheDirectoryPayload) => {
    return await cacheManager.switchCacheDirectory(payload);
  });

  ipcMain.handle('get-disk-cache-stats', async () => {
    return await cacheManager.getCacheStats();
  });

  ipcMain.handle('clear-disk-cache', async (_, scope: CacheScope = 'all') => {
    return await cacheManager.clearCache(scope);
  });

  for (const channel of CLEAR_LYRIC_CHANNELS) {
    ipcMain.handle(channel, async () => {
      return await cacheManager.clearLyricCache();
    });
  }
}
