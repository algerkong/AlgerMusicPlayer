import { app, dialog, ipcMain, protocol, shell } from 'electron';
import Store from 'electron-store';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import { getStore } from './config';
import { parseLocalProtocolUrl, resolveSafePath } from './pathGuard';

// 创建一个store实例用于存储音频缓存
const audioCacheStore = new Store({
  name: 'audioCache',
  defaults: {
    cache: {}
  }
});

/**
 * 清理文件名中的非法字符
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

// Electron net.fetch(file://) 在当前版本不会回 206，audio seek 需要主进程自己处理 Range
function buildLocalFileResponse(
  filePath: string,
  total: number,
  rangeHeader: string | null
): Response {
  const range416 = () =>
    new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });

  let start = 0;
  let end = total - 1;
  let partial = false;

  if (rangeHeader) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!m || (!m[1] && !m[2])) return range416();
    if (m[1]) {
      start = parseInt(m[1], 10);
      if (m[2]) end = Math.min(parseInt(m[2], 10), end);
    } else {
      start = Math.max(0, total - parseInt(m[2], 10));
    }
    if (start > end || start >= total) return range416();
    partial = true;
  }

  return new Response(
    Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream,
    {
      status: partial ? 206 : 200,
      headers: {
        'Content-Length': String(end - start + 1),
        'Accept-Ranges': 'bytes',
        ...(partial && { 'Content-Range': `bytes ${start}-${end}/${total}` })
      }
    }
  );
}

export function initializeFileManager() {
  // 注册本地文件协议
  // Electron 25+ 起 registerFileProtocol 已弃用，改用 protocol.handle，并配合 main/index.ts
  // 中的 registerSchemesAsPrivileged，让 audio 元素能从 http(s) 页面跨协议加载本地文件
  protocol.handle('local', async (request) => {
    try {
      // local:///<absolute-path> — 必须落在允许根内，禁止任意本机读
      const rawPath = parseLocalProtocolUrl(request.url);
      if (!rawPath) {
        return new Response(null, { status: 400 });
      }

      const filePath = resolveSafePath(rawPath);
      if (!filePath) {
        console.warn('[local protocol] path outside allowed roots:', rawPath);
        return new Response(null, { status: 403 });
      }

      const stat = await fs.promises.stat(filePath).catch(() => null);
      if (!stat?.isFile()) {
        console.error('File not found:', filePath);
        return new Response(null, { status: 404 });
      }

      return buildLocalFileResponse(filePath, stat.size, request.headers.get('range'));
    } catch (error) {
      console.error('Error handling local protocol:', error);
      return new Response(null, { status: 500 });
    }
  });

  // 检查文件是否存在（仅允许根内）
  ipcMain.handle('check-file-exists', (_, filePath) => {
    try {
      const safe = resolveSafePath(filePath);
      if (!safe) return false;
      return fs.existsSync(safe);
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  });

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

  // 通用的打开目录处理（仅允许根内）
  ipcMain.on('open-directory', (_, filePath) => {
    try {
      if (!filePath) {
        console.error('无效的文件路径: 路径为空');
        return;
      }

      const safePath = resolveSafePath(filePath);
      if (!safePath) {
        console.warn('[open-directory] path outside allowed roots:', filePath);
        return;
      }

      if (fs.statSync(safePath).isDirectory()) {
        shell.openPath(safePath);
      } else {
        shell.showItemInFolder(safePath);
      }
    } catch (error) {
      console.error('打开路径失败:', error);
    }
  });

  ipcMain.handle('get-downloads-path', () => {
    return app.getPath('downloads');
  });

  // 保存歌词文件（仅写入下载目录内）
  ipcMain.handle(
    'save-lyric-file',
    async (_, { filename, lrcContent }: { filename: string; lrcContent: string }) => {
      try {
        const configStore = getStore();
        const downloadPath =
          (configStore.get('set.downloadPath') as string) || app.getPath('downloads');
        const sanitizedName = sanitizeFilename(filename);
        let filePath = path.join(downloadPath, `${sanitizedName}.lrc`);

        // 文件已存在时添加序号
        let counter = 1;
        while (fs.existsSync(filePath)) {
          filePath = path.join(downloadPath, `${sanitizedName} (${counter}).lrc`);
          counter++;
        }

        const safePath = resolveSafePath(filePath);
        if (!safePath) {
          return { success: false, error: '路径不在允许的下载目录内' };
        }

        await fs.promises.writeFile(safePath, lrcContent, 'utf-8');
        return { success: true, path: safePath };
      } catch (error: any) {
        console.error('保存歌词文件失败:', error);
        return { success: false, error: error.message };
      }
    }
  );

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
