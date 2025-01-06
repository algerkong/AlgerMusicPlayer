import { ipcMain } from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { unblockMusic } from './unblockMusic';

const store = new Store();
if (!fs.existsSync(path.resolve(os.tmpdir(), 'anonymous_token'))) {
  fs.writeFileSync(path.resolve(os.tmpdir(), 'anonymous_token'), '', 'utf-8');
}

// 处理解锁音乐请求
ipcMain.handle('unblock-music', async (_, id, data) => {
  return unblockMusic(id, data);
});

import server from 'netease-cloud-music-api-alger/server';


async function startMusicApi(): Promise<void> {
  console.log('MUSIC API STARTED');

  const port = (store.get('set') as any).musicApiPort || 30488;

  await server.serveNcmApi({
    port
  });
}

export { startMusicApi };
