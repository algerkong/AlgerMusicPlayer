"use strict";
const preload = require("@electron-toolkit/preload");
const electron = require("electron");
const api = {
  minimize: () => electron.ipcRenderer.send("minimize-window"),
  maximize: () => electron.ipcRenderer.send("maximize-window"),
  close: () => electron.ipcRenderer.send("close-window"),
  dragStart: (data) => electron.ipcRenderer.send("drag-start", data),
  miniTray: () => electron.ipcRenderer.send("mini-tray"),
  restart: () => electron.ipcRenderer.send("restart"),
  openLyric: () => electron.ipcRenderer.send("open-lyric"),
  sendLyric: (data) => electron.ipcRenderer.send("send-lyric", data),
  unblockMusic: (id) => electron.ipcRenderer.invoke("unblock-music", id)
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
