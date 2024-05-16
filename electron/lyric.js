const { BrowserWindow } = require('electron');

let lyricWindow = null;

const loadLyricWindow = (ipcMain) => {
  lyricWindow = new BrowserWindow({
    width: 800,
    height: 300,
    frame: false,
    show: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      preload: `${__dirname}/preload.js`,
      contextIsolation: false,
    },
  });

  ipcMain.on('open-lyric', () => {
    if (process.env.NODE_ENV === 'development') {
      lyricWindow.webContents.openDevTools({ mode: 'detach' });
      lyricWindow.loadURL('http://localhost:4678/#/lyric');
    } else {
      lyricWindow.loadURL(`file://${__dirname}/dist/index.html/#/lyric`);
    }

    lyricWindow.show();
  });

  ipcMain.on('send-lyric', (e, data) => {
    lyricWindow.webContents.send('receive-lyric', data);
  });
};

module.exports = {
  loadLyricWindow,
};
