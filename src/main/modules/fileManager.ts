import axios from 'axios';
import { app, dialog, ipcMain, protocol, shell } from 'electron';
import Store from 'electron-store';
import * as fs from 'fs';
import * as path from 'path';

const MAX_CONCURRENT_DOWNLOADS = 3;
const downloadQueue: { url: string; filename: string; songInfo: any; type?: string }[] = [];
let activeDownloads = 0;

// 创建一个store实例用于存储下载历史
const downloadStore = new Store({
  name: 'downloads',
  defaults: {
    history: []
  }
});

// 创建一个store实例用于存储音频缓存
const audioCacheStore = new Store({
  name: 'audioCache',
  defaults: {
    cache: {}
  }
});

/**
 * 初始化文件管理相关的IPC监听
 */
export function initializeFileManager() {
  // 注册本地文件协议
  protocol.registerFileProtocol('local', (request, callback) => {
    try {
      const decodedUrl = decodeURIComponent(request.url);
      const filePath = decodedUrl.replace('local://', '');

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
        return;
      }

      callback({ path: filePath });
    } catch (error) {
      console.error('Error handling local protocol:', error);
      callback({ error: -2 }); // net::FAILED
    }
  });

  // 通用的选择目录处理
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择目录'
    });
    return result;
  });

  // 通用的打开目录处理
  ipcMain.on('open-directory', (_, filePath) => {
    try {
      // 验证文件路径
      if (!filePath) {
        console.error('无效的文件路径: 路径为空');
        return;
      }

      // 统一处理路径分隔符
      const normalizedPath = path.normalize(filePath);

      if (fs.statSync(normalizedPath).isDirectory()) {
        shell.openPath(normalizedPath);
      } else {
        shell.showItemInFolder(normalizedPath);
      }
    } catch (error) {
      console.error('打开路径失败:', error);
    }
  });

  // 下载音乐处理
  ipcMain.on('download-music', handleDownloadRequest);

  // 检查文件是否已下载
  ipcMain.handle('check-music-downloaded', (_, filename: string) => {
    const store = new Store();
    const downloadPath = (store.get('set.downloadPath') as string) || app.getPath('downloads');
    const filePath = path.join(downloadPath, `${filename}.mp3`);
    return fs.existsSync(filePath);
  });

  // 删除已下载的音乐
  ipcMain.handle('delete-downloaded-music', async (_, filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        // 先删除文件
        try {
          await fs.promises.unlink(filePath);
        } catch (error) {
          console.error('Error deleting file:', error);
        }

        // 删除对应的歌曲信息
        const store = new Store();
        const songInfos = store.get('downloadedSongs', {}) as Record<string, any>;
        delete songInfos[filePath];
        store.set('downloadedSongs', songInfos);

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  });

  // 获取已下载音乐列表
  ipcMain.handle('get-downloaded-music', () => {
    try {
      const store = new Store();
      const songInfos = store.get('downloadedSongs', {}) as Record<string, any>;

      // 过滤出实际存在的文件
      const validSongs = Object.entries(songInfos)
        .filter(([path]) => fs.existsSync(path))
        .map(([_, info]) => info)
        .sort((a, b) => (b.downloadTime || 0) - (a.downloadTime || 0));

      // 更新存储，移除不存在的文件记录
      const newSongInfos = validSongs.reduce((acc, song) => {
        acc[song.path] = song;
        return acc;
      }, {});
      store.set('downloadedSongs', newSongInfos);

      return validSongs;
    } catch (error) {
      console.error('Error getting downloaded music:', error);
      return [];
    }
  });

  // 检查歌曲是否已下载并返回本地路径
  ipcMain.handle('check-song-downloaded', (_, songId: number) => {
    const store = new Store();
    const songInfos = store.get('downloadedSongs', {}) as Record<string, any>;

    // 通过ID查找已下载的歌曲
    for (const [path, info] of Object.entries(songInfos)) {
      if (info.id === songId && fs.existsSync(path)) {
        return {
          isDownloaded: true,
          localPath: `local://${path}`,
          songInfo: info
        };
      }
    }

    return {
      isDownloaded: false,
      localPath: '',
      songInfo: null
    };
  });

  // 添加清除下载历史的处理函数
  ipcMain.on('clear-downloads-history', () => {
    downloadStore.set('history', []);
  });

  // 添加清除音频缓存的处理函数
  ipcMain.on('clear-audio-cache', () => {
    audioCacheStore.set('cache', {});
    // 清除临时音频文件目录
    const tempDir = path.join(app.getPath('userData'), 'AudioCache');
    if (fs.existsSync(tempDir)) {
      try {
        fs.readdirSync(tempDir).forEach((file) => {
          const filePath = path.join(tempDir, file);
          if (file.endsWith('.mp3') || file.endsWith('.m4a')) {
            fs.unlinkSync(filePath);
          }
        });
      } catch (error) {
        console.error('清除音频缓存文件失败:', error);
      }
    }
  });
}

/**
 * 处理下载请求
 */
function handleDownloadRequest(
  event: Electron.IpcMainEvent,
  {
    url,
    filename,
    songInfo,
    type
  }: { url: string; filename: string; songInfo?: any; type?: string }
) {
  // 检查是否已经在队列中或正在下载
  if (downloadQueue.some((item) => item.filename === filename)) {
    event.reply('music-download-error', {
      filename,
      error: '该歌曲已在下载队列中'
    });
    return;
  }

  // 检查是否已下载
  const store = new Store();
  const songInfos = store.get('downloadedSongs', {}) as Record<string, any>;

  // 检查是否已下载（通过ID）
  const isDownloaded =
    songInfo?.id && Object.values(songInfos).some((info: any) => info.id === songInfo.id);

  if (isDownloaded) {
    event.reply('music-download-error', {
      filename,
      error: '该歌曲已下载'
    });
    return;
  }

  // 添加到下载队列
  downloadQueue.push({ url, filename, songInfo, type });
  event.reply('music-download-queued', {
    filename,
    songInfo
  });

  // 尝试开始下载
  processDownloadQueue(event);
}

/**
 * 处理下载队列
 */
async function processDownloadQueue(event: Electron.IpcMainEvent) {
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS || downloadQueue.length === 0) {
    return;
  }

  const { url, filename, songInfo, type } = downloadQueue.shift()!;
  activeDownloads++;

  try {
    await downloadMusic(event, { url, filename, songInfo, type });
  } finally {
    activeDownloads--;
    processDownloadQueue(event);
  }
}

/**
 * 清理文件名中的非法字符
 */
function sanitizeFilename(filename: string): string {
  // 替换 Windows 和 Unix 系统中的非法字符
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // 替换特殊字符为下划线
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .trim(); // 移除首尾空格
}

/**
 * 下载音乐功能
 */
async function downloadMusic(
  event: Electron.IpcMainEvent,
  {
    url,
    filename,
    songInfo,
    type = 'mp3'
  }: { url: string; filename: string; songInfo: any; type?: string }
) {
  let finalFilePath = '';
  let writer: fs.WriteStream | null = null;

  try {
    const store = new Store();
    const downloadPath = (store.get('set.downloadPath') as string) || app.getPath('downloads');

    // 清理文件名中的非法字符
    const sanitizedFilename = sanitizeFilename(filename);

    // 从URL中获取文件扩展名，如果没有则使用传入的type或默认mp3
    const urlExt = type ? `.${type}` : '.mp3';
    const filePath = path.join(downloadPath, `${sanitizedFilename}${urlExt}`);

    // 检查文件是否已存在，如果存在则添加序号
    finalFilePath = filePath;
    let counter = 1;
    while (fs.existsSync(finalFilePath)) {
      const ext = path.extname(filePath);
      const nameWithoutExt = filePath.slice(0, -ext.length);
      finalFilePath = `${nameWithoutExt} (${counter})${ext}`;
      counter++;
    }

    // 先获取文件大小
    const headResponse = await axios.head(url);
    const totalSize = parseInt(headResponse.headers['content-length'] || '0', 10);

    // 开始下载
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000 // 30秒超时
    });

    writer = fs.createWriteStream(finalFilePath);
    let downloadedSize = 0;

    // 使用 data 事件来跟踪下载进度
    response.data.on('data', (chunk: Buffer) => {
      downloadedSize += chunk.length;
      const progress = Math.round((downloadedSize / totalSize) * 100);
      event.reply('music-download-progress', {
        filename,
        progress,
        loaded: downloadedSize,
        total: totalSize,
        path: finalFilePath,
        status: progress === 100 ? 'completed' : 'downloading',
        songInfo: songInfo || {
          name: filename,
          ar: [{ name: '本地音乐' }],
          picUrl: '/images/default_cover.png'
        }
      });
    });

    // 等待下载完成
    await new Promise((resolve, reject) => {
      writer!.on('finish', () => resolve(undefined));
      writer!.on('error', (error) => reject(error));
      response.data.pipe(writer!);
    });

    // 验证文件是否完整下载
    const stats = fs.statSync(finalFilePath);
    if (stats.size !== totalSize) {
      throw new Error('文件下载不完整');
    }

    // 保存下载信息
    try {
      const songInfos = store.get('downloadedSongs', {}) as Record<string, any>;
      const defaultInfo = {
        name: filename,
        ar: [{ name: '本地音乐' }],
        picUrl: '/images/default_cover.png'
      };

      const newSongInfo = {
        id: songInfo?.id || 0,
        name: songInfo?.name || filename,
        filename,
        picUrl: songInfo?.picUrl || defaultInfo.picUrl,
        ar: songInfo?.ar || defaultInfo.ar,
        size: totalSize,
        path: finalFilePath,
        downloadTime: Date.now(),
        al: songInfo?.al || { picUrl: songInfo?.picUrl || defaultInfo.picUrl },
        type: type || 'mp3'
      };

      // 保存到下载记录
      songInfos[finalFilePath] = newSongInfo;
      store.set('downloadedSongs', songInfos);

      // 添加到下载历史
      const history = downloadStore.get('history', []) as any[];
      history.unshift(newSongInfo);
      downloadStore.set('history', history);

      // 发送下载完成事件
      event.reply('music-download-complete', {
        success: true,
        path: finalFilePath,
        filename,
        size: totalSize,
        songInfo: newSongInfo
      });
    } catch (error) {
      console.error('Error saving download info:', error);
      throw new Error('保存下载信息失败');
    }
  } catch (error: any) {
    console.error('Download error:', error);

    // 清理未完成的下载
    if (writer) {
      writer.end();
    }
    if (finalFilePath && fs.existsSync(finalFilePath)) {
      try {
        fs.unlinkSync(finalFilePath);
      } catch (e) {
        console.error('Failed to delete incomplete download:', e);
      }
    }

    event.reply('music-download-complete', {
      success: false,
      error: error.message || '下载失败',
      filename
    });
  }
}
