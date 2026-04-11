const { execSync } = require('child_process');

if (process.platform === 'linux') {
  // You need to make sure that
  // /home/runner/work/VutronMusic/VutronMusic/node_modules/electron/dist/chrome-sandbox
  // is owned by root and has mode 4755.
  execSync('sudo chown root:root ./node_modules/electron/dist/chrome-sandbox');
  execSync('sudo chmod 4755 ./node_modules/electron/dist/chrome-sandbox');
}
