import axios from 'axios';
import { app } from 'electron';
import Store from 'electron-store';

import { getDeviceId, getSystemInfo } from './deviceInfo';

const store = new Store();

// 统计服务配置
const STATS_API_URL = 'http://donate.alger.fun/state/api/stats';

/**
 * 记录应用安装/启动
 */
export async function recordInstallation(): Promise<void> {
  try {
    const deviceId = getDeviceId();
    const systemInfo = getSystemInfo();

    // 发送请求到统计服务器
    await axios.post(`${STATS_API_URL}/installation`, {
      deviceId,
      osType: systemInfo.osType,
      osVersion: systemInfo.osVersion,
      appVersion: systemInfo.appVersion
    });

    console.log('应用启动统计已记录');

    // 记录最后一次启动时间
    store.set('lastStartTime', new Date().toISOString());
  } catch (error) {
    console.error('记录应用启动统计失败:', error);
  }
}

/**
 * 设置 IPC 处理程序以接收渲染进程的统计请求
 * @param ipcMain Electron IPC主对象
 */
export function setupStatsHandlers(ipcMain: Electron.IpcMain): void {
  // 处理页面访问统计
  ipcMain.handle('record-visit', async (_, page: string, userId?: string) => {
    try {
      const deviceId = getDeviceId();

      await axios.post(`${STATS_API_URL}/visit`, {
        deviceId,
        userId,
        page
      });

      return { success: true };
    } catch (error) {
      console.error('记录页面访问统计失败:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 处理播放统计
  ipcMain.handle(
    'record-play',
    async (
      _,
      songData: {
        userId: string | null;
        songId: string | number;
        songName: string;
        artistName: string;
        duration?: number;
        completedPlay?: boolean;
      }
    ) => {
      try {
        const { songId, songName, artistName, duration = 0, completedPlay = false } = songData;
        const deviceId = getDeviceId();

        await axios.post(`${STATS_API_URL}/play`, {
          deviceId,
          userId: songData.userId,
          songId: songId.toString(),
          songName,
          artistName,
          duration,
          completedPlay
        });

        return { success: true };
      } catch (error) {
        console.error('记录播放统计失败:', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // 处理获取统计摘要
  ipcMain.handle('get-stats-summary', async () => {
    try {
      const response = await axios.get(`${STATS_API_URL}/summary`);
      return response.data;
    } catch (error) {
      console.error('获取统计摘要失败:', error);
      throw error;
    }
  });
}

/**
 * 应用启动时初始化统计服务
 */
export function initializeStats(): void {
  // 记录应用启动统计
  recordInstallation().catch((error) => {
    console.error('初始化统计服务失败:', error);
  });

  // 注册应用退出时的回调
  app.on('will-quit', () => {
    // 可以在这里添加应用退出时的统计逻辑
    console.log('应用退出');
  });
}
