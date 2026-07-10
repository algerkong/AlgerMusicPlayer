const { spawn } = await import('node:child_process');
const { mkdtemp, mkdir, rm, writeFile } = await import('node:fs/promises');
const { existsSync } = await import('node:fs');
const path = await import('node:path');

const exePath = process.env.AMPL_EXE_PATH ? path.resolve(process.env.AMPL_EXE_PATH) : path.resolve('dist', 'win-unpacked', 'AMPL Music.exe');
if (!existsSync(exePath)) throw new Error(`exe not found: ${exePath}`);
const outBase = process.env.AMPL_ROUTE_OUT_BASENAME || 'theme-preset-smoke';
const port = Number(process.env.AMPL_DEBUG_PORT || 9410);
const tempRoot = await mkdtemp(path.join(path.resolve('.tmp'), `${outBase}-profile-`));
for (const dir of ['APPDATA', 'LOCALAPPDATA', 'TEMP']) await mkdir(path.join(tempRoot, dir), { recursive: true });
const child = spawn(exePath, [`--remote-debugging-port=${port}`], { env: { ...process.env, APPDATA: path.join(tempRoot, 'APPDATA'), LOCALAPPDATA: path.join(tempRoot, 'LOCALAPPDATA'), TEMP: path.join(tempRoot, 'TEMP'), TMP: path.join(tempRoot, 'TEMP') }, stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchJson(url) { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }
async function waitForTarget() { const end = Date.now() + 45000; while (Date.now() < end) { try { const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`); const page = targets.find((target) => target?.type === 'page' && typeof target.webSocketDebuggerUrl === 'string' && !String(target.url || '').includes('#/lyric') && !String(target.url || '').startsWith('devtools://')); if (page) return page; } catch {} await delay(500); } throw new Error('target timeout'); }
function createCdp(url) { const ws = new WebSocket(url); let nextId = 0; const pending = new Map(); const opened = new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', (event) => reject(event.error || new Error('ws error')), { once: true }); }); ws.addEventListener('message', (event) => { const payload = JSON.parse(String(event.data)); if (!payload.id || !pending.has(payload.id)) return; const { resolve, reject } = pending.get(payload.id); pending.delete(payload.id); if (payload.error) reject(new Error(payload.error.message || JSON.stringify(payload.error))); else resolve(payload.result || {}); }); return { async send(method, params = {}) { await opened; const id = ++nextId; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }, close() { ws.close(); } }; }
async function evaluate(cdp, expression) { const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return result.result?.value; }
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
async function kill() { if (!child?.pid) return; await new Promise((resolve) => { const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); killer.on('exit', resolve); killer.on('error', resolve); }); }
let cdp;
try {
  const DARK_CINEMA_ACCENT = '#f59e0b';
  const GALAXY_DREAM_ACCENT = '#8b5cf6';
  const target = await waitForTarget();
  cdp = createCdp(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { localStorage.clear(); localStorage.setItem('disclaimer_agreed_timestamp', '1720000000000'); localStorage.setItem('traffic_warning_dismissed', 'true'); localStorage.setItem('first_run_guide_dismissed', 'true'); })();` });
  await cdp.send('Page.reload', { ignoreCache: true });
  await delay(2500);
  await evaluate(cdp, `window.location.hash = '#/set'; true;`);
  await delay(3500);
  const before = await evaluate(cdp, `(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      hash: location.hash,
      accent: style.getPropertyValue('--ampl-accent').trim(),
      accentSoft: style.getPropertyValue('--ampl-accent-soft').trim(),
      presetLabels: Array.from(document.querySelectorAll('.theme-preset-card__name')).map((node) => node.textContent?.trim()).filter(Boolean),
      activePreset: document.querySelector('.theme-preset-card--active .theme-preset-card__name')?.textContent?.trim() || ''
    };
  })()`);
  const resetToDarkCinema = await evaluate(cdp, `(() => {
    const activeLabel = document.querySelector('.theme-preset-card--active .theme-preset-card__name')?.textContent?.trim() || '';
    if (activeLabel === 'Dark Cinema') {
      return { clicked: false, skipped: true, activeLabel };
    }
    const target = Array.from(document.querySelectorAll('.theme-preset-card')).find((node) => node.textContent?.includes('Dark Cinema'));
    if (!target) return { clicked: false, skipped: false, reason: 'dark-cinema-not-found', activeLabel };
    target.click();
    return { clicked: true, skipped: false, activeLabel, label: target.textContent?.replace(/\s+/g, ' ').trim() || '' };
  })()`);
  const stateBeforeSwitch = await waitForState(cdp, `(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      accent: style.getPropertyValue('--ampl-accent').trim(),
      accentSoft: style.getPropertyValue('--ampl-accent-soft').trim(),
      activePreset: document.querySelector('.theme-preset-card--active .theme-preset-card__name')?.textContent?.trim() || ''
    };
  })()`, (state) => state?.activePreset === 'Dark Cinema' && state?.accent.toLowerCase() === DARK_CINEMA_ACCENT, 20_000, 'dark cinema active');
  const switchResult = await evaluate(cdp, `(() => {
    const target = Array.from(document.querySelectorAll('.theme-preset-card')).find((node) => node.textContent?.includes('Galaxy Dream'));
    if (!target) return { clicked: false, reason: 'preset-not-found' };
    target.click();
    return { clicked: true, label: target.textContent?.replace(/\s+/g, ' ').trim() || '' };
  })()`);
  const after = await waitForState(cdp, `(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      accent: style.getPropertyValue('--ampl-accent').trim(),
      accentSoft: style.getPropertyValue('--ampl-accent-soft').trim(),
      activePreset: document.querySelector('.theme-preset-card--active .theme-preset-card__name')?.textContent?.trim() || '',
      bodyText: document.body?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 1200) || ''
    };
  })()`, (state) => state?.activePreset === 'Galaxy Dream' && state?.accent.toLowerCase() === GALAXY_DREAM_ACCENT, 20_000, 'galaxy dream active');
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const pngPath = path.resolve('.tmp', `${outBase}.png`);
  const jsonPath = path.resolve('.tmp', `${outBase}.json`);
  const payload = { exePath, before, resetToDarkCinema, stateBeforeSwitch, switchResult, after };
  await writeFile(pngPath, Buffer.from(screenshot.data, 'base64'));
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(JSON.stringify({ jsonPath, pngPath, ...payload }, null, 2));
} finally {
  cdp?.close();
  await kill();
  await rm(tempRoot, { recursive: true, force: true });
}
