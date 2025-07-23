import { ipcMain } from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import server from 'netease-cloud-music-api-alger/server';
import os from 'os';
import path from 'path';

import { type Platform, unblockMusic } from './unblockMusic';

const store = new Store();
if (!fs.existsSync(path.resolve(os.tmpdir(), 'anonymous_token'))) {
  fs.writeFileSync(path.resolve(os.tmpdir(), 'anonymous_token'), '', 'utf-8');
}

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

async function startMusicApi(): Promise<void> {
  console.log('MUSIC API STARTED');

  const port = (store.get('set') as any).musicApiPort || 30488;

  await server.serveNcmApi({
    port
  });
}

export { startMusicApi };
