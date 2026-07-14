const { spawn } = await import('node:child_process');
const { mkdtemp, mkdir, readFile, rm, writeFile } = await import('node:fs/promises');
const { existsSync } = await import('node:fs');
const path = await import('node:path');

const appVersion = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')).version;

const exePath = process.env.AMPL_EXE_PATH
  ? path.resolve(process.env.AMPL_EXE_PATH)
  : path.resolve('dist', 'win-unpacked', 'AMPL Music.exe');
if (!existsSync(exePath)) throw new Error(`exe not found: ${exePath}`);
const outBase = process.env.AMPL_ROUTE_OUT_BASENAME || 'search-playback-smoke';
const port = Number(process.env.AMPL_DEBUG_PORT || 9408);
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
async function fetchJson(url) { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }
async function waitForTarget() {
  const end = Date.now() + 45000;
  while (Date.now() < end) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      const page = targets.find((target) => target?.type === 'page' && typeof target.webSocketDebuggerUrl === 'string' && !String(target.url || '').includes('#/lyric') && !String(target.url || '').startsWith('devtools://'));
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
    ws.addEventListener('error', (event) => reject(event.error || new Error('ws error')), { once: true });
  });
  ws.addEventListener('message', (event) => {
    const payload = JSON.parse(String(event.data));
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) reject(new Error(payload.error.message || JSON.stringify(payload.error))); else resolve(payload.result || {});
  });
  return {
    async send(method, params = {}) {
      await opened;
      const id = ++nextId;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() { ws.close(); }
  };
}
async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return result.result?.value;
}
async function waitForState(cdp, expression, predicate, timeoutMs, label) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    last = await evaluate(cdp, expression);
    if (predicate(last)) return last;
    await delay(500);
  }
  throw new Error(`${label} timeout: ${JSON.stringify(last)}`);
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
      window.__amplAuditEvents = [];
      const push = (type, payload) => {
        try {
          window.__amplAuditEvents.push({ type, payload, hash: location.hash, ts: Date.now() });
        } catch {
      // Ignore transient polling errors while the app is still loading.
    }
      };
      const originalConsoleError = console.error;
      console.error = (...args) => {
        push('console.error', args.map((item) => String(item)).join(' | '));
        return originalConsoleError.apply(console, args);
      };
      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        push('console.warn', args.map((item) => String(item)).join(' | '));
        return originalConsoleWarn.apply(console, args);
      };
    })();`
  });
  await cdp.send('Page.reload', { ignoreCache: true });
  await delay(2500);
  await evaluate(cdp, `window.location.hash = '#/search-result?keyword=%E5%91%A8%E6%9D%B0%E4%BC%A6&type=1'; true;`);
  await delay(4500);

  const beforeClick = await evaluate(cdp, `(() => ({
    hash: location.hash,
    firstSongTitle: document.querySelector('.standard-song-item .song-item-content-title')?.textContent?.trim() || '',
    playButtonCount: document.querySelectorAll('.song-item-operating-play').length,
    audioSrc: document.querySelector('audio')?.getAttribute('src') || '',
    audioCurrentSrc: document.querySelector('audio')?.currentSrc || '',
    buttons: Array.from(document.querySelectorAll('button')).map((node) => node.innerText?.replace(/\\s+/g, ' ').trim()).filter(Boolean).slice(0, 30)
  }))()`);

  const clickResult = await evaluate(cdp, `(() => {
    const button = document.querySelector('.song-item-operating-play');
    if (!button) return { clicked: false, reason: 'no-play-button' };
    const cardText = button.closest('.standard-song-item')?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 200) || '';
    button.click();
    return { clicked: true, cardText };
  })()`);

  const afterClick = await waitForState(
    cdp,
    `(() => ({
      hash: location.hash,
      bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2000) || '',
      audioExists: Boolean(document.querySelector('audio')),
      audioPaused: document.querySelector('audio')?.paused ?? null,
      audioSrc: document.querySelector('audio')?.getAttribute('src') || '',
      audioCurrentSrc: document.querySelector('audio')?.currentSrc || '',
      audioReadyState: document.querySelector('audio')?.readyState ?? null,
      playBarTitle: document.querySelector('#play-bar-current-song-title')?.textContent?.trim() || '',
      playBarArtistText: document.querySelector('#play-bar-current-song-artist')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
      playPauseAriaLabel: document.querySelector('.music-buttons-play')?.getAttribute('aria-label') || '',
      playPausePressed: document.querySelector('.music-buttons-play')?.getAttribute('aria-pressed') || '',
      firstRowPlayAriaLabel: document.querySelector('.standard-song-item .song-item-operating-play')?.getAttribute('aria-label') || '',
      playerButtons: Array.from(document.querySelectorAll('button')).map((node) => node.innerText?.replace(/\\s+/g, ' ').trim()).filter(Boolean).slice(-20),
      auditEvents: Array.isArray(window.__amplAuditEvents) ? window.__amplAuditEvents.slice(-20) : []
    }))()`,
    (state) =>
      state?.hash?.startsWith('#/search-result') &&
      state?.playBarTitle === beforeClick.firstSongTitle &&
      /pause|暂停/i.test(state?.playPauseAriaLabel || '') &&
      state?.playPausePressed === 'true' &&
      /pause|暂停/i.test(state?.firstRowPlayAriaLabel || ''),
    30_000,
    'search playback settled'
  );

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const pngPath = path.resolve('.tmp', `${outBase}.png`);
  const jsonPath = path.resolve('.tmp', `${outBase}.json`);
  await writeFile(pngPath, Buffer.from(screenshot.data, 'base64'));
  await writeFile(jsonPath, JSON.stringify({ exePath, beforeClick, clickResult, afterClick }, null, 2), 'utf8');
  console.log(JSON.stringify({ jsonPath, pngPath, beforeClick, clickResult, afterClick }, null, 2));
} finally {
  cdp?.close();
  await kill();
  await rm(tempRoot, { recursive: true, force: true });
}
