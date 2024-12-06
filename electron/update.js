const { app, BrowserWindow } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class Updater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.updateUrl = 'http://your-server.com/update'; // 更新服务器地址
    this.version = app.getVersion();
  }

  // 检查更新
  async checkForUpdates() {
    try {
      const response = await axios.get(`${this.updateUrl}/check`, {
        params: {
          version: this.version,
        },
      });

      if (response.data.hasUpdate) {
        await this.downloadUpdate(response.data.downloadUrl);
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  }

  // 下载更新
  async downloadUpdate(downloadUrl) {
    try {
      const response = await axios({
        url: downloadUrl,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      const tempPath = path.join(app.getPath('temp'), 'update.zip');
      fs.writeFileSync(tempPath, response.data);

      await this.extractUpdate(tempPath);
    } catch (error) {
      console.error('下载更新失败:', error);
    }
  }

  // 解压更新
  async extractUpdate(zipPath) {
    try {
      const zip = new AdmZip(zipPath);
      const targetPath = path.join(__dirname, '../dist'); // 前端文件目录

      // 解压文件
      zip.extractAllTo(targetPath, true);

      // 删除临时文件
      fs.unlinkSync(zipPath);

      // 刷新页面
      this.mainWindow.webContents.reload();
    } catch (error) {
      console.error('解压更新失败:', error);
    }
  }
}

module.exports = Updater;
