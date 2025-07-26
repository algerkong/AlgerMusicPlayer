import {
  app,
  BrowserWindow,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  nativeImage,
  Tray
} from 'electron';
import { join } from 'path';

import i18n from '../../i18n/main';
import { getLanguageOptions } from '../../i18n/utils';
import { getStore } from './config';

// 歌曲信息接口定义
interface SongInfo {
  name: string;
  song: {
    artists: Array<{ name: string; [key: string]: any }>;
    [key: string]: any;
  };
  [key: string]: any;
}

let tray: Tray | null = null;
// 为macOS状态栏添加控制图标
let playPauseTray: Tray | null = null;
let prevTray: Tray | null = null;
let nextTray: Tray | null = null;
let songTitleTray: Tray | null = null;

let isPlaying = false;
let currentSong: SongInfo | null = null;

// 使用自动导入的语言选项
const LANGUAGES = getLanguageOptions();

// 更新播放状态
export function updatePlayState(playing: boolean) {
  isPlaying = playing;
  if (tray) {
    updateTrayMenu(BrowserWindow.getAllWindows()[0]);
  }
  // 更新播放/暂停图标
  updateStatusBarTray();
}

// 获取艺术家名称字符串
function getArtistString(song: SongInfo | null): string {
  if (!song || !song.song || !song.song.artists) return '';
  return song.song.artists.map((item) => item.name).join(' / ');
}

// 获取歌曲完整标题（歌曲名 - 艺术家）
function getSongTitle(song: SongInfo | null): string {
  if (!song) return '未播放';
  const artistStr = getArtistString(song);
  return artistStr ? `${song.name} - ${artistStr}` : song.name;
}

// 更新当前播放的音乐信息
export function updateCurrentSong(song: SongInfo | null) {
  currentSong = song;
  if (tray) {
    updateTrayMenu(BrowserWindow.getAllWindows()[0]);
  }
  // 更新状态栏歌曲信息
  updateStatusBarTray();
}

// 确保 macOS 状态栏图标能正确显示
function getProperIconSize() {
  // macOS 状态栏通常高度为22像素
  const height = 18;
  const width = 18;
  return { width, height };
}

// 更新macOS状态栏图标
function updateStatusBarTray() {
  if (process.platform !== 'darwin') return;

  const iconSize = getProperIconSize();

  // 更新歌曲标题显示
  if (songTitleTray) {
    if (currentSong) {
      // 限制歌曲名显示长度，添加作者名
      const songName = currentSong.name.slice(0, 10);
      let title = songName;
      const artistStr = getArtistString(currentSong);
      // 如果有艺术家名称，添加到标题中
      if (artistStr) {
        title = `${songName} - ${artistStr.slice(0, 6)}${artistStr.length > 6 ? '..' : ''}`;
      }

      // 设置标题和提示
      songTitleTray.setTitle(title, {
        fontType: 'monospacedDigit' // 使用等宽字体以确保更好的可读性
      });

      // 完整信息放在tooltip中
      const fullTitle = getSongTitle(currentSong);
      songTitleTray.setToolTip(fullTitle);
      console.log('更新状态栏歌曲显示:', title, '完整信息:', fullTitle);
    } else {
      songTitleTray.setTitle('未播放', {
        fontType: 'monospacedDigit'
      });
      songTitleTray.setToolTip('未播放');
      console.log('更新状态栏歌曲显示: 未播放');
    }
  }

  // 更新播放/暂停图标
  if (playPauseTray) {
    // 使用PNG图标替代文本
    const iconPath = join(
      app.getAppPath(),
      'resources/icons',
      isPlaying ? 'pause.png' : 'play.png'
    );
    const icon = nativeImage.createFromPath(iconPath).resize(iconSize);
    icon.setTemplateImage(true); // 设置为模板图片，适合macOS深色/浅色模式
    playPauseTray.setImage(icon);
    playPauseTray.setToolTip(
      isPlaying ? i18n.global.t('common.tray.pause') : i18n.global.t('common.tray.play')
    );
  }
}

// 导出更新菜单的函数
export function updateTrayMenu(mainWindow: BrowserWindow) {
  if (!tray) return;

  // 如果是macOS，设置TouchBar
  if (process.platform === 'darwin') {
    // macOS 上使用直接的控制按钮
    const menu = new Menu();

    // 当前播放的音乐信息
    if (currentSong) {
      menu.append(
        new MenuItem({
          label: getSongTitle(currentSong),
          enabled: false,
          type: 'normal'
        })
      );
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // 上一首、播放/暂停、下一首的菜单项
    // 在macOS上临时使用文本菜单项替代图标，确保基本功能正常
    menu.append(
      new MenuItem({
        label: i18n.global.t('common.tray.prev'),
        type: 'normal',
        click: () => {
          mainWindow.webContents.send('global-shortcut', 'prevPlay');
        }
      })
    );

    menu.append(
      new MenuItem({
        label: i18n.global.t(isPlaying ? 'common.tray.pause' : 'common.tray.play'),
        type: 'normal',
        click: () => {
          mainWindow.webContents.send('global-shortcut', 'togglePlay');
        }
      })
    );

    // 收藏
    menu.append(
      new MenuItem({
        label: i18n.global.t('common.tray.favorite'),
        type: 'normal',
        click: () => {
          console.log('[Tray] 发送收藏命令 - macOS菜单');
          mainWindow.webContents.send('global-shortcut', 'toggleFavorite');
        }
      })
    );

    menu.append(
      new MenuItem({
        label: i18n.global.t('common.tray.next'),
        type: 'normal',
        click: () => {
          mainWindow.webContents.send('global-shortcut', 'nextPlay');
        }
      })
    );

    // 分隔符
    menu.append(new MenuItem({ type: 'separator' }));

    // 显示主窗口
    menu.append(
      new MenuItem({
        label: i18n.global.t('common.tray.show'),
        type: 'normal',
        click: () => {
          mainWindow.show();
        }
      })
    );

    // 语言切换子菜单
    const languageSubmenu = Menu.buildFromTemplate(
      LANGUAGES.map(({ label, value }) => ({
        label,
        type: 'radio',
        checked: i18n.global.locale === value,
        click: () => {
          i18n.global.locale = value;
          updateTrayMenu(mainWindow);
          mainWindow.webContents.send('language-changed', value);
        }
      }))
    );

    menu.append(
      new MenuItem({
        label: i18n.global.t('common.language'),
        type: 'submenu',
        submenu: languageSubmenu
      })
    );

    // 退出按钮
    menu.append(
      new MenuItem({
        label: i18n.global.t('common.tray.quit'),
        type: 'normal',
        click: () => {
          app.quit();
        }
      })
    );

    tray.setContextMenu(menu);
  } else {
    // Windows 和 Linux 使用原来的菜单样式
    const menuTemplate: MenuItemConstructorOptions[] = [
      // 当前播放的音乐信息
      ...((currentSong
        ? [
            {
              label: getSongTitle(currentSong),
              enabled: false,
              type: 'normal'
            },
            { type: 'separator' }
          ]
        : []) as MenuItemConstructorOptions[]),
      {
        label: i18n.global.t('common.tray.show'),
        type: 'normal',
        click: () => {
          mainWindow.show();
        }
      },
      {
        label: i18n.global.t('common.tray.favorite'),
        type: 'normal',
        click: () => {
          console.log('[Tray] 发送收藏命令 - Windows/Linux菜单');
          mainWindow.webContents.send('global-shortcut', 'toggleFavorite');
        }
      },
      { type: 'separator' },
      {
        label: i18n.global.t('common.tray.prev'),
        type: 'normal',
        click: () => {
          mainWindow.webContents.send('global-shortcut', 'prevPlay');
        }
      },
      {
        label: i18n.global.t(isPlaying ? 'common.tray.pause' : 'common.tray.play'),
        type: 'normal',
        click: () => {
          mainWindow.webContents.send('global-shortcut', 'togglePlay');
        }
      },
      {
        label: i18n.global.t('common.tray.next'),
        type: 'normal',
        click: () => {
          mainWindow.webContents.send('global-shortcut', 'nextPlay');
        }
      },
      { type: 'separator' },
      {
        label: i18n.global.t('common.language'),
        type: 'submenu',
        submenu: LANGUAGES.map(({ label, value }) => ({
          label,
          type: 'radio',
          checked: i18n.global.locale === value,
          click: () => {
            i18n.global.locale = value;
            updateTrayMenu(mainWindow);
            mainWindow.webContents.send('language-changed', value);
          }
        }))
      },
      { type: 'separator' },
      {
        label: i18n.global.t('common.tray.quit'),
        type: 'normal',
        click: () => {
          app.quit();
        }
      }
    ];

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    tray.setContextMenu(contextMenu);
  }
}

// 初始化状态栏Tray
function initializeStatusBarTray(mainWindow: BrowserWindow) {
  const store = getStore();
  if (process.platform !== 'darwin' || !store.get('set.showTopAction')) return;

  const iconSize = getProperIconSize();

  // 创建下一首按钮（调整顺序，先创建下一首按钮）
  const nextIcon = nativeImage
    .createFromPath(join(app.getAppPath(), 'resources/icons', 'next.png'))
    .resize(iconSize);
  nextIcon.setTemplateImage(true); // 设置为模板图片，适合macOS深色/浅色模式
  nextTray = new Tray(nextIcon);
  nextTray.setToolTip(i18n.global.t('common.tray.next'));
  nextTray.on('click', () => {
    mainWindow.webContents.send('global-shortcut', 'nextPlay');
  });

  // 创建播放/暂停按钮
  const playPauseIcon = nativeImage
    .createFromPath(join(app.getAppPath(), 'resources/icons', isPlaying ? 'pause.png' : 'play.png'))
    .resize(iconSize);
  playPauseIcon.setTemplateImage(true); // 设置为模板图片，适合macOS深色/浅色模式
  playPauseTray = new Tray(playPauseIcon);
  playPauseTray.setToolTip(
    isPlaying ? i18n.global.t('common.tray.pause') : i18n.global.t('common.tray.play')
  );
  playPauseTray.on('click', () => {
    mainWindow.webContents.send('global-shortcut', 'togglePlay');
  });

  // 创建上一首按钮（调整顺序，最后创建上一首按钮）
  const prevIcon = nativeImage
    .createFromPath(join(app.getAppPath(), 'resources/icons', 'prev.png'))
    .resize(iconSize);
  prevIcon.setTemplateImage(true); // 设置为模板图片，适合macOS深色/浅色模式
  prevTray = new Tray(prevIcon);
  prevTray.setToolTip(i18n.global.t('common.tray.prev'));
  prevTray.on('click', () => {
    mainWindow.webContents.send('global-shortcut', 'prevPlay');
  });

  // 创建歌曲信息显示 - 需要使用特殊处理
  const titleIcon = nativeImage
    .createFromPath(join(app.getAppPath(), 'resources/icons', 'note.png'))
    .resize({ width: 16, height: 16 });
  titleIcon.setTemplateImage(true);
  songTitleTray = new Tray(titleIcon);

  // 初始化显示文本
  const initialText = getSongTitle(currentSong);

  // 在macOS上，特别设置title来显示文本，确保它能正确显示
  songTitleTray.setTitle(initialText, {
    fontType: 'monospacedDigit' // 使用等宽字体以确保更好的可读性
  });

  songTitleTray.setToolTip(initialText);
  songTitleTray.on('click', () => {
    mainWindow.show();
  });

  // 强制更新一次所有图标
  updateStatusBarTray();

  // 打印调试信息
  console.log('状态栏初始化完成，歌曲显示标题:', initialText);
}

/**
 * 初始化系统托盘
 */
export function initializeTray(iconPath: string, mainWindow: BrowserWindow) {
  // 根据平台选择合适的图标
  const iconSize = process.platform === 'darwin' ? 18 : 16;
  const iconFile = process.platform === 'darwin' ? 'icon_16x16.png' : 'icon_16x16.png';

  const trayIcon = nativeImage
    .createFromPath(join(iconPath, iconFile))
    .resize({ width: iconSize, height: iconSize });

  tray = new Tray(trayIcon);

  // 设置托盘图标的提示文字
  tray.setToolTip('Alger Music Player');

  // 初始化菜单
  updateTrayMenu(mainWindow);

  // 初始化状态栏控制按钮 (macOS)
  initializeStatusBarTray(mainWindow);

  // 在 macOS 上，点击图标时显示菜单
  if (process.platform === 'darwin') {
    tray.on('click', () => {
      if (tray) {
        tray.popUpContextMenu();
      }
    });
  } else {
    // 在其他平台上，点击图标时切换窗口显示状态
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    });
  }

  return tray;
}
