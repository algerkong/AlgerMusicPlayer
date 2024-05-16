const { contextBridge, ipcRenderer, app } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  dragStart: (data) => ipcRenderer.send('drag-start', data),
  miniTray: () => ipcRenderer.send('mini-tray'),
  restart: () => ipcRenderer.send('restart'),
  openLyric: () => ipcRenderer.send('open-lyric'),
  sendLyric: (data) => ipcRenderer.send('send-lyric', data),
});

const electronHandler = {
  ipcRenderer: {
    setStoreValue: (key, value) => {
      ipcRenderer.send('setStore', key, value);
    },

    getStoreValue(key) {
      const resp = ipcRenderer.sendSync('getStore', key);
      return resp;
    },
  },
  app,
};

contextBridge.exposeInMainWorld('electron', electronHandler);
