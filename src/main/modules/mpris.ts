import { app, BrowserWindow, ipcMain } from 'electron';
import Player from 'mpris-service';

let dbusModule: any;
try {
  dbusModule = require('@httptoolkit/dbus-native');
} catch {
  // dbus-native 不可用（非 Linux 环境）
}

interface SongInfo {
  id?: number | string;
  name: string;
  picUrl?: string;
  ar?: Array<{ name: string }>;
  artists?: Array<{ name: string }>;
  al?: { name: string };
  album?: { name: string };
  duration?: number;
  dt?: number;
  song?: {
    artists?: Array<{ name: string }>;
    album?: { name: string };
    duration?: number;
    picUrl?: string;
  };
  [key: string]: any;
}

let mprisPlayer: Player | null = null;
let mainWindow: BrowserWindow | null = null;
let currentPosition = 0;
let trayLyricIface: any = null;
let trayLyricBus: any = null;

// 保存 IPC 处理函数引用，用于清理
let onPositionUpdate: ((event: any, position: number) => void) | null = null;
let onTrayLyricUpdate: ((event: any, lrcObj: string) => void) | null = null;

export function initializeMpris(mainWindowRef: BrowserWindow) {
  if (process.platform !== 'linux') return;

  if (mprisPlayer) {
    return;
  }

  mainWindow = mainWindowRef;

  try {
    mprisPlayer = Player({
      name: 'AlgerMusicPlayer',
      identity: 'Alger Music Player',
      supportedUriSchemes: ['file', 'http', 'https'],
      supportedMimeTypes: [
        'audio/mpeg',
        'audio/mp3',
        'audio/flac',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/m4a'
      ],
      supportedInterfaces: ['player']
    });

    mprisPlayer.on('quit', () => {
      app.quit();
    });

    mprisPlayer.on('raise', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    mprisPlayer.on('next', () => {
      if (mainWindow) {
        mainWindow.webContents.send('global-shortcut', 'nextPlay');
      }
    });

    mprisPlayer.on('previous', () => {
      if (mainWindow) {
        mainWindow.webContents.send('global-shortcut', 'prevPlay');
      }
    });

    mprisPlayer.on('pause', () => {
      if (mainWindow) {
        mainWindow.webContents.send('mpris-pause');
      }
    });

    mprisPlayer.on('play', () => {
      if (mainWindow) {
        mainWindow.webContents.send('mpris-play');
      }
    });

    mprisPlayer.on('playpause', () => {
      if (mainWindow) {
        mainWindow.webContents.send('global-shortcut', 'togglePlay');
      }
    });

    mprisPlayer.on('stop', () => {
      if (mainWindow) {
        mainWindow.webContents.send('mpris-pause');
      }
    });

    mprisPlayer.getPosition = (): number => {
      return currentPosition;
    };

    mprisPlayer.on('seek', (offset: number) => {
      if (mainWindow) {
        const newPosition = Math.max(0, currentPosition + offset / 1000000);
        mainWindow.webContents.send('mpris-seek', newPosition);
      }
    });

    mprisPlayer.on('position', (event: { trackId: string; position: number }) => {
      if (mainWindow) {
        mainWindow.webContents.send('mpris-set-position', event.position / 1000000);
      }
    });

    onPositionUpdate = (_, position: number) => {
      currentPosition = position * 1000 * 1000;
      if (mprisPlayer) {
        mprisPlayer.seeked(position * 1000 * 1000);
        mprisPlayer.getPosition = () => position * 1000 * 1000;
        mprisPlayer.position = position * 1000 * 1000;
      }
    };
    ipcMain.on('mpris-position-update', onPositionUpdate);

    onTrayLyricUpdate = (_, lrcObj: string) => {
      sendTrayLyric(lrcObj);
    };
    ipcMain.on('tray-lyric-update', onTrayLyricUpdate);

    initTrayLyric();

    console.log('[MPRIS] Service initialized');
  } catch (error) {
    console.error('[MPRIS] Failed to initialize:', error);
  }
}

export function updateMprisPlayState(playing: boolean) {
  if (!mprisPlayer || process.platform !== 'linux') return;
  mprisPlayer.playbackStatus = playing ? 'Playing' : 'Paused';
}

export function updateMprisCurrentSong(song: SongInfo | null) {
  if (!mprisPlayer || process.platform !== 'linux') return;

  if (!song) {
    mprisPlayer.metadata = {};
    mprisPlayer.playbackStatus = 'Stopped';
    return;
  }

  const artists =
    song.ar?.map((a) => a.name).join(', ') ||
    song.artists?.map((a) => a.name).join(', ') ||
    song.song?.artists?.map((a) => a.name).join(', ') ||
    '';
  const album = song.al?.name || song.album?.name || song.song?.album?.name || '';
  const duration = song.duration || song.dt || song.song?.duration || 0;

  mprisPlayer.metadata = {
    'mpris:trackid': mprisPlayer.objectPath(`track/${song.id || 0}`),
    'mpris:length': duration * 1000,
    'mpris:artUrl': song.picUrl || '',
    'xesam:title': song.name || '',
    'xesam:album': album,
    'xesam:artist': artists ? [artists] : []
  };
}

export function updateMprisPosition(position: number) {
  if (!mprisPlayer || process.platform !== 'linux') return;
  mprisPlayer.seeked(position * 1000000);
}

export function destroyMpris() {
  if (onPositionUpdate) {
    ipcMain.removeListener('mpris-position-update', onPositionUpdate);
    onPositionUpdate = null;
  }
  if (onTrayLyricUpdate) {
    ipcMain.removeListener('tray-lyric-update', onTrayLyricUpdate);
    onTrayLyricUpdate = null;
  }
  if (mprisPlayer) {
    mprisPlayer.quit();
    mprisPlayer = null;
  }
}

function initTrayLyric() {
  if (process.platform !== 'linux' || !dbusModule) return;

  const serviceName = 'org.gnome.Shell.TrayLyric';

  try {
    const sessionBus = dbusModule.sessionBus({});
    trayLyricBus = sessionBus;

    const dbusPath = '/org/freedesktop/DBus';
    const dbusInterface = 'org.freedesktop.DBus';

    sessionBus.invoke(
      {
        path: dbusPath,
        interface: dbusInterface,
        member: 'GetNameOwner',
        destination: 'org.freedesktop.DBus',
        signature: 's',
        body: [serviceName]
      },
      (err: any, result: any) => {
        if (err || !result) {
          console.log('[TrayLyric] Service not running');
        } else {
          onServiceAvailable();
        }
      }
    );
  } catch (err) {
    console.error('[TrayLyric] Failed to init:', err);
  }

  function onServiceAvailable() {
    if (!trayLyricBus) return;
    const path = '/' + serviceName.replace(/\./g, '/');
    trayLyricBus.getService(serviceName).getInterface(path, serviceName, (err: any, iface: any) => {
      if (err) {
        console.error('[TrayLyric] Failed to get service interface:', err);
        return;
      }
      trayLyricIface = iface;
      console.log('[TrayLyric] Service interface ready');
    });
  }
}

function sendTrayLyric(lrcObj: string) {
  if (!trayLyricIface || !trayLyricBus) return;

  trayLyricBus.invoke(
    {
      path: '/org/gnome/Shell/TrayLyric',
      interface: 'org.gnome.Shell.TrayLyric',
      member: 'UpdateLyric',
      destination: 'org.gnome.Shell.TrayLyric',
      signature: 's',
      body: [lrcObj]
    },
    (err: any, _result: any) => {
      if (err) {
        console.error('[TrayLyric] Failed to invoke UpdateLyric:', err);
      }
    }
  );
}
