import axios from 'axios';
import { app, dialog, ipcMain, Notification, protocol, shell } from 'electron';
import Store from 'electron-store';
import { fileTypeFromFile } from 'file-type';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as mm from 'music-metadata';
import * as NodeID3 from 'node-id3';
import * as os from 'os';
import * as path from 'path';

import { getStore } from './config';

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

// 保存已发送通知的文件，避免重复通知
const sentNotifications = new Map();

/**
 * 初始化文件管理相关的IPC监听
 */
export function initializeFileManager() {
  // 注册本地文件协议
  protocol.registerFileProtocol('local', (request, callback) => {
    try {
      const url = request.url;
      // local://C:/Users/xxx.mp3
      let filePath = decodeURIComponent(url.replace('local:///', ''));

      // 兼容 local:///C:/Users/xxx.mp3 这种情况
      if (/^\/[a-zA-Z]:\//.test(filePath)) {
        filePath = filePath.slice(1);
      }

      // 还原为系统路径格式
      filePath = path.normalize(filePath);

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

  // 检查文件是否存在
  ipcMain.handle('check-file-exists', (_, filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  });

  // 获取支持的音频格式列表
  ipcMain.handle('get-supported-audio-formats', () => {
    return {
      formats: [
        { ext: 'mp3', name: 'MP3' },
        { ext: 'm4a', name: 'M4A/AAC' },
        { ext: 'flac', name: 'FLAC' },
        { ext: 'wav', name: 'WAV' },
        { ext: 'ogg', name: 'OGG Vorbis' },
        { ext: 'aac', name: 'AAC' }
      ],
      default: 'mp3'
    };
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

  // 获取默认下载路径
  ipcMain.handle('get-downloads-path', () => {
    return app.getPath('downloads');
  });

  // 获取存储的配置值
  ipcMain.handle('get-store-value', (_, key) => {
    const store = new Store();
    return store.get(key);
  });

  // 设置存储的配置值
  ipcMain.on('set-store-value', (_, key, value) => {
    const store = new Store();
    store.set(key, value);
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
  ipcMain.handle('get-downloaded-music', async () => {
    try {
      const store = new Store();
      const songInfos = store.get('downloadedSongs', {}) as Record<string, any>;

      // 异步处理文件存在性检查
      const entriesArray = Object.entries(songInfos);
      const validEntriesPromises = await Promise.all(
        entriesArray.map(async ([path, info]) => {
          try {
            const exists = await fs.promises
              .access(path)
              .then(() => true)
              .catch(() => false);
            return exists ? info : null;
          } catch (error) {
            console.error('Error checking file existence:', error);
            return null;
          }
        })
      );

      // 过滤有效的歌曲并排序
      const validSongs = validEntriesPromises
        .filter((song) => song !== null)
        .sort((a, b) => (b.downloadTime || 0) - (a.downloadTime || 0));

      // 更新存储，移除不存在的文件记录
      const newSongInfos = validSongs.reduce((acc, song) => {
        if (song && song.path) {
          acc[song.path] = song;
        }
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

  // 添加清除已下载音乐记录的处理函数
  ipcMain.handle('clear-downloaded-music', () => {
    const store = new Store();
    store.set('downloadedSongs', {});
    return true;
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
 * 下载音乐和歌词
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
  let tempFilePath = '';

  try {
    // 使用配置Store来获取设置
    const configStore = getStore();
    const downloadPath =
      (configStore.get('set.downloadPath') as string) || app.getPath('downloads');
    const apiPort = configStore.get('set.musicApiPort') || 30488;

    // 获取文件名格式设置
    const nameFormat =
      (configStore.get('set.downloadNameFormat') as string) || '{songName} - {artistName}';

    // 根据格式创建文件名
    let formattedFilename = filename;
    if (songInfo) {
      // 准备替换变量
      const artistName = songInfo.ar?.map((a: any) => a.name).join('/') || '未知艺术家';
      const songName = songInfo.name || filename;
      const albumName = songInfo.al?.name || '未知专辑';

      // 应用自定义格式
      formattedFilename = nameFormat
        .replace(/\{songName\}/g, songName)
        .replace(/\{artistName\}/g, artistName)
        .replace(/\{albumName\}/g, albumName);
    }

    // 清理文件名中的非法字符
    const sanitizedFilename = sanitizeFilename(formattedFilename);

    // 创建临时文件路径 (在系统临时目录中创建)
    const tempDir = path.join(os.tmpdir(), 'AlgerMusicPlayerTemp');

    // 确保临时目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempFilePath = path.join(tempDir, `${Date.now()}_${sanitizedFilename}.tmp`);

    // 先获取文件大小
    const headResponse = await axios.head(url);
    const totalSize = parseInt(headResponse.headers['content-length'] || '0', 10);

    // 开始下载到临时文件
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000, // 30秒超时
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    });

    writer = fs.createWriteStream(tempFilePath);
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
        path: tempFilePath,
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
    const stats = fs.statSync(tempFilePath);
    if (stats.size !== totalSize) {
      throw new Error('文件下载不完整');
    }

    // 检测文件类型
    let fileExtension = '';

    try {
      // 首先尝试使用file-type库检测
      const fileType = await fileTypeFromFile(tempFilePath);
      if (fileType && fileType.ext) {
        fileExtension = `.${fileType.ext}`;
        console.log(`文件类型检测结果: ${fileType.mime}, 扩展名: ${fileExtension}`);
      } else {
        // 如果file-type无法识别，尝试使用music-metadata
        const metadata = await mm.parseFile(tempFilePath);
        if (metadata && metadata.format) {
          // 根据format.container或codec判断扩展名
          const formatInfo = metadata.format;
          const container = formatInfo.container || '';
          const codec = formatInfo.codec || '';

          // 音频格式映射表
          const formatMap = {
            mp3: ['MPEG', 'MP3', 'mp3'],
            aac: ['AAC'],
            flac: ['FLAC'],
            ogg: ['Ogg', 'Vorbis'],
            wav: ['WAV', 'PCM'],
            m4a: ['M4A', 'MP4']
          };

          // 查找匹配的格式
          const format = Object.entries(formatMap).find(([_, keywords]) =>
            keywords.some((keyword) => container.includes(keyword) || codec.includes(keyword))
          );

          // 设置文件扩展名，如果没找到则默认为mp3
          fileExtension = format ? `.${format[0]}` : '.mp3';

          console.log(
            `music-metadata检测结果: 容器:${container}, 编码:${codec}, 扩展名: ${fileExtension}`
          );
        } else {
          // 两种方法都失败，使用传入的type或默认mp3
          fileExtension = type ? `.${type}` : '.mp3';
          console.log(`无法检测文件类型，使用默认扩展名: ${fileExtension}`);
        }
      }
    } catch (err) {
      console.error('检测文件类型失败:', err);
      // 检测失败，使用传入的type或默认mp3
      fileExtension = type ? `.${type}` : '.mp3';
    }

    // 使用检测到的文件扩展名创建最终文件路径
    const filePath = path.join(downloadPath, `${sanitizedFilename}${fileExtension}`);

    // 检查文件是否已存在，如果存在则添加序号
    finalFilePath = filePath;
    let counter = 1;
    while (fs.existsSync(finalFilePath)) {
      const ext = path.extname(filePath);
      const nameWithoutExt = filePath.slice(0, -ext.length);
      finalFilePath = `${nameWithoutExt} (${counter})${ext}`;
      counter++;
    }

    // 将临时文件移动到最终位置
    fs.copyFileSync(tempFilePath, finalFilePath);
    fs.unlinkSync(tempFilePath); // 删除临时文件

    // 下载歌词
    let lyricData = null;
    let lyricsContent = '';
    try {
      if (songInfo?.id) {
        // 下载歌词，使用配置的端口
        const lyricsResponse = await axios.get(
          `http://localhost:${apiPort}/lyric?id=${songInfo.id}`
        );
        if (lyricsResponse.data && (lyricsResponse.data.lrc || lyricsResponse.data.tlyric)) {
          lyricData = lyricsResponse.data;

          // 处理歌词内容
          if (lyricsResponse.data.lrc && lyricsResponse.data.lrc.lyric) {
            lyricsContent = lyricsResponse.data.lrc.lyric;

            // 如果有翻译歌词，合并到主歌词中
            if (lyricsResponse.data.tlyric && lyricsResponse.data.tlyric.lyric) {
              // 解析原歌词和翻译
              const originalLyrics = parseLyrics(lyricsResponse.data.lrc.lyric);
              const translatedLyrics = parseLyrics(lyricsResponse.data.tlyric.lyric);

              // 合并歌词
              const mergedLyrics = mergeLyrics(originalLyrics, translatedLyrics);
              lyricsContent = mergedLyrics;
            }
          }

          console.log('歌词已准备好，将写入元数据');
        }
      }
    } catch (lyricError) {
      console.error('下载歌词失败:', lyricError);
      // 继续处理，不影响音乐下载
    }

    // 下载封面
    let coverImageBuffer: Buffer | null = null;
    try {
      if (songInfo?.picUrl || songInfo?.al?.picUrl) {
        const picUrl = songInfo.picUrl || songInfo.al?.picUrl;
        if (picUrl && picUrl !== '/images/default_cover.png') {
          const coverResponse = await axios({
            url: picUrl.replace('http://', 'https://'),
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 10000
          });

          // 获取封面图片的buffer
          coverImageBuffer = Buffer.from(coverResponse.data);
          console.log('封面已准备好，将写入元数据');
        }
      }
    } catch (coverError) {
      console.error('下载封面失败:', coverError);
      // 继续处理，不影响音乐下载
    }

    const fileFormat = fileExtension.toLowerCase();
    const artistNames =
      (songInfo?.ar || songInfo?.song?.artists)?.map((a: any) => a.name).join('/ ') || '未知艺术家';

    // 根据文件类型处理元数据
    if (['.mp3'].includes(fileFormat)) {
      // 对MP3文件使用NodeID3处理ID3标签
      try {
        // 在写入ID3标签前，先移除可能存在的旧标签
        NodeID3.removeTags(finalFilePath);

        const tags = {
          title: filename,
          artist: artistNames,
          TPE1: artistNames,
          TPE2: artistNames,
          album: songInfo?.al?.name || songInfo?.song?.album?.name || songInfo?.name || filename,
          APIC: {
            // 专辑封面
            imageBuffer: coverImageBuffer,
            type: {
              id: 3,
              name: 'front cover'
            },
            description: 'Album cover',
            mime: 'image/jpeg'
          },
          USLT: {
            // 歌词
            language: 'chi',
            description: 'Lyrics',
            text: lyricsContent || ''
          },
          trackNumber: songInfo?.no || undefined,
          year: songInfo?.publishTime
            ? new Date(songInfo.publishTime).getFullYear().toString()
            : undefined
        };

        const success = NodeID3.write(tags, finalFilePath);
        if (!success) {
          console.error('Failed to write ID3 tags');
        } else {
          console.log('ID3 tags written successfully');
        }
      } catch (err) {
        console.error('Error writing ID3 tags:', err);
      }
    } else {
      // 对于非MP3文件，使用music-metadata来写入元数据可能需要专门的库
      // 或者根据不同文件类型使用专用工具，暂时只记录但不处理
      console.log(`文件类型 ${fileFormat} 不支持使用NodeID3写入标签，跳过元数据写入`);
    }

    // 保存下载信息
    try {
      const songInfos = configStore.get('downloadedSongs', {}) as Record<string, any>;
      const defaultInfo = {
        name: filename,
        ar: [{ name: '本地音乐' }],
        picUrl: '/images/default_cover.png'
      };

      const newSongInfo = {
        id: songInfo?.id || 0,
        name: songInfo?.name || filename,
        filename,
        picUrl: songInfo?.picUrl || songInfo?.al?.picUrl || defaultInfo.picUrl,
        ar: songInfo?.ar || defaultInfo.ar,
        al: songInfo?.al || {
          picUrl: songInfo?.picUrl || defaultInfo.picUrl,
          name: songInfo?.name || filename
        },
        size: totalSize,
        path: finalFilePath,
        downloadTime: Date.now(),
        type: fileExtension.substring(1), // 去掉前面的点号，只保留扩展名
        lyric: lyricData
      };

      // 保存到下载记录
      songInfos[finalFilePath] = newSongInfo;
      configStore.set('downloadedSongs', songInfos);

      // 添加到下载历史
      const history = downloadStore.get('history', []) as any[];
      history.unshift(newSongInfo);
      downloadStore.set('history', history);

      // 避免重复发送通知
      const notificationId = `download-${finalFilePath}`;
      if (!sentNotifications.has(notificationId)) {
        sentNotifications.set(notificationId, true);

        // 发送桌面通知
        try {
          const artistNames =
            (songInfo?.ar || songInfo?.song?.artists)?.map((a: any) => a.name).join('/') ||
            '未知艺术家';
          const notification = new Notification({
            title: '下载完成',
            body: `${songInfo?.name || filename} - ${artistNames}`,
            silent: false
          });

          notification.on('click', () => {
            shell.showItemInFolder(finalFilePath);
          });

          notification.show();

          // 60秒后清理通知记录，释放内存
          setTimeout(() => {
            sentNotifications.delete(notificationId);
          }, 60000);
        } catch (notifyError) {
          console.error('发送通知失败:', notifyError);
        }
      }

      // 发送下载完成事件，确保只发送一次
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

    // 清理临时文件
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.error('Failed to delete temporary file:', e);
      }
    }

    // 清理未完成的最终文件
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

// 辅助函数 - 解析歌词文本成时间戳和内容的映射
function parseLyrics(lyricsText: string): Map<string, string> {
  const lyricMap = new Map<string, string>();
  const lines = lyricsText.split('\n');

  for (const line of lines) {
    // 匹配时间标签，形如 [00:00.000]
    const timeTagMatches = line.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g);
    if (!timeTagMatches) continue;

    // 提取歌词内容（去除时间标签）
    const content = line.replace(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g, '').trim();
    if (!content) continue;

    // 将每个时间标签与歌词内容关联
    for (const timeTag of timeTagMatches) {
      lyricMap.set(timeTag, content);
    }
  }

  return lyricMap;
}

// 辅助函数 - 合并原文歌词和翻译歌词
function mergeLyrics(
  originalLyrics: Map<string, string>,
  translatedLyrics: Map<string, string>
): string {
  const mergedLines: string[] = [];

  // 对每个时间戳，组合原始歌词和翻译
  for (const [timeTag, originalContent] of originalLyrics.entries()) {
    const translatedContent = translatedLyrics.get(timeTag);

    // 添加原始歌词行
    mergedLines.push(`${timeTag}${originalContent}`);

    // 如果有翻译，添加翻译行（时间戳相同，这样可以和原歌词同步显示）
    if (translatedContent) {
      mergedLines.push(`${timeTag}${translatedContent}`);
    }
  }

  // 按时间顺序排序
  mergedLines.sort((a, b) => {
    const timeA = a.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    const timeB = b.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || '';
    return timeA.localeCompare(timeB);
  });

  return mergedLines.join('\n');
}
