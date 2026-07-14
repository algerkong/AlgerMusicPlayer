const { spawn } = await import('node:child_process');
const { existsSync } = await import('node:fs');
const { mkdtemp, mkdir, readFile, rm, writeFile } = await import('node:fs/promises');
const path = await import('node:path');

const appVersion = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')).version;

const exePath = process.env.AMPL_EXE_PATH
  ? path.resolve(process.env.AMPL_EXE_PATH)
  : path.resolve('.tmp', 'installer-smoke-x64-latest', 'AMPL Music.exe');
const outBase = process.env.AMPL_ACCOUNT_OUT_BASENAME || 'smoke-installed-account-journey';
const port = Number(process.env.AMPL_DEBUG_PORT || 9482);

if (!existsSync(exePath)) {
  throw new Error(`exe not found: ${exePath}`);
}

const tempBase = path.resolve('.tmp');
await mkdir(tempBase, { recursive: true });
const tempRoot = await mkdtemp(path.join(tempBase, `${outBase}-profile-`));
for (const dir of ['APPDATA', 'LOCALAPPDATA', 'TEMP']) {
  await mkdir(path.join(tempRoot, dir), { recursive: true });
}

const child = spawn(exePath, [`--remote-debugging-port=${port}`], {
  env: {
    ...process.env,
    APPDATA: path.join(tempRoot, 'APPDATA'),
    LOCALAPPDATA: path.join(tempRoot, 'LOCALAPPDATA'),
    TEMP: path.join(tempRoot, 'TEMP'),
    TMP: path.join(tempRoot, 'TEMP')
  },
  stdio: 'ignore'
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function waitForTarget() {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      const page = targets.find(
        (target) =>
          target?.type === 'page' &&
          typeof target.webSocketDebuggerUrl === 'string' &&
          !String(target.url || '').includes('#/lyric') &&
          !String(target.url || '').startsWith('devtools://')
      );
      if (page) return page;
    } catch {
      // Ignore transient polling errors while the app is still loading.
    }
    await delay(500);
  }
  throw new Error('target timeout');
}

function createCdp(url) {
  const ws = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', (event) => reject(event.error || new Error('ws error')), {
      once: true
    });
  });

  ws.addEventListener('message', (event) => {
    const payload = JSON.parse(String(event.data));
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) reject(new Error(payload.error.message || JSON.stringify(payload.error)));
    else resolve(payload.result || {});
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = ++nextId;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      ws.close();
    }
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return result.result?.value;
}

async function waitFor(cdp, expression, timeoutMs = 12000, intervalMs = 200) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await evaluate(cdp, expression);
      if (value) return true;
    } catch {
      // Ignore transient polling errors while the app is still loading.
    }
    await delay(intervalMs);
  }
  return false;
}

async function captureScreenshot(cdp, key) {
  const image = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const pngPath = path.resolve('.tmp', `${outBase}-${key}.png`);
  await writeFile(pngPath, Buffer.from(image.data, 'base64'));
  return pngPath;
}

async function collectState(cdp) {
  return evaluate(
    cdp,
    `(() => ({
      hash: location.hash,
      currentMenu: Array.from(document.querySelectorAll('.app-menu-item-link[aria-current="page"]'))
        .map((node) => node.textContent?.replace(/\\s+/g, ' ').trim())
        .filter(Boolean),
      loginTitle: document.querySelector('.login-page .login-title')?.textContent?.trim() || null,
      settingsTitle: document.querySelector('h1')?.textContent?.trim() || null,
      tabs: Array.from(document.querySelectorAll('[role="tab"]')).map((node) => ({
        text: node.textContent?.replace(/\\s+/g, ' ').trim() || '',
        selected: node.getAttribute('aria-selected')
      })).filter((item) => item.text),
      cookieInputs: Array.from(document.querySelectorAll('textarea,input')).map((node) => ({
        tag: node.tagName,
        aria: node.getAttribute('aria-label') || '',
        placeholder: node.getAttribute('placeholder') || '',
        inCookieLogin: Boolean(node.closest('.cookie-login'))
      })).filter((item) => item.inCookieLogin || /cookie/i.test(item.aria + ' ' + item.placeholder) || item.tag === 'TEXTAREA'),
      buttonTexts: Array.from(document.querySelectorAll('button'))
        .map((node) => node.textContent?.replace(/\\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 80),
      bodyPreview: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 320) || ''
    }))()`
  );
}


async function removeTempRootWithRetry() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(tempRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
      return;
    } catch (error) {
      if (attempt === 5) {
        console.warn(`[qa] temp cleanup skipped: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      await delay(250 * (attempt + 1));
    }
  }
}

async function kill() {
  if (!child?.pid) return;
  await new Promise((resolve) => {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    killer.on('exit', resolve);
    killer.on('error', resolve);
  });
}

let cdp;
try {
  const target = await waitForTarget();
  cdp = createCdp(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      localStorage.clear();
      localStorage.setItem('disclaimer_agreed_timestamp', '1720000000000');
      localStorage.setItem('traffic_warning_dismissed', 'true');
      localStorage.setItem('first_run_guide_dismissed', 'true');
      localStorage.setItem('donation_shown_version', ${JSON.stringify(appVersion)});
    })();`
  });
  await cdp.send('Page.reload', { ignoreCache: true });
  await delay(2500);

  const checks = {};

  await evaluate(cdp, `window.location.hash = '#/user'; true;`);
  checks.userRedirectedToLogin = await waitFor(
    cdp,
    `location.hash === '#/login' && !!document.querySelector('.login-page .tab-item')`,
    15000,
    250
  );
  await delay(800);
  checks.userRedirectState = await collectState(cdp);
  checks.userRedirectScreenshot = await captureScreenshot(cdp, 'user-redirect-login');

  checks.cookieTabClicked = await evaluate(
    cdp,
    `(() => {
      const tab = Array.from(document.querySelectorAll('.tab-item, [role="tab"]')).find((node) =>
        /Cookie/i.test(node.textContent || '')
      );
      if (!tab) return false;
      tab.click();
      return true;
    })()`
  );
  checks.cookieTabOpened = await waitFor(
    cdp,
    `Boolean(document.querySelector('.cookie-login .token-input, .cookie-login textarea'))`,
    12000,
    250
  );
  await delay(800);
  checks.cookieTabState = await collectState(cdp);
  checks.cookieTabScreenshot = await captureScreenshot(cdp, 'login-cookie-tab');

  checks.guestEntryClicked = await evaluate(cdp, `(() => {
    const entry = document.querySelector('.guest-entry');
    if (!entry) return false;
    entry.click();
    return true;
  })()`);
  checks.guestReturnedHome = await waitFor(
    cdp,
    `location.hash === '#/' || location.hash === ''`,
    12000,
    250
  );
  await delay(800);
  checks.guestHomeState = await collectState(cdp);
  checks.guestHomeScreenshot = await captureScreenshot(cdp, 'guest-home');

  await evaluate(cdp, `window.location.hash = '#/set'; true;`);
  checks.settingsOpened = await waitFor(
    cdp,
    `location.hash === '#/set' && document.querySelector('h1')?.textContent?.trim() === '设置'`,
    15000,
    250
  );
  await delay(800);
  checks.settingsState = await collectState(cdp);
  checks.settingsScreenshot = await captureScreenshot(cdp, 'settings');

  checks.topLoginClicked = await evaluate(cdp, `(() => {
    const btn = document.querySelector('.user-btn');
    if (!btn) return false;
    btn.click();
    return true;
  })()`);
  checks.topLoginOpened = await waitFor(
    cdp,
    `location.hash === '#/login' && !!document.querySelector('.login-page .tab-item')`,
    12000,
    250
  );
  await delay(800);
  checks.topLoginState = await collectState(cdp);
  checks.topLoginScreenshot = await captureScreenshot(cdp, 'top-login');

  await evaluate(cdp, `window.location.hash = '#/set'; true;`);
  await waitFor(
    cdp,
    `location.hash === '#/set' && document.querySelector('h1')?.textContent?.trim() === '设置'`,
    15000,
    250
  );
  await delay(800);
  checks.cookieModalButtonClicked = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll('button')).find((node) =>
        /Cookie/.test((node.textContent || '').replace(/\\s+/g, ' ').trim())
      );
      if (!button) return false;
      button.click();
      return true;
    })()`
  );
  checks.cookieModalOpened = await waitFor(
    cdp,
    `Boolean(document.querySelector('.n-modal textarea, .n-modal input, .n-drawer textarea, .n-drawer input'))`,
    12000,
    250
  );
  await delay(800);
  checks.cookieModalState = await collectState(cdp);
  checks.cookieModalScreenshot = await captureScreenshot(cdp, 'cookie-modal');

  checks.pass = Boolean(
    checks.userRedirectedToLogin &&
      checks.cookieTabClicked &&
      checks.cookieTabOpened &&
      checks.settingsOpened &&
      checks.cookieModalButtonClicked &&
      checks.cookieModalOpened
  );

  const jsonPath = path.resolve('.tmp', `${outBase}.json`);
  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        exePath,
        outBase,
        pass: checks.pass,
        checks
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        jsonPath,
        pass: checks.pass,
        summary: {
          userRedirectedToLogin: checks.userRedirectedToLogin,
          cookieTabOpened: checks.cookieTabOpened,
          guestReturnedHome: checks.guestReturnedHome,
          settingsOpened: checks.settingsOpened,
          topLoginOpened: checks.topLoginOpened,
          cookieModalOpened: checks.cookieModalOpened,
          pass: checks.pass
        }
      },
      null,
      2
    )
  );

  if (!checks.pass) {
    throw new Error(`account journey smoke failed: ${JSON.stringify({
      userRedirectedToLogin: checks.userRedirectedToLogin,
      cookieTabClicked: checks.cookieTabClicked,
      cookieTabOpened: checks.cookieTabOpened,
      settingsOpened: checks.settingsOpened,
      cookieModalButtonClicked: checks.cookieModalButtonClicked,
      cookieModalOpened: checks.cookieModalOpened
    })}`);
  }
} finally {
  cdp?.close();
  await kill();
  await removeTempRootWithRetry();
}
