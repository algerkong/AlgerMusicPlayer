import axios from 'axios';
import { exec } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export function setupUpdateHandlers(_mainWindow: BrowserWindow) {
  ipcMain.on('start-download', async (event, url: string) => {
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        onDownloadProgress: (progressEvent: { loaded: number; total?: number }) => {
          if (!progressEvent.total) return;
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          const downloaded = (progressEvent.loaded / 1024 / 1024).toFixed(2);
          const total = (progressEvent.total / 1024 / 1024).toFixed(2);
          event.sender.send('download-progress', percent, `已下载 ${downloaded}MB / ${total}MB`);
        }
      });

      const fileName = url.split('/').pop() || 'update.exe';
      const downloadPath = path.join(app.getPath('downloads'), fileName);

      // 创建写入流
      const writer = fs.createWriteStream(downloadPath);

      // 将响应流写入文件
      response.data.pipe(writer);

      // 处理写入完成
      writer.on('finish', () => {
        event.sender.send('download-complete', true, downloadPath);
      });

      // 处理写入错误
      writer.on('error', (error) => {
        console.error('Write file error:', error);
        event.sender.send('download-complete', false, '');
      });
    } catch (error) {
      console.error('Download failed:', error);
      event.sender.send('download-complete', false, '');
    }
  });

  ipcMain.on('install-update', (_event, filePath: string) => {
    if (!fs.existsSync(filePath)) {
      console.error('Installation file not found:', filePath);
      return;
    }

    const { platform } = process;

    // 关闭当前应用
    app.quit();

    // 根据不同平台执行安装
    if (platform === 'win32') {
      exec(`"${filePath}"`, (error) => {
        if (error) {
          console.error('Error starting installer:', error);
        }
      });
    } else if (platform === 'darwin') {
      // 挂载 DMG 文件
      exec(`open "${filePath}"`, (error) => {
        if (error) {
          console.error('Error opening DMG:', error);
        }
      });
    } else if (platform === 'linux') {
      const ext = path.extname(filePath);
      if (ext === '.AppImage') {
        exec(`chmod +x "${filePath}" && "${filePath}"`, (error) => {
          if (error) {
            console.error('Error running AppImage:', error);
          }
        });
      } else if (ext === '.deb') {
        exec(`pkexec dpkg -i "${filePath}"`, (error) => {
          if (error) {
            console.error('Error installing deb package:', error);
          }
        });
      }
    }
  });
}
