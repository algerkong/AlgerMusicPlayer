const { spawn } = await import('node:child_process');
const { existsSync } = await import('node:fs');
const { mkdtemp, mkdir, readFile, rm, writeFile } = await import('node:fs/promises');
const path = await import('node:path');

const appVersion = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')).version;

const exePath = process.env.AMPL_EXE_PATH
  ? path.resolve(process.env.AMPL_EXE_PATH)
  : path.resolve('.tmp', 'installer-smoke-x64-latest', 'AMPL Music.exe');
const outBase = process.env.AMPL_REAL_LOGIN_OUT_BASENAME || 'smoke-installed-real-login-closure';
const port = Number(process.env.AMPL_DEBUG_PORT || 9512);
const manualTimeoutMs = Number(process.env.AMPL_REAL_LOGIN_TIMEOUT_MS || 180000);
const progressPath = path.resolve('.tmp', `${outBase}-progress.json`);

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

async function writeJson(filePath, payload) {
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function reportProgress(stage, payload = {}) {
  const snapshot = {
    updatedAt: new Date().toISOString(),
    stage,
    exePath,
    outBase,
    port,
    manualTimeoutMs,
    ...payload
  };
  await writeJson(progressPath, snapshot);
  return snapshot;
}

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
  throw new Error(
    lastTargetError ? `target timeout after: ${lastTargetError}` : 'target timeout'
  );
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
    console.warn(`[qa:real-login] waitFor timeout after error: ${lastEvaluateError}`);
  }
  return false;
}

async function captureScreenshot(cdp, suffix) {
  const image = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const pngPath = path.resolve('.tmp', `${outBase}-${suffix}.png`);
  await writeFile(pngPath, Buffer.from(image.data, 'base64'));
  return pngPath;
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
  } catch (error) {
    return {
      pages: [],
      external: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function collectState(cdp) {
  return evaluate(
    cdp,
    `(() => {
      const parseJson = (value) => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      };
      const storedUser = parseJson(localStorage.getItem('user'));
      const loginType = localStorage.getItem('loginType');
      const token = localStorage.getItem('token');
      const uidLogin = localStorage.getItem('uidLogin') === 'true';
      const autoCookieNode = document.querySelector('.auto-cookie-status');
      const currentMenu = Array.from(
        document.querySelectorAll('.app-menu-item-link[aria-current="page"]')
      )
        .map((node) => node.textContent?.replace(/\\s+/g, ' ').trim())
        .filter(Boolean);
      const bodyPreview = document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 500) || '';
      const isLoggedIn = uidLogin ? Boolean(storedUser) : Boolean(token) && Boolean(storedUser);
      return {
        hash: location.hash,
        currentMenu,
        loginTitle: document.querySelector('#login-page-title')?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        userProfileTitle: document.querySelector('#user-profile-title')?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        topUserButtonText: document.querySelector('.user-btn')?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        autoCookieStatus: autoCookieNode
          ? {
              state: autoCookieNode.getAttribute('data-state') || '',
              text: autoCookieNode.textContent?.replace(/\\s+/g, ' ').trim() || ''
            }
          : null,
        storedLogin: {
          isLoggedIn,
          loginType,
          hasToken: Boolean(token),
          hasUser: Boolean(storedUser),
          userId: storedUser?.userId || null,
          nickname: storedUser?.nickname || null,
          uidLogin
        },
        buttonTexts: Array.from(document.querySelectorAll('button'))
          .map((node) => node.textContent?.replace(/\\s+/g, ' ').trim())
          .filter(Boolean)
          .slice(0, 80),
        bodyPreview
      };
    })()`
  );
}

async function waitForAutoCookieWindow(cdp, timeoutMs = 20000) {
  const successStates = new Set(['opened', 'focused-existing', 'cookie-detected', 'success']);
  const failureStates = new Set(['closed-without-cookie', 'open-failed', 'load-failed', 'failed']);
  const deadline = Date.now() + timeoutMs;
  const statusTimeline = [];
  let lastStateKey = '';
  let lastState = null;
  let externalWindow = null;
  let pagesSnapshot = [];
  const startedAt = Date.now();

  while (Date.now() < deadline) {
    const [status, pageSnapshot] = await Promise.all([collectState(cdp), readPages()]);
    lastState = status;
    pagesSnapshot = pageSnapshot.pages;
    if (!externalWindow && pageSnapshot.external) {
      externalWindow = pageSnapshot.external;
    }

    const stateKey = `${status.autoCookieStatus?.state || 'none'}:${status.autoCookieStatus?.text || ''}:${status.hash}`;
    if (stateKey !== lastStateKey) {
      lastStateKey = stateKey;
      const timelineEntry = {
        elapsedMs: Date.now() - startedAt,
        hash: status.hash,
        status: status.autoCookieStatus?.state || null,
        text: status.autoCookieStatus?.text || null,
        externalWindowDetected: Boolean(externalWindow)
      };
      statusTimeline.push(timelineEntry);
      console.error(
        `[qa:real-login] preflight status=${timelineEntry.status || 'none'} external=${timelineEntry.externalWindowDetected ? 'yes' : 'no'} hash=${timelineEntry.hash}`
      );
      await reportProgress('preflight', {
        waitingFor: 'login-window',
        latest: timelineEntry,
        externalWindow,
        pagesSnapshot,
        statusTimeline
      });
    }

    if (status.autoCookieStatus?.state && successStates.has(status.autoCookieStatus.state)) {
      return { ok: true, status, statusTimeline, externalWindow, pagesSnapshot };
    }

    if (status.autoCookieStatus?.state && failureStates.has(status.autoCookieStatus.state)) {
      return { ok: false, status, statusTimeline, externalWindow, pagesSnapshot };
    }

    await delay(250);
  }

  return { ok: false, status: lastState, statusTimeline, externalWindow, pagesSnapshot };
}

async function waitForAuthenticatedState(cdp, timeoutMs = manualTimeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const timeline = [];
  let lastStateKey = '';
  let lastState = null;
  const startedAt = Date.now();
  let lastHeartbeatAt = 0;

  while (Date.now() < deadline) {
    const state = await collectState(cdp);
    lastState = state;
    const elapsedMs = Date.now() - startedAt;
    const stateKey = JSON.stringify({
      hash: state.hash,
      autoCookieState: state.autoCookieStatus?.state || null,
      loginType: state.storedLogin.loginType,
      userId: state.storedLogin.userId,
      title: state.userProfileTitle,
      topUserButtonText: state.topUserButtonText
    });

    if (stateKey !== lastStateKey) {
      lastStateKey = stateKey;
      const timelineEntry = {
        elapsedMs,
        hash: state.hash,
        autoCookieState: state.autoCookieStatus?.state || null,
        loginType: state.storedLogin.loginType,
        userId: state.storedLogin.userId,
        nickname: state.storedLogin.nickname,
        userProfileTitle: state.userProfileTitle
      };
      timeline.push(timelineEntry);
      console.error(
        `[qa:real-login] auth state=${timelineEntry.autoCookieState || 'none'} loginType=${timelineEntry.loginType || 'none'} userId=${timelineEntry.userId || 'none'} hash=${timelineEntry.hash}`
      );
      await reportProgress('auth-wait', {
        waitingFor: 'authenticated-user-surface',
        latest: timelineEntry,
        state,
        timeline
      });
      lastHeartbeatAt = Date.now();
    }

    if (Date.now() - lastHeartbeatAt >= 10000) {
      console.error(
        `[qa:real-login] still waiting elapsed=${Math.round(elapsedMs / 1000)}s autoCookie=${state.autoCookieStatus?.state || 'none'} loginType=${state.storedLogin.loginType || 'none'} hash=${state.hash}`
      );
      await reportProgress('auth-wait', {
        waitingFor: 'authenticated-user-surface',
        heartbeat: true,
        elapsedMs,
        state,
        timeline
      });
      lastHeartbeatAt = Date.now();
    }

    const visibleLoggedIn =
      state.hash.startsWith('#/user') ||
      Boolean(state.userProfileTitle) ||
      state.currentMenu.some((label) => /用户/.test(label));

    if (
      state.storedLogin.isLoggedIn &&
      state.storedLogin.loginType &&
      state.storedLogin.loginType !== 'uid' &&
      visibleLoggedIn
    ) {
      return {
        pass: true,
        reason: 'authenticated',
        timeline,
        state
      };
    }

    if (
      state.autoCookieStatus?.state &&
      ['closed-without-cookie', 'open-failed', 'load-failed', 'failed'].includes(
        state.autoCookieStatus.state
      )
    ) {
      return {
        pass: false,
        reason: state.autoCookieStatus.state,
        timeline,
        state
      };
    }

    await delay(500);
  }

  return {
    pass: false,
    reason: 'timeout',
    timeline,
    state: lastState
  };
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
  await reportProgress('booting', {
    status: 'starting-installed-build'
  });
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

  await evaluate(cdp, `window.location.hash = '#/login'; true;`);
  const loginReady = await waitFor(
    cdp,
    `location.hash === '#/login' && !!document.querySelector('#login-page-title')`,
    15000,
    250
  );
  await delay(800);

  const cookieTabClicked = await evaluate(
    cdp,
    `(() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((node) =>
        /Cookie/.test(node.textContent || '')
      );
      if (!tab) return false;
      tab.click();
      return true;
    })()`
  );
  const cookieTabOpened = await waitFor(
    cdp,
    `Array.from(document.querySelectorAll('textarea,input')).some((node) =>
      /cookie/i.test((node.getAttribute('aria-label') || '') + ' ' + (node.getAttribute('placeholder') || ''))
    )`,
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

  const preflight = await waitForAutoCookieWindow(cdp);
  const windowOpenedScreenshot = await captureScreenshot(cdp, 'window-opened');

  if (!preflight.ok) {
    const payload = {
      exePath,
      outBase,
      port,
      manualTimeoutMs,
      pass: false,
      reason: 'window-not-opened',
      loginReady,
      cookieTabClicked,
      cookieTabOpened,
      autoButtonClicked,
      preflight,
      windowOpenedScreenshot
    };
    const jsonPath = path.resolve('.tmp', `${outBase}.json`);
    await writeJson(jsonPath, payload);
    await reportProgress('completed', {
      pass: false,
      reason: 'window-not-opened',
      jsonPath,
      payload
    });
    throw new Error(`real login preflight failed: ${JSON.stringify(payload)}`);
  }

  console.error(
    `[qa:real-login] Waiting up to ${Math.round(
      manualTimeoutMs / 1000
    )}s for manual sign-in in the external NetEase Cloud Music window.`
  );

  const authenticated = await waitForAuthenticatedState(cdp);
  const finalStateSuffix = authenticated.pass ? 'user-page' : 'final-state';
  const finalStateScreenshot = await captureScreenshot(cdp, finalStateSuffix);

  let settingsOpened = false;
  let settingsState = null;
  let settingsScreenshot = null;
  if (authenticated.pass) {
    await evaluate(cdp, `window.location.hash = '#/set'; true;`);
    settingsOpened = await waitFor(cdp, `location.hash === '#/set' && !!document.querySelector('h1')`);
    await delay(800);
    settingsState = await collectState(cdp);
    settingsScreenshot = await captureScreenshot(cdp, 'settings');
  }

  const jsonPath = path.resolve('.tmp', `${outBase}.json`);
  const payload = {
    exePath,
    outBase,
    port,
    manualTimeoutMs,
    pass: authenticated.pass,
    reason: authenticated.reason,
    loginReady,
    cookieTabClicked,
    cookieTabOpened,
    autoButtonClicked,
    preflight,
    authenticated,
    settingsOpened,
    settingsState,
    screenshots: {
      windowOpened: windowOpenedScreenshot,
      finalState: finalStateScreenshot,
      userPage: authenticated.pass ? finalStateScreenshot : null,
      settings: settingsScreenshot
    }
  };

  await writeJson(jsonPath, payload);
  await reportProgress('completed', {
    pass: authenticated.pass,
    reason: authenticated.reason,
    jsonPath,
    payload
  });

  if (!authenticated.pass) {
    throw new Error(`real login not completed: ${JSON.stringify(payload)}`);
  }

  console.log(JSON.stringify({ jsonPath, payload }, null, 2));
} finally {
  cdp?.close();
  await kill();
  await rm(tempRoot, { recursive: true, force: true });
}
