import { app, dialog, shell, ipcMain } from 'electron';
import Store from 'electron-store';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

/**
 * 初始化文件管理相关的IPC监听
 */
export function initializeFileManager() {
  // 通用的选择目录处理
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择目录'
    });
    return result;
  });

  // 通用的打开目录处理
  ipcMain.on('open-directory', (_, path) => {
    shell.openPath(path);
  });

  // 下载音乐处理
  ipcMain.on('download-music', downloadMusic);
}

/**
 * 下载音乐功能
 */
async function downloadMusic(event: Electron.IpcMainEvent, { url, filename }: { url: string; filename: string }) {
  try {
    const store = new Store();
    const downloadPath = store.get('set.downloadPath') as string || app.getPath('downloads');
    
    // 直接使用配置的下载路径
    const filePath = path.join(downloadPath, `${filename}.mp3`);

    // 检查文件是否已存在，如果存在则添加序号
    let finalFilePath = filePath;
    let counter = 1;
    while (fs.existsSync(finalFilePath)) {
      const ext = path.extname(filePath);
      const nameWithoutExt = filePath.slice(0, -ext.length);
      finalFilePath = `${nameWithoutExt} (${counter})${ext}`;
      counter++;
    }

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(finalFilePath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      event.reply('music-download-complete', { success: true, path: finalFilePath });
    });

    writer.on('error', (err) => {
      event.reply('music-download-complete', { success: false, error: err.message });
    });
  } catch (error: any) {
    event.reply('music-download-complete', { success: false, error: error.message });
  }
} 