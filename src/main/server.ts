import { ipcMain } from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { type Platform, unblockMusic } from './unblockMusic';

// 必须在 import netease-cloud-music-api-alger 之前创建 anonymous_token 文件
// 否则模块加载时 readFileSync 会因文件不存在而崩溃
if (!fs.existsSync(path.resolve(os.tmpdir(), 'anonymous_token'))) {
  fs.writeFileSync(path.resolve(os.tmpdir(), 'anonymous_token'), '', 'utf-8');
}

const store = new Store();

// 设置音乐解析的处理程序
ipcMain.handle('unblock-music', async (_event, id, songData, enabledSources) => {
  try {
    const result = await unblockMusic(id, songData, 1, enabledSources as Platform[]);
    return result;
  } catch (error) {
    console.error('音乐解析失败:', error);
    return { error: (error as Error).message || '未知错误' };
  }
});

/**
 * 检查端口是否可用
 */
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net
      .createServer()
      .once('error', () => {
        resolve(false);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port);
  });
}

async function startMusicApi(): Promise<void> {
  console.log('MUSIC API STARTING...');

  const settings = store.get('set') as any;
  let port = settings?.musicApiPort || 30488;
  const maxRetries = 10;

  // 检查端口是否可用，如果不可用则尝试下一个端口
  for (let i = 0; i < maxRetries; i++) {
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      break;
    }
    console.log(`端口 ${port} 被占用，尝试切换到端口 ${port + 1}`);
    port++;
  }

  // 如果端口发生变化，保存新端口到配置
  const originalPort = settings?.musicApiPort || 30488;
  if (port !== originalPort) {
    console.log(`端口从 ${originalPort} 切换到 ${port}`);
    store.set('set', { ...settings, musicApiPort: port });
  }

  try {
    const server = require('netease-cloud-music-api-alger/server');
    await server.serveNcmApi({
      port,
      // 安全默认值：仅监听本机回环地址，避免对局域网暴露
      host: '127.0.0.1'
    });
    console.log(`MUSIC API STARTED on port ${port}`);
  } catch (error) {
    console.error(`MUSIC API 启动失败:`, error);
    throw error;
  }
}

export { startMusicApi };
