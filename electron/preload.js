const { contextBridge, ipcRenderer } = require('electron');

// 主进程通信
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

// 存储相关
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    setStoreValue: (key, value) => ipcRenderer.send('setStore', key, value),
    getStoreValue: (key) => ipcRenderer.sendSync('getStore', key),
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    once: (channel, func) => {
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    },
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
  },
});
