/**
 * 修复 Linux 下 Electron sandbox 权限问题
 * chrome-sandbox 需要 root 拥有且权限为 4755
 *
 * 注意：此脚本需要 sudo 权限，仅在 CI 环境或手动执行时使用
 * 用法：sudo node fix-sandbox.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.platform === 'linux') {
  const sandboxPath = path.resolve('./node_modules/electron/dist/chrome-sandbox');
  if (fs.existsSync(sandboxPath)) {
    execSync(`sudo chown root:root ${sandboxPath}`);
    execSync(`sudo chmod 4755 ${sandboxPath}`);
    console.log('[fix-sandbox] chrome-sandbox permissions fixed');
  } else {
    console.log('[fix-sandbox] chrome-sandbox not found, skipping');
  }
}
