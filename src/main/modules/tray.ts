import { app, Menu, nativeImage, Tray, BrowserWindow } from 'electron';
import { join } from 'path';

let tray: Tray | null = null;

/**
 * 初始化系统托盘
 */
export function initializeTray(iconPath: string, mainWindow: BrowserWindow) {
  const trayIcon = nativeImage.createFromPath(join(iconPath, 'icon_16x16.png')).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);

  // 创建一个上下文菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: '退出',
      click: () => {
        mainWindow.destroy();
        app.quit();
      },
    },
  ]);

  // 设置系统托盘图标的上下文菜单
  tray.setContextMenu(contextMenu);

  // 当系统托盘图标被点击时，切换窗口的显示/隐藏
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  return tray;
} 