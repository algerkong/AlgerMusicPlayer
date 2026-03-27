import axios from 'axios';
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

import type {
  DownloadBatchCompleteEvent,
  DownloadProgressEvent,
  DownloadStateChangeEvent,
  DownloadTask,
  DownloadTaskState
} from '../../shared/download';
import { getStore } from './config';

// ─── Helpers ─────────────────────────────────────────────────────────

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLyrics(lyricsText: string): Map<string, string> {
  const lyricMap = new Map<string, string>();
  const lines = lyricsText.split('\n');

  for (const line of lines) {
    const timeTagMatches = line.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g);
    if (!timeTagMatches) continue;

    const content = line.replace(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g, '').trim();
    if (!content) continue;

    for (const timeTag of timeTagMatches) {
      lyricMap.set(timeTag, content);
    }
  }

  return lyricMap;
}

function mergeLyrics(
  originalLyrics: Map<string, string>,
  translatedLyrics: Map<string, string>
): string {
  const mergedLines: string[] = [];

  for (const [timeTag, originalContent] of originalLyrics.entries()) {
    const translatedContent = translatedLyrics.get(timeTag);
    mergedLines.push(`${timeTag}${originalContent}`);
    if (translatedContent) {
      mergedLines.push(`${timeTag}${translatedContent}`);
    }
  }

  mergedLines.sort((a, b) => {
    const timeA = a.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    const timeB = b.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    return timeA.localeCompare(timeB);
  });

  return mergedLines.join('\n');
}

// ─── Batch tracker entry ─────────────────────────────────────────────

type BatchEntry = { total: number; finished: number; success: number };

// ─── Persist store type ──────────────────────────────────────────────

type DownloadQueueStore = {
  tasks: DownloadTask[];
};

// ─── DownloadManager ─────────────────────────────────────────────────

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
      // Abort all active downloads, set to paused, persist synchronously
      for (const [taskId, controller] of this.abortControllers.entries()) {
        controller.abort();
        const task = this.tasks.get(taskId);
        if (task && task.state === 'downloading') {
          task.state = 'paused';
        }
      }
      this.persistQueueSync();
    });
  }

  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  // ─── IPC Registration ───────────────────────────────────────────

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

  // ─── Task creation ──────────────────────────────────────────────

  private addTask(payload: {
    url: string;
    filename: string;
    songInfo: any;
    type?: string;
  }): string {
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

    this.batchTracker.set(batchId, {
      total: payload.items.length,
      finished: 0,
      success: 0
    });

    for (const item of payload.items) {
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

  // ─── Pause / Resume / Cancel ────────────────────────────────────

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

    // Abort if downloading
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }

    // Delete temp file
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

  // ─── Queue queries ──────────────────────────────────────────────

  private getQueue(): DownloadTask[] {
    return [...this.tasks.values()].filter(
      (t) => t.state === 'queued' || t.state === 'paused' || t.state === 'downloading'
    );
  }

  // ─── Concurrency ───────────────────────────────────────────────

  private setConcurrency(value: number): void {
    this.maxConcurrent = Math.max(1, Math.min(5, value));
    this.processQueue();
  }

  // ─── Completed songs (same logic as old fileManager) ────────────

  private async getCompleted(): Promise<any[]> {
    try {
      const configStore = getStore();
      const songInfos = (configStore.get('downloadedSongs') || {}) as Record<string, any>;

      const entriesArray = Object.entries(songInfos);
      const validEntriesPromises = await Promise.all(
        entriesArray.map(async ([filePath, info]) => {
          try {
            const exists = await fs.promises
              .access(filePath)
              .then(() => true)
              .catch(() => false);
            return exists ? info : null;
          } catch {
            return null;
          }
        })
      );

      const validSongs = validEntriesPromises
        .filter((song) => song !== null)
        .sort((a: any, b: any) => (b.downloadTime || 0) - (a.downloadTime || 0));

      // Update store to remove stale entries
      const newSongInfos = validSongs.reduce(
        (acc: Record<string, any>, song: any) => {
          if (song && song.path) {
            acc[song.path] = song;
          }
          return acc;
        },
        {} as Record<string, any>
      );
      configStore.set('downloadedSongs', newSongInfos);

      return validSongs;
    } catch (error) {
      console.error('Error getting downloaded music:', error);
      return [];
    }
  }

  private async deleteCompleted(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch (error) {
          console.error('Error deleting file:', error);
        }

        const configStore = getStore();
        const songInfos = (configStore.get('downloadedSongs') || {}) as Record<string, any>;
        delete songInfos[filePath];
        configStore.set('downloadedSongs', songInfos);

        return true;
      }
      return false;
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

  // ─── Embedded lyrics reader ─────────────────────────────────────

  private async getEmbeddedLyrics(filePath: string): Promise<string | null> {
    try {
      if (!fs.existsSync(filePath)) return null;

      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.mp3') {
        const tags = NodeID3.read(filePath);
        if (tags && tags.unsynchronisedLyrics) {
          const uslt = tags.unsynchronisedLyrics as any;
          return uslt.text || (typeof uslt === 'string' ? uslt : null);
        }
        return null;
      }

      if (ext === '.flac') {
        const metadata = await mm.parseFile(filePath);
        const native = metadata.native;
        // Look for LYRICS in vorbis comments
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

  // ─── Provide URL (re-resolved by renderer) ─────────────────────

  private provideUrl(taskId: string, url: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.url = url;
    if (task.state === 'queued' || task.state === 'paused') {
      task.state = 'queued';
      this.sendStateChange(task);
      this.processQueue();
    }
    return true;
  }

  // ─── Queue processing ──────────────────────────────────────────

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

  // ─── Core download ─────────────────────────────────────────────

  private async downloadTask(task: DownloadTask): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(task.taskId, controller);

    let writer: fs.WriteStream | null = null;

    try {
      const configStore = getStore();
      const downloadPath =
        (configStore.get('set.downloadPath') as string) || app.getPath('downloads');

      // Format filename
      const nameFormat =
        (configStore.get('set.downloadNameFormat') as string) || '{songName} - {artistName}';

      let formattedFilename = task.filename;
      if (task.songInfo) {
        const artistName = task.songInfo.ar?.map((a: any) => a.name).join('\u3001') || '未知艺术家';
        const songName = task.songInfo.name || task.filename;
        const albumName = task.songInfo.al?.name || '未知专辑';

        formattedFilename = nameFormat
          .replace(/\{songName\}/g, songName)
          .replace(/\{artistName\}/g, artistName)
          .replace(/\{albumName\}/g, albumName);
      }

      const sanitizedFilename = sanitizeFilename(formattedFilename);

      // Temp directory
      const tempDir = path.join(os.tmpdir(), 'AlgerMusicPlayerTemp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Use existing temp file path if resuming, otherwise create new one
      if (!task.tempFilePath) {
        task.tempFilePath = path.join(tempDir, `${task.taskId}_${sanitizedFilename}.tmp`);
      }

      // Build request headers for resume
      const headers: Record<string, string> = {};
      if (task.loaded > 0 && fs.existsSync(task.tempFilePath)) {
        headers['Range'] = `bytes=${task.loaded}-`;
      }

      // Start download
      const response = await axios({
        url: task.url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000,
        signal: controller.signal,
        headers
      });

      // Handle response status
      const status = response.status;

      if (status === 403 || status === 410) {
        // URL expired, request re-resolution from renderer
        this.sendToRenderer('download:request-url', {
          taskId: task.taskId,
          songInfo: task.songInfo
        });
        task.state = 'queued';
        this.sendStateChange(task);
        this.activeCount--;
        this.processQueue();
        return;
      }

      let appendMode = false;
      if (status === 206) {
        // Partial content - resume mode
        appendMode = true;
        const contentRange = response.headers['content-range'];
        if (contentRange) {
          const totalMatch = contentRange.match(/\/(\d+)/);
          if (totalMatch) {
            task.total = parseInt(totalMatch[1], 10);
          }
        }
      } else {
        // Full response (200) - start from beginning
        task.loaded = 0;
        const contentLength = response.headers['content-length'];
        task.total = contentLength ? parseInt(contentLength, 10) : 0;
      }

      // Create write stream
      writer = fs.createWriteStream(task.tempFilePath, {
        flags: appendMode ? 'a' : 'w'
      });

      // Track progress with throttling
      response.data.on('data', (chunk: Buffer) => {
        task.loaded += chunk.length;
        if (task.total > 0) {
          task.progress = Math.round((task.loaded / task.total) * 100);
        }

        // Throttle progress events to max 4/sec (250ms interval)
        const now = Date.now();
        const lastSent = this.progressThrottles.get(task.taskId) || 0;
        if (now - lastSent >= 250) {
          this.progressThrottles.set(task.taskId, now);
          this.sendProgress(task);
        }
      });

      // Wait for download to complete
      await new Promise<void>((resolve, reject) => {
        writer!.on('finish', () => resolve());
        writer!.on('error', (error) => reject(error));
        response.data.on('error', (error: Error) => reject(error));
        response.data.pipe(writer!);
      });

      // Send final progress
      task.progress = 100;
      this.sendProgress(task);

      // Finalize
      await this.finalizeDownload(task, sanitizedFilename, downloadPath);
    } catch (error: any) {
      if (axios.isCancel(error) || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        // Aborted by user (pause/cancel) - do not set error state
        return;
      }

      console.error(`Download error for task ${task.taskId}:`, error);
      task.state = 'error';
      task.error = error.message || 'Download failed';
      this.sendStateChange(task);

      // Track batch error
      this.handleBatchError(task);

      // Cleanup temp file on error
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
      this.abortControllers.delete(task.taskId);
      this.progressThrottles.delete(task.taskId);

      // Only decrement if we were actively downloading (not already decremented in 403/410 path)
      if (task.state !== 'queued') {
        this.activeCount--;
      }
      this.processQueue();
    }
  }

  // ─── Finalize download ─────────────────────────────────────────

  private async finalizeDownload(
    task: DownloadTask,
    sanitizedFilename: string,
    downloadPath: string
  ): Promise<void> {
    const configStore = getStore();
    const apiPort = configStore.get('set.musicApiPort') || 30488;

    // Detect file type
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

    // Build final file path with dedup
    let finalFilePath = path.join(downloadPath, `${sanitizedFilename}${fileExtension}`);
    let counter = 1;
    while (fs.existsSync(finalFilePath)) {
      const ext = path.extname(finalFilePath);
      const base = path.join(downloadPath, sanitizedFilename);
      finalFilePath = `${base} (${counter})${ext}`;
      counter++;
    }

    // Move temp to final
    fs.copyFileSync(task.tempFilePath, finalFilePath);
    fs.unlinkSync(task.tempFilePath);
    task.finalFilePath = finalFilePath;

    // Download lyrics
    let lyricsContent = '';
    let lyricData = null;
    try {
      if (task.songInfo?.id) {
        const lyricsResponse = await axios.get(
          `http://localhost:${apiPort}/lyric?id=${task.songInfo.id}`
        );
        if (lyricsResponse.data && (lyricsResponse.data.lrc || lyricsResponse.data.tlyric)) {
          lyricData = lyricsResponse.data;

          if (lyricsResponse.data.lrc && lyricsResponse.data.lrc.lyric) {
            lyricsContent = lyricsResponse.data.lrc.lyric;

            if (lyricsResponse.data.tlyric && lyricsResponse.data.tlyric.lyric) {
              const originalLyrics = parseLyrics(lyricsResponse.data.lrc.lyric);
              const translatedLyrics = parseLyrics(lyricsResponse.data.tlyric.lyric);
              lyricsContent = mergeLyrics(originalLyrics, translatedLyrics);
            }
          }
        }
      }
    } catch (lyricError) {
      console.error('Failed to download lyrics:', lyricError);
    }

    // Download cover
    let coverImageBuffer: Buffer | null = null;
    try {
      const picUrl = task.songInfo?.picUrl || task.songInfo?.al?.picUrl;
      if (picUrl && picUrl !== '/images/default_cover.png') {
        if (picUrl.startsWith('data:')) {
          const base64Match = picUrl.match(/^data:[^;]+;base64,(.+)$/);
          if (base64Match) {
            coverImageBuffer = Buffer.from(base64Match[1], 'base64');
          }
        } else {
          const coverResponse = await axios({
            url: picUrl.replace('http://', 'https://'),
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 10000
          });

          const originalCoverBuffer = Buffer.from(coverResponse.data);
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

    // Write metadata
    // songInfo may carry extra fields (song, no, publishTime) beyond DownloadSongInfo
    const info: any = task.songInfo;
    const fileFormat = fileExtension.toLowerCase();
    const artistNames =
      (info?.ar || info?.song?.artists)?.map((a: any) => a.name).join('\u3001') || '未知艺术家';

    if (['.mp3'].includes(fileFormat)) {
      try {
        NodeID3.removeTags(finalFilePath);

        const tags = {
          title: info?.name,
          artist: artistNames,
          TPE1: artistNames,
          TPE2: artistNames,
          album: info?.al?.name || info?.song?.album?.name || info?.name || task.filename,
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

    // Save .lrc file if setting enabled
    if (lyricsContent && configStore.get('set.downloadSaveLyric')) {
      try {
        const lrcFilePath = finalFilePath.replace(/\.[^.]+$/, '.lrc');
        await fs.promises.writeFile(lrcFilePath, lyricsContent, 'utf-8');
      } catch (lrcError) {
        console.error('Failed to save lyrics file:', lrcError);
      }
    }

    // Save to downloadedSongs
    const songInfos = (configStore.get('downloadedSongs') || {}) as Record<string, any>;
    const defaultInfo = {
      name: task.filename,
      ar: [{ name: '本地音乐' }],
      picUrl: '/images/default_cover.png'
    };

    const totalSize = task.total;
    const newSongInfo = {
      id: task.songInfo?.id || 0,
      name: task.songInfo?.name || task.filename,
      filename: task.filename,
      picUrl: task.songInfo?.picUrl || task.songInfo?.al?.picUrl || defaultInfo.picUrl,
      ar: task.songInfo?.ar || defaultInfo.ar,
      al: task.songInfo?.al || {
        picUrl: task.songInfo?.picUrl || defaultInfo.picUrl,
        name: task.songInfo?.name || task.filename
      },
      size: totalSize,
      path: finalFilePath,
      downloadTime: Date.now(),
      type: fileExtension.substring(1),
      lyric: lyricData
    };

    songInfos[finalFilePath] = newSongInfo;
    configStore.set('downloadedSongs', songInfos);

    // Update task state
    task.state = 'completed';
    this.sendStateChange(task);

    // Handle notifications
    if (task.batchId) {
      const batch = this.batchTracker.get(task.batchId);
      if (batch) {
        batch.finished++;
        batch.success++;

        if (batch.finished >= batch.total) {
          // All tasks in batch complete
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
      // Individual notification
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

    // Remove completed task from active tasks and persist
    this.tasks.delete(task.taskId);
    this.persistQueue();
  }

  // ─── Batch error tracking ──────────────────────────────────────

  private handleBatchError(task: DownloadTask): void {
    if (!task.batchId) return;
    const batch = this.batchTracker.get(task.batchId);
    if (!batch) return;

    batch.finished++;
    // success not incremented for errors

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

  // ─── IPC send helpers ──────────────────────────────────────────

  private sendToRenderer(channel: string, data: any): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(channel, data);
      }
    } catch {
      // Window may have been closed
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

  // ─── Persistence ───────────────────────────────────────────────

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
      (t) => t.state === 'queued' || t.state === 'paused' || t.state === 'downloading'
    );
    // Mark downloading as paused for persistence
    const serialized = tasksToSave.map((t) => ({
      ...t,
      state: (t.state === 'downloading' ? 'paused' : t.state) as DownloadTaskState
    }));
    this.persistStore.set('tasks', serialized);
  }

  private loadPersistedQueue(): void {
    try {
      const saved = this.persistStore.get('tasks', []);
      for (const task of saved) {
        // Treat any 'downloading' as 'paused' on load
        if (task.state === 'downloading') {
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
      const tempDir = path.join(os.tmpdir(), 'AlgerMusicPlayerTemp');
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
            // ignore
          }
        }
      }
    } catch {
      // Temp dir may not exist
    }
  }
}

// ─── Singleton & exports ───────────────────────────────────────────

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
