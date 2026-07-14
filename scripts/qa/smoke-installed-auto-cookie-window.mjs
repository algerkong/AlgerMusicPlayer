const { spawn } = await import('node:child_process');
const { existsSync } = await import('node:fs');
const { mkdtemp, mkdir, readFile, rm, writeFile } = await import('node:fs/promises');
const path = await import('node:path');

const appVersion = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')).version;

const exePath = process.env.AMPL_EXE_PATH
  ? path.resolve(process.env.AMPL_EXE_PATH)
  : path.resolve('.tmp', 'installer-smoke-x64-latest', 'AMPL Music.exe');
const outBase = process.env.AMPL_AUTO_COOKIE_OUT_BASENAME || 'smoke-installed-auto-cookie-window';
const port = Number(process.env.AMPL_DEBUG_PORT || 9496);

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
  let lastTargetError = null;
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
      lastTargetError = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }
  throw new Error(lastTargetError ? `target timeout after: ${lastTargetError}` : 'target timeout');
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
  let lastEvaluateError = null;
  while (Date.now() < deadline) {
    try {
      const value = await evaluate(cdp, expression);
      if (value) return true;
    } catch (error) {
      lastEvaluateError = error instanceof Error ? error.message : String(error);
    }
    await delay(intervalMs);
  }
  if (lastEvaluateError) {
    console.warn(`[qa:auto-cookie] waitFor timeout after error: ${lastEvaluateError}`);
  }
  return false;
}

async function collectState(cdp) {
  return evaluate(
    cdp,
    `(() => ({
      hash: location.hash,
      tabs: Array.from(document.querySelectorAll('.tab-item, [role="tab"]')).map((node) => ({
        text: node.textContent?.replace(/\\s+/g, ' ').trim() || '',
        selected: node.classList.contains('active') ? 'true' : node.getAttribute('aria-selected')
      })),
      autoCookieStatus: (() => {
        const node = document.querySelector('.auto-cookie-status');
        if (!node) return null;
        return {
          state: node.getAttribute('data-state') || '',
          text: node.textContent?.replace(/\\s+/g, ' ').trim() || ''
        };
      })(),
      buttonTexts: Array.from(document.querySelectorAll('button'))
        .map((node) => node.textContent?.replace(/\\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 40)
    }))()`
  );
}

async function readAutoCookieStatus(cdp) {
  return evaluate(
    cdp,
    `(() => {
      const node = document.querySelector('.auto-cookie-status');
      if (!node) return null;
      return {
        state: node.getAttribute('data-state') || '',
        text: node.textContent?.replace(/\\s+/g, ' ').trim() || ''
      };
    })()`
  );
}

async function readPages() {
  try {
    const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    const pages = targets.filter(
      (target) =>
        target?.type === 'page' &&
        typeof target.webSocketDebuggerUrl === 'string' &&
        !String(target.url || '').includes('#/lyric') &&
        !String(target.url || '').startsWith('devtools://')
    );
    const external = pages.find((target) => /music\.163\.com/i.test(String(target.url || '')));
    return {
      pages: pages.map((page) => ({ title: page.title, url: page.url })),
      external: external
        ? {
            title: external.title,
            url: external.url
          }
        : null
    };
  } catch {
    return { pages: [], external: null };
  }
}

async function waitForAutoCookieSignals(cdp, timeoutMs = 20000) {
  const successStates = new Set(['opened', 'focused-existing', 'cookie-detected', 'success']);
  const failureStates = new Set(['closed-without-cookie', 'open-failed', 'load-failed', 'failed']);
  const deadline = Date.now() + timeoutMs;
  const statusTimeline = [];
  let lastStateKey = '';
  let lastStatus = null;
  let externalWindow = null;
  let pagesSnapshot = [];
  const startedAt = Date.now();

  while (Date.now() < deadline) {
    const [status, pageSnapshot] = await Promise.all([readAutoCookieStatus(cdp), readPages()]);
    lastStatus = status;
    pagesSnapshot = pageSnapshot.pages;
    if (!externalWindow && pageSnapshot.external) {
      externalWindow = pageSnapshot.external;
    }

    const stateKey = status ? `${status.state}:${status.text}` : 'none';
    if (stateKey !== lastStateKey) {
      lastStateKey = stateKey;
      statusTimeline.push({
        elapsedMs: Date.now() - startedAt,
        status: status?.state || null,
        text: status?.text || null,
        externalWindowDetected: Boolean(externalWindow)
      });
    }

    if (status?.state && (successStates.has(status.state) || failureStates.has(status.state))) {
      return { status, statusTimeline, externalWindow, pagesSnapshot };
    }

    await delay(250);
  }

  return { status: lastStatus, statusTimeline, externalWindow, pagesSnapshot };
}

function hasElapsedSecondsIndicator(status) {
  if (!status?.text) return false;
  if (!['opened', 'focused-existing'].includes(status.state || '')) return false;
  return /[0-9]+s$/.test(status.text);
}

async function waitForElapsedIndicator(cdp, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;
  const timeline = [];
  let lastStateKey = '';
  let lastStatus = null;

  while (Date.now() < deadline) {
    const status = await readAutoCookieStatus(cdp);
    lastStatus = status;
    const stateKey = status ? `${status.state}:${status.text}` : 'none';

    if (stateKey !== lastStateKey) {
      lastStateKey = stateKey;
      timeline.push({
        elapsedMs: timeoutMs - Math.max(0, deadline - Date.now()),
        status: status?.state || null,
        text: status?.text || null
      });
    }

    if (hasElapsedSecondsIndicator(status)) {
      return {
        observed: true,
        status,
        timeline
      };
    }

    if (
      status?.state &&
      ['cookie-detected', 'success', 'closed-without-cookie', 'open-failed', 'load-failed', 'failed'].includes(
        status.state
      )
    ) {
      return {
        observed: false,
        skipped: ['cookie-detected', 'success'].includes(status.state),
        status,
        timeline
      };
    }

    await delay(250);
  }

  return {
    observed: false,
    skipped: false,
    status: lastStatus,
    timeline
  };
}

async function captureScreenshot(cdp) {
  const image = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const pngPath = path.resolve('.tmp', `${outBase}.png`);
  await writeFile(pngPath, Buffer.from(image.data, 'base64'));
  return pngPath;
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

  await evaluate(cdp, `window.location.hash = '#/user'; true;`);
  const loginReady = await waitFor(
    cdp,
    `location.hash === '#/login' && !!document.querySelector('.login-page .login-tabs .tab-item')`,
    15000,
    250
  );
  await delay(1000);

  const cookieTabClicked = await evaluate(
    cdp,
    `(() => {
    const candidates = Array.from(document.querySelectorAll('.tab-item, [role="tab"], button'));
    const tab = candidates.find((node) => /Cookie/i.test(node.textContent || ''));
    if (!tab) return false;
    tab.click();
    return true;
  })()`
  );
  const cookieTabOpened = await waitFor(
    cdp,
    `Boolean(document.querySelector('.cookie-login .token-input, .cookie-login textarea'))`,
    12000,
    250
  );
  await delay(800);

  const autoButtonClicked = await evaluate(
    cdp,
    `(() => {
    const button = document.querySelector('.btn-auto-cookie');
    if (!button) return false;
    button.click();
    return true;
  })()`
  );

  const signalResult = await waitForAutoCookieSignals(cdp);
  const waitIndicator =
    signalResult.status?.state && ['opened', 'focused-existing'].includes(signalResult.status.state)
      ? await waitForElapsedIndicator(cdp)
      : {
          observed: false,
          skipped: true,
          status: signalResult.status,
          timeline: []
        };
  const finalState = await collectState(cdp);
  const pngPath = await captureScreenshot(cdp);
  const jsonPath = path.resolve('.tmp', `${outBase}.json`);

  const basePass = Boolean(
    signalResult.status?.state &&
    ['opened', 'focused-existing', 'cookie-detected', 'success'].includes(signalResult.status.state)
  );
  const waitIndicatorPass = waitIndicator.skipped || waitIndicator.observed;
  const pass = Boolean(basePass && waitIndicatorPass);

  const payload = {
    exePath,
    outBase,
    port,
    pass,
    loginReady,
    cookieTabClicked,
    cookieTabOpened,
    autoButtonClicked,
    status: signalResult.status,
    statusTimeline: signalResult.statusTimeline,
    waitIndicator,
    externalWindow: signalResult.externalWindow,
    pagesSnapshot: signalResult.pagesSnapshot,
    finalState
  };

  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  if (!pass) {
    throw new Error(`auto cookie signal not observed: ${JSON.stringify(payload)}`);
  }

  console.log(JSON.stringify({ jsonPath, pngPath, payload }, null, 2));
} finally {
  cdp?.close();
  await kill();
  await rm(tempRoot, { recursive: true, force: true });
}
