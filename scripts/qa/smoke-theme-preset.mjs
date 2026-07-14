const { spawn } = await import('node:child_process');
const { existsSync } = await import('node:fs');
const { mkdtemp, mkdir, readFile, rm, writeFile } = await import('node:fs/promises');
const path = await import('node:path');

const appVersion = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')).version;
const exePath = process.env.AMPL_EXE_PATH
  ? path.resolve(process.env.AMPL_EXE_PATH)
  : path.resolve('dist', 'win-unpacked', 'AMPL Music.exe');
const outBase = process.env.AMPL_ROUTE_OUT_BASENAME || 'theme-preset-smoke';
const port = Number(process.env.AMPL_DEBUG_PORT || 9410);

if (!existsSync(exePath)) throw new Error(`exe not found: ${exePath}`);

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
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function waitForTarget() {
  const deadline = Date.now() + 60_000;
  let lastError = null;
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
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }
  throw new Error(lastError ? `target timeout after: ${lastError}` : 'target timeout');
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

async function waitForState(cdp, expression, predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await evaluate(cdp, expression);
    if (predicate(last)) return last;
    await delay(500);
  }
  throw new Error(`${label} timeout: ${JSON.stringify(last)}`);
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

  await evaluate(cdp, `window.location.hash = '#/set'; true;`);
  const before = await waitForState(
    cdp,
    `(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      const settings = pinia?._s?.get('settings');
      return {
        hash: location.hash,
        settingsReady: Boolean(settings),
        title: document.querySelector('.setting-content h1, h1')?.textContent?.trim() || '',
        theme: settings?.theme || '',
        autoTheme: Boolean(settings?.setData?.autoTheme),
        manualTheme: settings?.setData?.manualTheme || '',
        htmlDark: document.documentElement.classList.contains('dark')
      };
    })()`,
    (state) => state?.hash === '#/set' && state?.settingsReady,
    20_000,
    'settings route ready'
  );

  const switchToDark = await evaluate(
    cdp,
    `(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      const settings = pinia?._s?.get('settings');
      if (!settings) return { applied: false, reason: 'settings-store-missing' };
      settings.setAutoTheme(false);
      if (settings.theme !== 'dark') settings.toggleTheme();
      return { applied: true, theme: settings.theme, autoTheme: settings.setData?.autoTheme };
    })()`
  );

  const darkState = await waitForState(
    cdp,
    `(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      const settings = pinia?._s?.get('settings');
      return {
        theme: settings?.theme || '',
        manualTheme: settings?.setData?.manualTheme || '',
        autoTheme: Boolean(settings?.setData?.autoTheme),
        htmlDark: document.documentElement.classList.contains('dark'),
        bodyClass: document.body.className || ''
      };
    })()`,
    (state) => state?.theme === 'dark' && state?.manualTheme === 'dark' && state?.htmlDark,
    12_000,
    'dark theme active'
  );

  const switchToLight = await evaluate(
    cdp,
    `(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      const settings = pinia?._s?.get('settings');
      if (!settings) return { applied: false, reason: 'settings-store-missing' };
      if (settings.theme !== 'light') settings.toggleTheme();
      return { applied: true, theme: settings.theme, autoTheme: settings.setData?.autoTheme };
    })()`
  );

  const lightState = await waitForState(
    cdp,
    `(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      const settings = pinia?._s?.get('settings');
      return {
        theme: settings?.theme || '',
        manualTheme: settings?.setData?.manualTheme || '',
        autoTheme: Boolean(settings?.setData?.autoTheme),
        htmlDark: document.documentElement.classList.contains('dark'),
        bodyClass: document.body.className || ''
      };
    })()`,
    (state) => state?.theme === 'light' && state?.manualTheme === 'light' && !state?.htmlDark,
    12_000,
    'light theme active'
  );

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const pngPath = path.resolve('.tmp', `${outBase}.png`);
  const jsonPath = path.resolve('.tmp', `${outBase}.json`);
  const payload = {
    exePath,
    pass: Boolean(switchToDark?.applied && darkState?.htmlDark && switchToLight?.applied && !lightState?.htmlDark),
    before,
    switchToDark,
    darkState,
    switchToLight,
    lightState
  };
  await writeFile(pngPath, Buffer.from(screenshot.data, 'base64'));
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  if (!payload.pass) {
    throw new Error(`theme switch smoke failed: ${JSON.stringify(payload)}`);
  }

  console.log(JSON.stringify({ jsonPath, pngPath, payload }, null, 2));
} finally {
  cdp?.close();
  await kill();
  await removeTempRootWithRetry();
}
