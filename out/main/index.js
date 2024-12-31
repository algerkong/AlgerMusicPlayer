"use strict";
const utils = require("@electron-toolkit/utils");
const electron = require("electron");
const Store = require("electron-store");
const path = require("path");
const fs = require("fs");
const os = require("os");
const match = require("@unblockneteasemusic/server");
const server = require("netease-cloud-music-api-alger/server");
const isProxy = false;
const noAnimate = false;
const animationSpeed = 1;
const author = "Alger";
const authorUrl = "https://github.com/algerkong";
const musicApiPort = 30488;
const set = {
  isProxy,
  noAnimate,
  animationSpeed,
  author,
  authorUrl,
  musicApiPort
};
const store$2 = new Store();
let lyricWindow = null;
const createWin = () => {
  console.log("Creating lyric window");
  const windowBounds = store$2.get("lyricWindowBounds") || {};
  const { x, y, width, height } = windowBounds;
  const { width: screenWidth, height: screenHeight } = electron.screen.getPrimaryDisplay().workAreaSize;
  const validPosition = x !== void 0 && y !== void 0 && x >= 0 && y >= 0 && x < screenWidth && y < screenHeight;
  lyricWindow = new electron.BrowserWindow({
    width: width || 800,
    height: height || 200,
    x: validPosition ? x : void 0,
    y: validPosition ? y : void 0,
    frame: false,
    show: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true
    }
  });
  lyricWindow.on("closed", () => {
    if (lyricWindow) {
      lyricWindow.destroy();
      lyricWindow = null;
    }
  });
  return lyricWindow;
};
const loadLyricWindow = (ipcMain, mainWin) => {
  const showLyricWindow = () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      if (lyricWindow.isMinimized()) {
        lyricWindow.restore();
      }
      lyricWindow.focus();
      lyricWindow.show();
      return true;
    }
    return false;
  };
  ipcMain.on("open-lyric", () => {
    console.log("Received open-lyric request");
    if (showLyricWindow()) {
      return;
    }
    console.log("Creating new lyric window");
    const win = createWin();
    if (!win) {
      console.error("Failed to create lyric window");
      return;
    }
    if (process.env.NODE_ENV === "development") {
      win.webContents.openDevTools({ mode: "detach" });
      win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/#/lyric`);
    } else {
      const distPath = path.resolve(__dirname, "../renderer");
      win.loadURL(`file://${distPath}/index.html#/lyric`);
    }
    win.setMinimumSize(600, 200);
    win.setSkipTaskbar(true);
    win.once("ready-to-show", () => {
      console.log("Lyric window ready to show");
      win.show();
    });
  });
  ipcMain.on("send-lyric", (_, data) => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      try {
        lyricWindow.webContents.send("receive-lyric", data);
      } catch (error) {
        console.error("Error processing lyric data:", error);
      }
    }
  });
  ipcMain.on("top-lyric", (_, data) => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setAlwaysOnTop(data);
    }
  });
  ipcMain.on("close-lyric", () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.webContents.send("lyric-window-close");
      mainWin.webContents.send("lyric-control-back", "close");
      lyricWindow.destroy();
      lyricWindow = null;
    }
  });
  ipcMain.on("mouseenter-lyric", () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setIgnoreMouseEvents(true);
    }
  });
  ipcMain.on("mouseleave-lyric", () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setIgnoreMouseEvents(false);
    }
  });
  ipcMain.on("lyric-drag-move", (_, { deltaX, deltaY }) => {
    if (!lyricWindow || lyricWindow.isDestroyed()) return;
    const [currentX, currentY] = lyricWindow.getPosition();
    const { width: screenWidth, height: screenHeight } = electron.screen.getPrimaryDisplay().workAreaSize;
    const [windowWidth, windowHeight] = lyricWindow.getSize();
    const newX = Math.max(0, Math.min(currentX + deltaX, screenWidth - windowWidth));
    const newY = Math.max(0, Math.min(currentY + deltaY, screenHeight - windowHeight));
    lyricWindow.setPosition(newX, newY);
    store$2.set("lyricWindowBounds", {
      ...lyricWindow.getBounds(),
      x: newX,
      y: newY
    });
  });
  ipcMain.on("set-ignore-mouse", (_, shouldIgnore) => {
    if (!lyricWindow || lyricWindow.isDestroyed()) return;
    lyricWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  });
  ipcMain.on("control-back", (_, command) => {
    console.log("command", command);
    if (mainWin && !mainWin.isDestroyed()) {
      console.log("Sending control-back command:", command);
      mainWin.webContents.send("lyric-control-back", command);
    }
  });
};
const unblockMusic = async (id) => {
  return new Promise((resolve, reject) => {
    match(parseInt(id, 10), ["qq", "migu", "kugou", "joox"]).then((data) => {
      resolve({
        data: {
          data,
          params: {
            id,
            type: "song"
          }
        }
      });
    }).catch((err) => {
      reject(err);
    });
  });
};
const store$1 = new Store();
if (!fs.existsSync(path.resolve(os.tmpdir(), "anonymous_token"))) {
  fs.writeFileSync(path.resolve(os.tmpdir(), "anonymous_token"), "", "utf-8");
}
electron.ipcMain.handle("unblock-music", async (_, id) => {
  return unblockMusic(id);
});
async function startMusicApi() {
  console.log("MUSIC API STARTED");
  const port = store$1.get("set").musicApiPort || 30488;
  await server.serveNcmApi({
    port
  });
}
const iconPath = path.join(__dirname, "../../resources");
const icon = electron.nativeImage.createFromPath(
  process.platform === "darwin" ? path.join(iconPath, "icon.icns") : process.platform === "win32" ? path.join(iconPath, "favicon.ico") : path.join(iconPath, "icon.png")
);
let mainWindow;
function createWindow() {
  startMusicApi();
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 780,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true
    }
  });
  mainWindow.setMinimumSize(1200, 780);
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.webContents.openDevTools({ mode: "detach" });
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  const trayIcon = electron.nativeImage.createFromPath(path.join(iconPath, "icon_16x16.png")).resize({ width: 16, height: 16 });
  const tray = new electron.Tray(trayIcon);
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "显示",
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: "退出",
      click: () => {
        mainWindow.destroy();
        electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
  loadLyricWindow(electron.ipcMain, mainWindow);
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.alger.music");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("ready", () => {
  electron.globalShortcut.register("CommandOrControl+Alt+Shift+M", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.ipcMain.on("minimize-window", (event) => {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.minimize();
  }
});
electron.ipcMain.on("maximize-window", (event) => {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
electron.ipcMain.on("close-window", (event) => {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.destroy();
    electron.app.quit();
  }
});
electron.ipcMain.on("drag-start", (event) => {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.webContents.beginFrameSubscription((frameBuffer) => {
      event.reply("frame-buffer", frameBuffer);
    });
  }
});
electron.ipcMain.on("mini-tray", (event) => {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.hide();
  }
});
electron.ipcMain.on("restart", () => {
  electron.app.relaunch();
  electron.app.exit(0);
});
const store = new Store({
  name: "config",
  // 配置文件名
  defaults: {
    set
  }
});
electron.ipcMain.on("set-store-value", (_, key, value) => {
  store.set(key, value);
});
electron.ipcMain.on("get-store-value", (_, key) => {
  const value = store.get(key);
  _.returnValue = value || "";
});
