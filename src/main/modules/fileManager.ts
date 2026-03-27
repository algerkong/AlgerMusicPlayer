import { app, dialog, ipcMain, protocol, shell } from 'electron';
import Store from 'electron-store';
import * as fs from 'fs';
import * as path from 'path';

import { getStore } from './config';

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

  // 保存歌词文件
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

        await fs.promises.writeFile(filePath, lrcContent, 'utf-8');
        return { success: true, path: filePath };
      } catch (error: any) {
        console.error('保存歌词文件失败:', error);
        return { success: false, error: error.message };
      }
    }
  );

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

  // 处理导入自定义API插件的请求
  ipcMain.handle('import-custom-api-plugin', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择自定义音源配置文件',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // 基础验证，确保它是个合法的JSON并且包含关键字段
      const pluginData = JSON.parse(fileContent);
      if (!pluginData.name || !pluginData.apiUrl) {
        throw new Error('无效的插件文件，缺少 name 或 apiUrl 字段。');
      }

      return {
        name: pluginData.name,
        content: fileContent // 返回完整的JSON字符串
      };
    } catch (error: any) {
      console.error('读取或解析插件文件失败:', error);
      // 向渲染进程抛出错误，以便UI可以显示提示
      throw new Error(`文件读取或解析失败: ${error.message}`);
    }
  });

  // 处理导入落雪音源脚本的请求
  ipcMain.handle('import-lx-music-script', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择落雪音源脚本文件',
      filters: [{ name: 'JavaScript Files', extensions: ['js'] }],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // 验证脚本格式：检查是否包含落雪音源特征
      if (
        !fileContent.includes('globalThis.lx') &&
        !fileContent.includes('lx.on') &&
        !fileContent.includes('EVENT_NAMES')
      ) {
        throw new Error('无效的落雪音源脚本，未找到 globalThis.lx 相关代码。');
      }

      // 检查是否包含必要的元信息注释
      const hasMetaComment = fileContent.includes('@name');
      if (!hasMetaComment) {
        console.warn('警告: 脚本缺少 @name 元信息注释');
      }

      return {
        name: path.basename(filePath, '.js'),
        content: fileContent
      };
    } catch (error: any) {
      console.error('读取落雪音源脚本失败:', error);
      throw new Error(`脚本读取失败: ${error.message}`);
    }
  });
}
