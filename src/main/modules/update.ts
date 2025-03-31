import axios from 'axios';
import { spawn } from 'child_process';
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

    // 先启动安装程序，再退出应用
    try {
      if (platform === 'win32') {
        // 使用spawn替代exec，并使用detached选项确保子进程独立运行
        const child = spawn(filePath, [], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } else if (platform === 'darwin') {
        // 挂载 DMG 文件
        const child = spawn('open', [filePath], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } else if (platform === 'linux') {
        const ext = path.extname(filePath);
        if (ext === '.AppImage') {
          // 先添加执行权限
          fs.chmodSync(filePath, '755');
          const child = spawn(filePath, [], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        } else if (ext === '.deb') {
          const child = spawn('pkexec', ['dpkg', '-i', filePath], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        }
      }

      // 给安装程序一点时间启动
      setTimeout(() => {
        app.quit();
      }, 500);
    } catch (error) {
      console.error('启动安装程序失败:', error);
      // 尽管出错，仍然尝试退出应用
      app.quit();
    }
  });
}
