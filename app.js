const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, '/electron/preload.js'),
    },
  })
  win.setMinimumSize(1280, 900);

  if (process.env.NODE_ENV === 'dev') {
    win.loadURL('http://localhost:4678/')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadURL(`file://${__dirname}/dist/index.html`)
  }
}

app.whenReady().then(createWindow)

ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.minimize()
})

ipcMain.on('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
})

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.close()
})

ipcMain.on('drag-start', (event, data) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.webContents.beginFrameSubscription((frameBuffer) => {
    event.reply('frame-buffer', frameBuffer)
  })
})