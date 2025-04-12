import { app } from 'electron';
import Store from 'electron-store';
import { machineIdSync } from 'node-machine-id';
import os from 'os';

const store = new Store();

/**
 * 获取设备唯一标识符
 * 优先使用存储的ID，如果没有则获取机器ID并存储
 */
export function getDeviceId(): string {
  let deviceId = store.get('deviceId') as string | undefined;

  if (!deviceId) {
    try {
      // 使用node-machine-id获取设备唯一标识
      deviceId = machineIdSync(true);
    } catch (error) {
      console.error('获取机器ID失败:', error);
      // 如果获取失败，使用主机名和MAC地址组合作为备选方案
      const networkInterfaces = os.networkInterfaces();
      let macAddress = '';

      // 尝试获取第一个非内部网络接口的MAC地址
      Object.values(networkInterfaces).forEach((interfaces) => {
        if (interfaces) {
          interfaces.forEach((iface) => {
            if (!iface.internal && !macAddress && iface.mac !== '00:00:00:00:00:00') {
              macAddress = iface.mac;
            }
          });
        }
      });

      deviceId = `${os.hostname()}-${macAddress}`.replace(/:/g, '');
    }

    // 存储设备ID
    if (deviceId) {
      store.set('deviceId', deviceId);
    } else {
      // 如果所有方法都失败，使用随机ID
      deviceId = Math.random().toString(36).substring(2, 15);
      store.set('deviceId', deviceId);
    }
  }

  return deviceId;
}

/**
 * 获取系统信息
 */
export function getSystemInfo() {
  return {
    osType: os.type(),
    osVersion: os.release(),
    osArch: os.arch(),
    platform: process.platform,
    appVersion: app.getVersion()
  };
}
