import cors from 'cors';
import { ipcMain } from 'electron';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getStore } from './config';

// 定义远程控制相关接口
export interface RemoteControlConfig {
  enabled: boolean;
  port: number;
  allowedIps: string[];
}

// 默认配置
export const defaultRemoteControlConfig: RemoteControlConfig = {
  enabled: false,
  port: 31888,
  allowedIps: []
};

let app: express.Application | null = null;
let server: any = null;
let mainWindowRef: Electron.BrowserWindow | null = null;
let currentSong: any = null;
let isPlaying: boolean = false;

// 获取本地IP地址
function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const key in interfaces) {
    const iface = interfaces[key];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          addresses.push(alias.address);
        }
      }
    }
  }

  return addresses;
}

// 初始化远程控制服务
export function initializeRemoteControl(mainWindow: Electron.BrowserWindow) {
  mainWindowRef = mainWindow;
  const store = getStore() as any;
  let config = store.get('remoteControl') as RemoteControlConfig;

  // 如果配置不存在，使用默认配置
  if (!config) {
    config = defaultRemoteControlConfig;
    store.set('remoteControl', config);
  }

  // 监听当前歌曲变化
  ipcMain.on('update-current-song', (_, song: any) => {
    currentSong = song;
  });

  // 监听播放状态变化
  ipcMain.on('update-play-state', (_, playing: boolean) => {
    isPlaying = playing;
  });

  // 监听远程控制配置变化
  ipcMain.on('update-remote-control-config', (_, newConfig: RemoteControlConfig) => {
    if (server) {
      stopServer();
    }

    store.set('remoteControl', newConfig);

    if (newConfig.enabled) {
      startServer(newConfig);
    }
  });

  // 获取远程控制配置
  ipcMain.handle('get-remote-control-config', () => {
    const config = store.get('remoteControl') as RemoteControlConfig;
    return config || defaultRemoteControlConfig;
  });

  // 获取本地IP地址
  ipcMain.handle('get-local-ip-addresses', () => {
    return getLocalIpAddresses();
  });

  // 如果启用了远程控制，启动服务器
  if (config.enabled) {
    startServer(config);
  }
}

// 启动远程控制服务器
function startServer(config: RemoteControlConfig) {
  if (!mainWindowRef) {
    console.error('主窗口未初始化，无法启动远程控制服务');
    return;
  }

  app = express();

  // 跨域配置
  app.use(cors());
  app.use(express.json());

  // IP 过滤中间件
  app.use((req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    const cleanIp = clientIp.replace(/^::ffff:/, ''); // 移除IPv6前缀
    console.log('config', config);
    if (config.allowedIps.length === 0 || config.allowedIps.includes(cleanIp)) {
      next();
    } else {
      res.status(403).json({ error: '未授权的IP地址' });
    }
  });

  // 路由配置
  setupRoutes(app);

  // 启动服务器
  try {
    server = app.listen(config.port, () => {
      console.log(`远程控制服务已启动，监听端口: ${config.port}`);
    });
  } catch (error) {
    console.error('启动远程控制服务失败:', error);
  }
}

// 停止远程控制服务器
function stopServer() {
  if (server) {
    server.close();
    server = null;
    app = null;
    console.log('远程控制服务已停止');
  }
}

// 设置路由
function setupRoutes(app: express.Application) {
  // 获取当前播放状态
  app.get('/api/status', (_, res) => {
    res.json({
      isPlaying,
      currentSong
    });
  });

  // 播放/暂停
  app.post('/api/toggle-play', (_, res) => {
    if (!mainWindowRef) {
      return res.status(500).json({ error: '主窗口未初始化' });
    }
    mainWindowRef.webContents.send('global-shortcut', 'togglePlay');
    res.json({ success: true, message: '已发送播放/暂停指令' });
  });

  // 上一首
  app.post('/api/prev', (_, res) => {
    if (!mainWindowRef) {
      return res.status(500).json({ error: '主窗口未初始化' });
    }
    mainWindowRef.webContents.send('global-shortcut', 'prevPlay');
    res.json({ success: true, message: '已发送上一首指令' });
  });

  // 下一首
  app.post('/api/next', (_, res) => {
    if (!mainWindowRef) {
      return res.status(500).json({ error: '主窗口未初始化' });
    }
    mainWindowRef.webContents.send('global-shortcut', 'nextPlay');
    res.json({ success: true, message: '已发送下一首指令' });
  });

  // 音量加
  app.post('/api/volume-up', (_, res) => {
    if (!mainWindowRef) {
      return res.status(500).json({ error: '主窗口未初始化' });
    }
    mainWindowRef.webContents.send('global-shortcut', 'volumeUp');
    res.json({ success: true, message: '已发送音量加指令' });
  });

  // 音量减
  app.post('/api/volume-down', (_, res) => {
    if (!mainWindowRef) {
      return res.status(500).json({ error: '主窗口未初始化' });
    }
    mainWindowRef.webContents.send('global-shortcut', 'volumeDown');
    res.json({ success: true, message: '已发送音量减指令' });
  });

  // 收藏/取消收藏
  app.post('/api/toggle-favorite', (_, res) => {
    if (!mainWindowRef) {
      return res.status(500).json({ error: '主窗口未初始化' });
    }
    mainWindowRef.webContents.send('global-shortcut', 'toggleFavorite');
    res.json({ success: true, message: '已发送收藏/取消收藏指令' });
  });

  // 提供远程控制界面HTML
  app.get('/', (_, res) => {
    try {
      const resourcesPath = process.resourcesPath || '';
      const isDev = process.env.NODE_ENV === 'development';
      const htmlPath = path.join(process.cwd(), 'resources', 'html', 'remote-control.html');
      const finalPath = isDev ? htmlPath : path.join(resourcesPath, 'html', 'remote-control.html');

      if (fs.existsSync(finalPath)) {
        res.sendFile(finalPath);
      } else {
        res.status(404).send('远程控制界面文件未找到');
        console.error('远程控制界面文件不存在:', finalPath);
      }
    } catch (error) {
      console.error('加载远程控制界面失败:', error);
      res.status(500).send('加载远程控制界面失败');
    }
  });
}
