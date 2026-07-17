import axios, { type AxiosResponse } from 'axios';
import crypto from 'crypto';
import { app, BrowserWindow, ipcMain, nativeImage, Notification, shell } from 'electron';
import Store from 'electron-store';
import { fileTypeFromFile } from 'file-type';
import { FlacTagMap, writeFlacTags } from 'flac-tagger';
import * as fs from 'fs';
import * as mm from 'music-metadata';
import * as NodeID3 from 'node-id3';
import * as os from 'os';
import * as path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { URL } from 'url';

import type {
  DownloadBatchCompleteEvent,
  DownloadProgressEvent,
  DownloadStateChangeEvent,
  DownloadTask,
  DownloadTaskState
} from '../../shared/download';
import {
  getSongAlbumName,
  getSongArtistNames,
  getSongArtists,
  getSongCoverUrl
} from '../../shared/domain/songFields';
import { getStore } from './config';
import { resolveSafePath } from './pathGuard';
import {
  assertSafeCoverUrl,
  assertSafeHttpsUrl,
  DOWNLOAD_URL_LIMITS,
  UnsafeUrlError
} from './urlGuard';

// ─── 工具 ─────────────────────────────────────────────────────────

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHttpsUrl(raw: string): boolean {
  try {
    return new URL(raw).protocol === 'https:';
  } catch {
    return false;
  }
}

/** 限并发 map */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = Array.from({ length: items.length }) as R[];
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) || 0 }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * 手动跟随重定向的 HTTPS GET（每跳校验 URL/DNS），用于音频流与封面。
 */
async function httpsGetWithGuard(
  rawUrl: string,
  options: {
    responseType: 'stream' | 'arraybuffer';
    timeout: number;
    signal?: AbortSignal;
    headers?: Record<string, string>;
    maxBytes?: number;
  }
): Promise<AxiosResponse> {
  let current = await assertSafeHttpsUrl(rawUrl);

  for (let hop = 0; hop <= DOWNLOAD_URL_LIMITS.maxRedirects; hop++) {
    const response = await axios({
      url: current,
      method: 'GET',
      responseType: options.responseType,
      timeout: options.timeout,
      signal: options.signal,
      headers: options.headers,
      maxRedirects: 0,
      maxContentLength: options.maxBytes ?? Infinity,
      maxBodyLength: options.maxBytes ?? Infinity,
      validateStatus: () => true
    });

    const status = response.status;
    if (status >= 300 && status < 400 && response.headers.location) {
      if (options.responseType === 'stream') {
        response.data?.destroy?.();
      }
      const nextHref = new URL(String(response.headers.location), current).href;
      current = await assertSafeHttpsUrl(nextHref);
      continue;
    }

    return response;
  }

  throw new UnsafeUrlError('重定向次数过多');
}

// ─── 批处理跟踪 ─────────────────────────────────────────────────────

type BatchEntry = { total: number; finished: number; success: number };

// ─── 持久化 store 类型 ──────────────────────────────────────────────

type DownloadQueueStore = {
  tasks: DownloadTask[];
};

// ─── 下载管理器 ─────────────────────────────────────────────────

class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private activeCount = 0;
  private maxConcurrent = 3;
  private persistStore: Store<DownloadQueueStore>;
  private batchTracker: Map<string, BatchEntry> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private progressThrottles: Map<string, number> = new Map();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.persistStore = new Store<DownloadQueueStore>({
      name: 'download-queue',
      defaults: { tasks: [] }
    });

    this.loadPersistedQueue();
    this.cleanOrphanedTempFiles();

    app.on('before-quit', () => {
      // 中止全部进行中下载，标为暂停，同步落盘
      for (const [taskId, controller] of this.abortControllers.entries()) {
        controller.abort();
        const task = this.tasks.get(taskId);
        if (task && (task.state === 'downloading' || task.state === 'waitingForUrl')) {
          task.state = 'paused';
        }
      }
      this.persistQueueSync();
    });
  }

  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  // ─── IPC 注册 ───────────────────────────────────────────────────

  registerIpcHandlers() {
    ipcMain.handle('download:add', (_, payload) => this.addTask(payload));
    ipcMain.handle('download:add-batch', (_, payload) => this.addBatch(payload));
    ipcMain.handle('download:pause', (_, taskId: string) => this.pauseTask(taskId));
    ipcMain.handle('download:resume', (_, taskId: string) => this.resumeTask(taskId));
    ipcMain.handle('download:cancel', (_, taskId: string) => this.cancelTask(taskId));
    ipcMain.handle('download:cancel-all', () => this.cancelAll());
    ipcMain.handle('download:get-queue', () => this.getQueue());
    ipcMain.on('download:set-concurrency', (_, value: number) => this.setConcurrency(value));
    ipcMain.handle('download:get-completed', () => this.getCompleted());
    ipcMain.handle('download:delete-completed', (_, filePath: string) =>
      this.deleteCompleted(filePath)
    );
    ipcMain.handle('download:clear-completed', () => this.clearCompleted());
    ipcMain.handle('download:get-embedded-lyrics', (_, filePath: string) =>
      this.getEmbeddedLyrics(filePath)
    );
    ipcMain.handle('download:provide-url', (_, payload: { taskId: string; url: string }) =>
      this.provideUrl(payload.taskId, payload.url)
    );
  }

  // ─── 创建任务 ────────────────────────────────────────────────────

  private addTask(payload: {
    url: string;
    filename: string;
    songInfo: any;
    type?: string;
  }): string {
    if (this.tasks.size >= DOWNLOAD_URL_LIMITS.maxQueueTasks) {
      throw new Error(`下载队列已满（最多 ${DOWNLOAD_URL_LIMITS.maxQueueTasks} 个任务）`);
    }
    if (!payload?.url || !isHttpsUrl(payload.url)) {
      throw new Error('下载地址必须是 HTTPS');
    }

    const taskId = crypto.randomUUID();
    const task: DownloadTask = {
      taskId,
      url: payload.url,
      filename: payload.filename,
      songInfo: payload.songInfo,
      type: payload.type || 'mp3',
      state: 'queued',
      progress: 0,
      loaded: 0,
      total: 0,
      tempFilePath: '',
      finalFilePath: '',
      createdAt: Date.now()
    };

    this.tasks.set(taskId, task);
    this.persistQueue();
    this.sendStateChange(task);
    this.processQueue();
    return taskId;
  }

  private addBatch(payload: {
    items: { url: string; filename: string; songInfo: any; type?: string }[];
  }): { batchId: string; taskIds: string[] } {
    const batchId = crypto.randomUUID();
    const taskIds: string[] = [];
    const items = payload?.items || [];

    const room = DOWNLOAD_URL_LIMITS.maxQueueTasks - this.tasks.size;
    if (room <= 0) {
      throw new Error(`下载队列已满（最多 ${DOWNLOAD_URL_LIMITS.maxQueueTasks} 个任务）`);
    }

    const accepted = items.slice(0, room).filter((item) => item?.url && isHttpsUrl(item.url));

    this.batchTracker.set(batchId, {
      total: accepted.length,
      finished: 0,
      success: 0
    });

    for (const item of accepted) {
      const taskId = crypto.randomUUID();
      const task: DownloadTask = {
        taskId,
        url: item.url,
        filename: item.filename,
        songInfo: item.songInfo,
        type: item.type || 'mp3',
        state: 'queued',
        progress: 0,
        loaded: 0,
        total: 0,
        tempFilePath: '',
        finalFilePath: '',
        createdAt: Date.now(),
        batchId
      };

      this.tasks.set(taskId, task);
      taskIds.push(taskId);
      this.sendStateChange(task);
    }

    this.persistQueue();
    this.processQueue();
    return { batchId, taskIds };
  }

  // ─── 暂停 / 继续 / 取消 ────────────────────────────────────────

  private pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }

    task.state = 'paused';
    this.persistQueue();
    this.sendStateChange(task);
    return true;
  }

  private resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || (task.state !== 'paused' && task.state !== 'error')) return false;

    task.state = 'queued';
    this.persistQueue();
    this.sendStateChange(task);
    this.processQueue();
    return true;
  }

  private cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // 下载中则中止
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }

    if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
      try {
        fs.unlinkSync(task.tempFilePath);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
    }

    task.state = 'cancelled';
    this.sendStateChange(task);
    this.tasks.delete(taskId);
    this.persistQueue();
    return true;
  }

  private cancelAll(): void {
    const taskIds = [...this.tasks.keys()];
    for (const taskId of taskIds) {
      this.cancelTask(taskId);
    }
  }

  // ─── 队列查询 ──────────────────────────────────────────────────

  private getQueue(): DownloadTask[] {
    return [...this.tasks.values()].filter(
      (t) =>
        t.state === 'queued' ||
        t.state === 'paused' ||
        t.state === 'downloading' ||
        t.state === 'waitingForUrl'
    );
  }

  // ─── 并发 ─────────────────────────────────────────────────────

  private setConcurrency(value: number): void {
    this.maxConcurrent = Math.max(1, Math.min(5, value));
    this.processQueue();
  }

  // ─── 已完成曲目（逻辑同旧 fileManager） ──────────────────────────

  private async getCompleted(): Promise<any[]> {
    try {
      const configStore = getStore();
      const songInfos = (configStore.get('downloadedSongs') || {}) as Record<string, any>;

      const entriesArray = Object.entries(songInfos);
      // 限并发 stat，避免完成列表过大时打爆主进程
      const checks = await mapPool(
        entriesArray,
        DOWNLOAD_URL_LIMITS.completedStatConcurrency,
        async ([filePath, info]) => {
          try {
            const safe = resolveSafePath(filePath);
            if (!safe) return null;
            await fs.promises.access(safe);
            return info;
          } catch {
            return null;
          }
        }
      );

      const validSongs = checks
        .filter((song) => song !== null)
        .sort((a: any, b: any) => (b.downloadTime || 0) - (a.downloadTime || 0));

      const newSongInfos = validSongs.reduce(
        (acc: Record<string, any>, song: any) => {
          if (song && song.path) {
            acc[song.path] = song;
          }
          return acc;
        },
        {} as Record<string, any>
      );

      // 仅当有失效项时才写 store，避免无意义整表重写
      const prevKeys = Object.keys(songInfos);
      const nextKeys = Object.keys(newSongInfos);
      const dirty = prevKeys.length !== nextKeys.length || prevKeys.some((k) => !newSongInfos[k]);
      if (dirty) {
        configStore.set('downloadedSongs', newSongInfos);
      }

      return validSongs;
    } catch (error) {
      console.error('Error getting downloaded music:', error);
      return [];
    }
  }

  private async deleteCompleted(filePath: string): Promise<boolean> {
    try {
      if (typeof filePath !== 'string' || !filePath) {
        return false;
      }

      const configStore = getStore();
      const songInfos = (configStore.get('downloadedSongs') || {}) as Record<string, any>;

      // 必须已在下载注册表中，禁止对任意路径 unlink
      const registeredKey = Object.prototype.hasOwnProperty.call(songInfos, filePath)
        ? filePath
        : Object.keys(songInfos).find((key) => {
            const info = songInfos[key];
            return info?.path === filePath || key === filePath;
          });

      if (!registeredKey) {
        console.warn('[download] delete-completed rejected: not in downloadedSongs', filePath);
        return false;
      }

      const safePath = resolveSafePath(registeredKey) || resolveSafePath(filePath);
      if (!safePath) {
        console.warn('[download] delete-completed rejected: outside allowed roots', filePath);
        return false;
      }

      if (fs.existsSync(safePath)) {
        try {
          await fs.promises.unlink(safePath);
        } catch (error) {
          console.error('Error deleting file:', error);
          return false;
        }
      }

      delete songInfos[registeredKey];
      // 若 path 字段指向同一文件也清理
      if (registeredKey !== filePath && songInfos[filePath]) {
        delete songInfos[filePath];
      }
      configStore.set('downloadedSongs', songInfos);

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  private clearCompleted(): boolean {
    const configStore = getStore();
    configStore.set('downloadedSongs', {});
    return true;
  }

  // ─── 内嵌歌词读取 ───────────────────────────────────────────────

  private async getEmbeddedLyrics(filePath: string): Promise<string | null> {
    try {
      const safePath = resolveSafePath(filePath);
      if (!safePath || !fs.existsSync(safePath)) return null;

      const ext = path.extname(safePath).toLowerCase();

      if (ext === '.mp3') {
        const tags = NodeID3.read(safePath);
        if (tags && tags.unsynchronisedLyrics) {
          const uslt = tags.unsynchronisedLyrics as any;
          return uslt.text || (typeof uslt === 'string' ? uslt : null);
        }
        return null;
      }

      if (ext === '.flac') {
        const metadata = await mm.parseFile(safePath);
        const native = metadata.native;
        // 在 vorbis 注释中查找 LYRICS
        for (const format of Object.keys(native)) {
          const tags = native[format];
          const lyricsTag = tags.find(
            (t) => t.id.toUpperCase() === 'LYRICS' || t.id.toUpperCase() === 'UNSYNCEDLYRICS'
          );
          if (lyricsTag) return lyricsTag.value as string;
        }
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error reading embedded lyrics:', error);
      return null;
    }
  }

  // ─── 提供 URL（由渲染进程重新解析） ───────────────────────────

  private provideUrl(taskId: string, url: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // 仅处理仍在等链的任务；用户已 pause/cancel 则忽略迟到的 provide-url
    if (task.state !== 'waitingForUrl') {
      if (url && isHttpsUrl(url) && (task.state === 'queued' || task.state === 'paused')) {
        task.url = url;
      }
      return false;
    }

    if (!url || !isHttpsUrl(url)) {
      console.warn('[download] provide-url rejected non-HTTPS:', url);
      task.state = 'error';
      task.error = '下载地址必须是 HTTPS';
      this.persistQueue();
      this.sendStateChange(task);
      return false;
    }

    task.url = url;
    task.state = 'queued';
    this.persistQueue();
    this.sendStateChange(task);
    this.processQueue();
    return true;
  }

  // ─── 队列处理 ──────────────────────────────────────────────────

  private processQueue(): void {
    const queued = [...this.tasks.values()]
      .filter((t) => t.state === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt);

    while (this.activeCount < this.maxConcurrent && queued.length > 0) {
      const task = queued.shift()!;
      this.activeCount++;
      task.state = 'downloading';
      this.sendStateChange(task);
      this.downloadTask(task);
    }
  }

  // ─── 核心下载 ──────────────────────────────────────────────────

  private async downloadTask(task: DownloadTask): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(task.taskId, controller);

    // 每个执行实例只结算一次槽位；仅清理本实例持有的 controller
    let settled = false;
    const releaseSlot = () => {
      if (settled) return;
      settled = true;
      if (this.abortControllers.get(task.taskId) === controller) {
        this.abortControllers.delete(task.taskId);
      }
      this.progressThrottles.delete(task.taskId);
      this.activeCount = Math.max(0, this.activeCount - 1);
    };

    let writer: fs.WriteStream | null = null;

    try {
      // 出站 SSRF 校验（含 DNS）
      task.url = await assertSafeHttpsUrl(task.url);

      const configStore = getStore();
      const downloadPath =
        (configStore.get('set.downloadPath') as string) || app.getPath('downloads');

      // 格式化文件名
      const nameFormat =
        (configStore.get('set.downloadNameFormat') as string) || '{songName} - {artistName}';

      let formattedFilename = task.filename;
      if (task.songInfo) {
        const artistName = getSongArtistNames(task.songInfo as any, '\u3001', '未知艺术家');
        const songName = task.songInfo.name || task.filename;
        const albumName = task.songInfo.al?.name || '未知专辑';

        formattedFilename = nameFormat
          .replace(/\{songName\}/g, songName)
          .replace(/\{artistName\}/g, artistName)
          .replace(/\{albumName\}/g, albumName);
      }

      const sanitizedFilename = sanitizeFilename(formattedFilename);

      // 临时目录
      const tempDir = path.join(os.tmpdir(), 'LYMusicPlayerTemp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 续传用已有临时路径，否则新建
      if (!task.tempFilePath) {
        task.tempFilePath = path.join(tempDir, `${task.taskId}_${sanitizedFilename}.tmp`);
      }

      const headers: Record<string, string> = {};
      if (task.loaded > 0 && fs.existsSync(task.tempFilePath)) {
        headers['Range'] = `bytes=${task.loaded}-`;
      }

      // 手动跟随重定向 + 每跳 URL 校验；放行 403/410 以触发直链重解析
      const response = await httpsGetWithGuard(task.url, {
        responseType: 'stream',
        timeout: 30000,
        signal: controller.signal,
        headers,
        maxBytes: DOWNLOAD_URL_LIMITS.maxAudioBytes
      });

      const status = response.status;

      if (status === 403 || status === 410) {
        response.data?.destroy?.();
        // 进入等待 URL 状态，不重入队；等 provideUrl 后再 queued
        if (this.abortControllers.get(task.taskId) === controller && task.state === 'downloading') {
          task.state = 'waitingForUrl';
          this.sendStateChange(task);
          this.sendToRenderer('download:request-url', {
            taskId: task.taskId,
            songInfo: task.songInfo
          });
          this.persistQueue();
        }
        return;
      }

      if (status < 200 || status >= 300) {
        response.data?.destroy?.();
        throw new Error(`下载失败 HTTP ${status}`);
      }

      let appendMode = false;
      if (status === 206) {
        appendMode = true;
        const contentRange = response.headers['content-range'];
        if (contentRange) {
          const totalMatch = contentRange.match(/\/(\d+)/);
          if (totalMatch) {
            task.total = parseInt(totalMatch[1], 10);
          }
        }
      } else {
        task.loaded = 0;
        const contentLength = response.headers['content-length'] as string;
        task.total = contentLength ? parseInt(contentLength, 10) : 0;
      }

      if (task.total > DOWNLOAD_URL_LIMITS.maxAudioBytes) {
        response.data?.destroy?.();
        throw new Error('文件超过大小限制');
      }

      writer = fs.createWriteStream(task.tempFilePath, {
        flags: appendMode ? 'a' : 'w'
      });

      // 进度 + 硬上限（pipeline 保证正确关闭流）
      const progressTransform = new Transform({
        transform: (chunk: Buffer, _enc, cb) => {
          task.loaded += chunk.length;
          if (task.loaded > DOWNLOAD_URL_LIMITS.maxAudioBytes) {
            cb(new Error('文件超过大小限制'));
            return;
          }
          if (task.total > 0) {
            task.progress = Math.min(100, Math.round((task.loaded / task.total) * 100));
          }
          const now = Date.now();
          const lastSent = this.progressThrottles.get(task.taskId) || 0;
          if (now - lastSent >= 250) {
            this.progressThrottles.set(task.taskId, now);
            this.sendProgress(task);
          }
          cb(null, chunk);
        }
      });

      await pipeline(response.data, progressTransform, writer);
      writer = null;

      task.progress = 100;
      this.sendProgress(task);

      await this.finalizeDownload(task, sanitizedFilename, downloadPath);
    } catch (error: any) {
      if (axios.isCancel(error) || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        // 用户中止（暂停/取消）— 不标错误
        return;
      }

      console.error(`Download error for task ${task.taskId}:`, error);
      task.state = 'error';
      task.error =
        error instanceof UnsafeUrlError ? error.message : error.message || 'Download failed';
      this.sendStateChange(task);

      // 记录批次错误
      this.handleBatchError(task);

      // 出错时清理临时文件
      if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
        try {
          fs.unlinkSync(task.tempFilePath);
          task.tempFilePath = '';
          task.loaded = 0;
        } catch (e) {
          console.error('Failed to delete temp file:', e);
        }
      }

      this.persistQueue();
    } finally {
      releaseSlot();
      this.processQueue();
    }
  }

  // ─── 完成下载收尾 ──────────────────────────────────────────────

  private async finalizeDownload(
    task: DownloadTask,
    sanitizedFilename: string,
    downloadPath: string
  ): Promise<void> {
    const configStore = getStore();

    let fileExtension = '';
    try {
      const fileType = await fileTypeFromFile(task.tempFilePath);
      if (fileType && fileType.ext) {
        fileExtension = `.${fileType.ext}`;
      } else {
        const metadata = await mm.parseFile(task.tempFilePath);
        if (metadata && metadata.format) {
          const container = metadata.format.container || '';
          const codec = metadata.format.codec || '';

          const formatMap: Record<string, string[]> = {
            mp3: ['MPEG', 'MP3', 'mp3'],
            aac: ['AAC'],
            flac: ['FLAC'],
            ogg: ['Ogg', 'Vorbis'],
            wav: ['WAV', 'PCM'],
            m4a: ['M4A', 'MP4']
          };

          const format = Object.entries(formatMap).find(([_, keywords]) =>
            keywords.some((keyword) => container.includes(keyword) || codec.includes(keyword))
          );

          fileExtension = format ? `.${format[0]}` : `.${task.type || 'mp3'}`;
        } else {
          fileExtension = `.${task.type || 'mp3'}`;
        }
      }
    } catch {
      fileExtension = `.${task.type || 'mp3'}`;
    }

    // 生成最终路径并去重（必须在允许根目录内）
    let finalFilePath = path.join(downloadPath, `${sanitizedFilename}${fileExtension}`);
    let counter = 1;
    while (fs.existsSync(finalFilePath)) {
      const ext = path.extname(finalFilePath);
      const base = path.join(downloadPath, sanitizedFilename);
      finalFilePath = `${base} (${counter})${ext}`;
      counter++;
    }

    const safeFinal = resolveSafePath(finalFilePath);
    if (!safeFinal) {
      throw new Error('下载路径不在允许目录内');
    }
    finalFilePath = safeFinal;

    // 临时文件移到最终路径
    fs.copyFileSync(task.tempFilePath, finalFilePath);
    fs.unlinkSync(task.tempFilePath);
    task.finalFilePath = finalFilePath;

    // 无在线歌词 API 时标签写空歌词；有封面 URL 仍拉封面
    const lyricsContent = '';
    const lyricData = null;

    // Download cover（HTTPS + 私网拒绝 + 体积上限；data URL 限长）
    let coverImageBuffer: Buffer | null = null;
    try {
      const picUrl = task.songInfo?.picUrl || task.songInfo?.al?.picUrl;
      if (picUrl && picUrl !== '/images/default_cover.png') {
        if (typeof picUrl === 'string' && picUrl.startsWith('data:')) {
          if (picUrl.length <= DOWNLOAD_URL_LIMITS.maxDataUrlChars) {
            const base64Match = picUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
            if (base64Match && base64Match[1].length <= DOWNLOAD_URL_LIMITS.maxCoverBytes) {
              const buf = Buffer.from(base64Match[1], 'base64');
              if (buf.length <= DOWNLOAD_URL_LIMITS.maxCoverBytes) {
                coverImageBuffer = buf;
              }
            }
          }
        } else if (typeof picUrl === 'string') {
          const safeCoverUrl = await assertSafeCoverUrl(picUrl);
          const coverResponse = await httpsGetWithGuard(safeCoverUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            maxBytes: DOWNLOAD_URL_LIMITS.maxCoverBytes
          });

          if (coverResponse.status < 200 || coverResponse.status >= 300) {
            throw new Error(`封面 HTTP ${coverResponse.status}`);
          }

          const originalCoverBuffer = Buffer.from(coverResponse.data);
          if (originalCoverBuffer.length > DOWNLOAD_URL_LIMITS.maxCoverBytes) {
            throw new Error('封面超过大小限制');
          }

          const TWO_MB = 2 * 1024 * 1024;

          if (originalCoverBuffer.length > TWO_MB) {
            try {
              const image = nativeImage.createFromBuffer(originalCoverBuffer);
              const size = image.getSize();
              const maxSize = 1600;
              let newWidth = size.width;
              let newHeight = size.height;

              if (size.width > maxSize || size.height > maxSize) {
                const ratio = Math.min(maxSize / size.width, maxSize / size.height);
                newWidth = Math.round(size.width * ratio);
                newHeight = Math.round(size.height * ratio);
              }

              const resizedImage = image.resize({
                width: newWidth,
                height: newHeight,
                quality: 'good'
              });
              coverImageBuffer = resizedImage.toJPEG(80);
            } catch {
              coverImageBuffer = originalCoverBuffer;
            }
          } else {
            coverImageBuffer = originalCoverBuffer;
          }
        }
      }
    } catch (coverError) {
      console.error('Failed to download cover:', coverError);
    }

    // 写入元数据
    // songInfo 可能带 DownloadSongInfo 以外字段（song、no、publishTime）
    const info: any = task.songInfo;
    const fileFormat = fileExtension.toLowerCase();
    const artistNames = getSongArtistNames(info, '\u3001', '未知艺术家');

    if (['.mp3'].includes(fileFormat)) {
      try {
        NodeID3.removeTags(finalFilePath);

        const tags = {
          title: info?.name,
          artist: artistNames,
          TPE1: artistNames,
          TPE2: artistNames,
          album: getSongAlbumName(info, task.filename),
          APIC: {
            imageBuffer: coverImageBuffer,
            type: { id: 3, name: 'front cover' },
            description: 'Album cover',
            mime: 'image/jpeg'
          },
          USLT: {
            language: 'chi',
            description: 'Lyrics',
            text: lyricsContent || ''
          },
          trackNumber: info?.no || undefined,
          year: info?.publishTime ? new Date(info.publishTime).getFullYear().toString() : undefined
        };

        const success = NodeID3.write(tags, finalFilePath);
        if (!success) {
          console.error('Failed to write ID3 tags');
        }
      } catch (err) {
        console.error('Error writing ID3 tags:', err);
      }
    } else if (['.flac'].includes(fileFormat)) {
      try {
        const tagMap: FlacTagMap = {
          TITLE: info?.name,
          ARTIST: artistNames,
          ALBUM: info?.al?.name || info?.song?.album?.name || info?.name || task.filename,
          LYRICS: lyricsContent || '',
          TRACKNUMBER: info?.no ? String(info.no) : '',
          DATE: info?.publishTime ? new Date(info.publishTime).getFullYear().toString() : ''
        };

        await writeFlacTags(
          {
            tagMap,
            picture: coverImageBuffer ? { buffer: coverImageBuffer, mime: 'image/jpeg' } : undefined
          },
          finalFilePath
        );
      } catch (err) {
        console.error('Error writing FLAC tags:', err);
      }
    }

    // 若开启设置则保存 .lrc
    if (lyricsContent && configStore.get('set.downloadSaveLyric')) {
      try {
        const lrcFilePath = finalFilePath.replace(/\.[^.]+$/, '.lrc');
        await fs.promises.writeFile(lrcFilePath, lyricsContent, 'utf-8');
      } catch (lrcError) {
        console.error('Failed to save lyrics file:', lrcError);
      }
    }

    // 写入 downloadedSongs
    const songInfos = (configStore.get('downloadedSongs') || {}) as Record<string, any>;
    const defaultInfo = {
      name: task.filename,
      ar: [{ name: '本地音乐' }],
      picUrl: '/images/default_cover.png'
    };

    const totalSize = task.total;
    const songMeta = task.songInfo as any;
    const artists = getSongArtists(songMeta);
    const cover = getSongCoverUrl(songMeta) || defaultInfo.picUrl;
    const newSongInfo = {
      id: songMeta?.id || 0,
      name: songMeta?.name || task.filename,
      filename: task.filename,
      picUrl: cover,
      ar: artists.length ? artists.map((a) => ({ name: a.name || '' })) : defaultInfo.ar,
      al: songMeta?.al || {
        picUrl: cover,
        name: getSongAlbumName(songMeta, task.filename)
      },
      size: totalSize,
      path: finalFilePath,
      downloadTime: Date.now(),
      type: fileExtension.substring(1),
      lyric: lyricData
    };

    songInfos[finalFilePath] = newSongInfo;
    configStore.set('downloadedSongs', songInfos);

    task.state = 'completed';
    this.sendStateChange(task);

    if (task.batchId) {
      const batch = this.batchTracker.get(task.batchId);
      if (batch) {
        batch.finished++;
        batch.success++;

        if (batch.finished >= batch.total) {
          // 本批次任务全部完成
          const failed = batch.total - batch.success;

          try {
            const notification = new Notification({
              title: '批量下载完成',
              body: `共 ${batch.total} 首，成功 ${batch.success} 首${failed > 0 ? `，失败 ${failed} 首` : ''}`,
              silent: false
            });
            notification.show();
          } catch (e) {
            console.error('Failed to send batch notification:', e);
          }

          const batchEvent: DownloadBatchCompleteEvent = {
            batchId: task.batchId,
            total: batch.total,
            success: batch.success,
            failed
          };
          this.sendToRenderer('download:batch-complete', batchEvent);
          this.batchTracker.delete(task.batchId);
        }
      }
    } else {
      // 单条通知
      try {
        const notification = new Notification({
          title: '下载完成',
          body: `${task.songInfo?.name || task.filename} - ${artistNames}`,
          silent: false
        });
        notification.on('click', () => {
          shell.showItemInFolder(finalFilePath);
        });
        notification.show();
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
    }

    // 从进行中移除已完成任务并落盘
    this.tasks.delete(task.taskId);
    this.persistQueue();
  }

  // ─── 批次错误跟踪 ──────────────────────────────────────────────

  private handleBatchError(task: DownloadTask): void {
    if (!task.batchId) return;
    const batch = this.batchTracker.get(task.batchId);
    if (!batch) return;

    batch.finished++;
    // 出错时不增加 success 计数

    if (batch.finished >= batch.total) {
      const failed = batch.total - batch.success;
      try {
        const notification = new Notification({
          title: '批量下载完成',
          body: `共 ${batch.total} 首，成功 ${batch.success} 首${failed > 0 ? `，失败 ${failed} 首` : ''}`,
          silent: false
        });
        notification.show();
      } catch (e) {
        console.error('Failed to send batch notification:', e);
      }

      const batchEvent: DownloadBatchCompleteEvent = {
        batchId: task.batchId,
        total: batch.total,
        success: batch.success,
        failed
      };
      this.sendToRenderer('download:batch-complete', batchEvent);
      this.batchTracker.delete(task.batchId);
    }
  }

  // ─── IPC 发送辅助 ──────────────────────────────────────────────

  private sendToRenderer(channel: string, data: any): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(channel, data);
      }
    } catch {
      // 窗口可能已关闭
    }
  }

  private sendStateChange(task: DownloadTask): void {
    const event: DownloadStateChangeEvent = {
      taskId: task.taskId,
      state: task.state,
      task: { ...task }
    };
    this.sendToRenderer('download:state-change', event);
  }

  private sendProgress(task: DownloadTask): void {
    const event: DownloadProgressEvent = {
      taskId: task.taskId,
      progress: task.progress,
      loaded: task.loaded,
      total: task.total
    };
    this.sendToRenderer('download:progress', event);
  }

  // ─── 持久化 ───────────────────────────────────────────────────

  private persistQueue(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistQueueSync();
    }, 500);
  }

  private persistQueueSync(): void {
    const tasksToSave = [...this.tasks.values()].filter(
      (t) =>
        t.state === 'queued' ||
        t.state === 'paused' ||
        t.state === 'downloading' ||
        t.state === 'waitingForUrl'
    );
    // downloading / waitingForUrl 落盘为 paused，冷启动后由用户 resume
    const serialized = tasksToSave.map((t) => ({
      ...t,
      state: (t.state === 'downloading' || t.state === 'waitingForUrl'
        ? 'paused'
        : t.state) as DownloadTaskState
    }));
    this.persistStore.set('tasks', serialized);
  }

  private loadPersistedQueue(): void {
    try {
      const saved = this.persistStore.get('tasks', []);
      for (const task of saved) {
        if (task.state === 'downloading' || task.state === 'waitingForUrl') {
          task.state = 'paused';
        }
        this.tasks.set(task.taskId, task);
      }
    } catch (error) {
      console.error('Failed to load persisted download queue:', error);
    }
  }

  private cleanOrphanedTempFiles(): void {
    try {
      const tempDir = path.join(os.tmpdir(), 'LYMusicPlayerTemp');
      if (!fs.existsSync(tempDir)) return;

      const knownTempPaths = new Set(
        [...this.tasks.values()].map((t) => t.tempFilePath).filter(Boolean)
      );

      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        if (!file.endsWith('.tmp')) continue;
        const fullPath = path.join(tempDir, file);
        if (!knownTempPaths.has(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch {
            // 忽略
          }
        }
      }
    } catch {
      // 临时目录可能不存在
    }
  }
}

// ─── 单例与导出 ───────────────────────────────────────────────────

let instance: DownloadManager | null = null;

export function initializeDownloadManager(): void {
  instance = new DownloadManager();
  instance.registerIpcHandlers();
}

export function setDownloadManagerWindow(mainWindow: BrowserWindow): void {
  if (instance) {
    instance.setMainWindow(mainWindow);
  }
}
