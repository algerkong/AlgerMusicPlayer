const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut } = require('electron')
const path = require('path')

let mainWin = null
function createWindow() {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 900,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, '/electron/preload.js'),
    },
  })
  const win = mainWin
  win.setMinimumSize(1280, 900)
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools({ mode: 'detach' })
    win.loadURL('http://localhost:4678/')
  } else {
    win.loadURL(`file://${__dirname}/dist/index.html`)
  }
  const tray = new Tray(path.join(__dirname, 'public/icon.png'))
  tray.setTitle('Alger Music')
  tray.setToolTip('Alger Music')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示',
        click: () => {
          win.show()
        },
      },
      {
        label: '退出',
        click: () => {
          win.destroy()
        },
      },
    ])
  )
  tray.click = () => {
    win.show()
  }

  // 快捷键显示 隐藏
  
}

app.whenReady().then(createWindow)

app.on('ready',()=>{
  globalShortcut.register('CommandOrControl+Alt+Shift+M', () => {
    if (mainWin.isVisible()) {
      mainWin.hide()
    } else {
      mainWin.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

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
  win.destroy()
})

ipcMain.on('drag-start', (event, data) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.webContents.beginFrameSubscription((frameBuffer) => {
    event.reply('frame-buffer', frameBuffer)
  })
})

ipcMain.on('mini-tray', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.hide()
})
