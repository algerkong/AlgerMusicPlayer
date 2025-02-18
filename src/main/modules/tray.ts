import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import { join } from 'path';

import type { Language } from '../../i18n/main';
import i18n from '../../i18n/main';

let tray: Tray | null = null;

const LANGUAGES: { label: string; value: Language }[] = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

// 导出更新菜单的函数
export function updateTrayMenu() {
  if (!tray) return;

  // 创建一个上下文菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: i18n.global.t('common.tray.show'),
      click: () => {
        BrowserWindow.getAllWindows()[0]?.show();
      }
    },
    { type: 'separator' },
    {
      label: i18n.global.t('common.language'),
      submenu: LANGUAGES.map(({ label, value }) => ({
        label,
        type: 'radio',
        checked: i18n.global.locale === value,
        click: () => {
          // 更新主进程的语言设置
          i18n.global.locale = value;
          // 更新托盘菜单
          updateTrayMenu();
          // 通知渲染进程
          const win = BrowserWindow.getAllWindows()[0];
          win?.webContents.send('set-language', value);
        }
      }))
    },
    { type: 'separator' },
    {
      label: i18n.global.t('common.tray.quit'),
      click: () => {
        app.quit();
      }
    }
  ]);

  // 设置系统托盘图标的上下文菜单
  tray.setContextMenu(contextMenu);
}

/**
 * 初始化系统托盘
 */
export function initializeTray(iconPath: string, mainWindow: BrowserWindow) {
  const trayIcon = nativeImage
    .createFromPath(join(iconPath, 'icon_16x16.png'))
    .resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);

  // 初始化菜单
  updateTrayMenu();

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
