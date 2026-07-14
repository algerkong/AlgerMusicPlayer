const { spawn } = await import('node:child_process');
const { existsSync } = await import('node:fs');
const { mkdtemp, mkdir, readFile, rm, stat, writeFile } = await import('node:fs/promises');
const path = await import('node:path');

const appVersion = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')).version;

const exePath = process.env.AMPL_EXE_PATH
  ? path.resolve(process.env.AMPL_EXE_PATH)
  : path.resolve('dist', 'win-unpacked', 'AMPL Music.exe');
if (!existsSync(exePath)) throw new Error(`exe not found: ${exePath}`);

const outBase = process.env.AMPL_ROUTE_OUT_BASENAME || 'smoke-local-music-health-repair';
const port = Number(process.env.AMPL_DEBUG_PORT || 9431);
const tempBase = path.resolve('.tmp');
await mkdir(tempBase, { recursive: true });
const tempRoot = await mkdtemp(path.join(tempBase, `${outBase}-profile-`));
const sampleDir = path.join(tempRoot, 'sample-local-music');
const sampleFilePath = path.join(sampleDir, 'ampl_local_health_smoke.wav');

for (const dir of ['APPDATA', 'LOCALAPPDATA', 'TEMP']) {
  await mkdir(path.join(tempRoot, dir), { recursive: true });
}
await mkdir(sampleDir, { recursive: true });

function createSampleWavBuffer(frequency = 440) {
  const sampleRate = 16_000;
  const durationSeconds = 1;
  const totalSamples = sampleRate * durationSeconds;
  const dataSize = totalSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < totalSamples; index += 1) {
    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.25 * 0x7fff;
    buffer.writeInt16LE(Math.round(sample), 44 + index * 2);
  }
  return buffer;
}

await writeFile(sampleFilePath, createSampleWavBuffer(440));

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
  const end = Date.now() + 45_000;
  while (Date.now() < end) {
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
    ws.addEventListener(
      'error',
      (event) => reject(event.error || new Error('ws error')),
      { once: true }
    );
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
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    last = await evaluate(cdp, expression);
    if (predicate(last)) return last;
    await delay(750);
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
    })();`
  });
  await cdp.send('Page.reload', { ignoreCache: true });
  await delay(2_500);

  const clearIndexedDbResult = await evaluate(
    cdp,
    `new Promise((resolve) => {
      try {
        const request = indexedDB.deleteDatabase('localMusicDB');
        request.onsuccess = () => resolve({ deleted: true });
        request.onerror = () => resolve({ deleted: false, error: String(request.error || 'delete-error') });
        request.onblocked = () => resolve({ deleted: false, blocked: true });
      } catch (error) {
        resolve({ deleted: false, error: String(error) });
      }
    })`
  );

  await evaluate(cdp, `window.location.hash = '#/local-music'; true;`);

  const routeReady = await waitForState(
    cdp,
    `(() => ({
      hash: location.hash,
      title: document.getElementById('local-music-page-title')?.textContent?.trim() || ''
    }))()`,
    (state) => state?.hash === '#/local-music' && state?.title.length > 0,
    20_000,
    'local music route ready'
  );

  const firstScan = await evaluate(
    cdp,
    `(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      const store = pinia?._s?.get('localMusic');
      if (!store) return { scanned: false, reason: 'localMusic-store-missing' };
      return (async () => {
        if (!store.folderPaths.includes(${JSON.stringify(sampleDir)})) {
          store.addFolder(${JSON.stringify(sampleDir)});
        }
        await store.scanFolder(${JSON.stringify(sampleDir)});
        await store.checkLibraryHealth();
        return {
          scanned: true,
          folderPaths: [...store.folderPaths],
          songCount: store.musicList.length,
          firstSongTitle: store.musicList[0]?.title || '',
          lastScanSummary: store.lastScanSummary || null
        };
      })();
    })()`
  );

  const afterFirstScan = await waitForState(
    cdp,
    `(() => {
      const persisted = localStorage.getItem('local-music-store');
      return {
        songCount: document.querySelectorAll('.standard-song-item').length,
        bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2200) || '',
        persistedStore: persisted ? JSON.parse(persisted) : null
      };
    })()`,
    (state) => state?.songCount === 1,
    30_000,
    'first scan visible'
  );

  await rm(sampleDir, { recursive: true, force: true });

  const removedFolderStats = {
    existsAfterRemoval: existsSync(sampleDir)
  };

  const triggerRescan = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll('button')).find((node) => {
        const label = node.getAttribute('aria-label') || '';
        return label.includes('重新扫描') || label.includes('Rescan') || label.includes('再扫描');
      });
      if (!button) {
        return { clicked: false, reason: 'top-rescan-button-missing' };
      }
      const label = button.getAttribute('aria-label') || '';
      button.click();
      return { clicked: true, label };
    })()`
  );

  const afterFolderMissing = await waitForState(
    cdp,
    `(() => {
      const persisted = localStorage.getItem('local-music-store');
      return {
        songCount: document.querySelectorAll('.standard-song-item').length,
        bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2800) || '',
        persistedStore: persisted ? JSON.parse(persisted) : null,
        auditEvents: Array.isArray(window.__amplAuditEvents) ? window.__amplAuditEvents.slice(-20) : []
      };
    })()`,
    (state) =>
      state?.persistedStore?.folderHealthMap?.[sampleDir]?.status === 'error' &&
      /失效|异常|清理|目录|repair|invalid/i.test(state?.bodyText || ''),
    60_000,
    'missing folder state visible'
  );

  const repairButtonReady = await waitForState(
    cdp,
    `(() => ({
      exists: Boolean(document.querySelector('[data-local-music-action="repair-library-health"]')),
      bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2400) || ''
    }))()`,
    (state) => state?.exists,
    20_000,
    'repair button visible'
  );

  const repairLibrary = await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector('[data-local-music-action="repair-library-health"]')
        || Array.from(document.querySelectorAll('button')).find((node) => {
          const text = node.innerText?.replace(/\\s+/g, ' ').trim() || '';
          const ariaLabel = node.getAttribute('aria-label') || '';
          return (
            text.includes('清理失效文件') ||
            text.includes('Repair') ||
            text.includes('Clean') ||
            ariaLabel.includes('清理失效文件') ||
            ariaLabel.includes('Repair') ||
            ariaLabel.includes('Clean')
          );
        });
      if (!button) {
        return {
          clicked: false,
          reason: 'repair-button-missing',
          candidates: Array.from(document.querySelectorAll('button')).map((node) => ({
            text: node.innerText?.replace(/\\s+/g, ' ').trim() || '',
            ariaLabel: node.getAttribute('aria-label') || ''
          }))
        };
      }
      const label = button.innerText?.replace(/\\s+/g, ' ').trim() || '';
      button.click();
      return { clicked: true, label };
    })()`
  );

  const afterRepair = await waitForState(
    cdp,
    `(() => {
      const persisted = localStorage.getItem('local-music-store');
      return {
        songCount: document.querySelectorAll('.standard-song-item').length,
        bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2800) || '',
        persistedStore: persisted ? JSON.parse(persisted) : null,
        auditEvents: Array.isArray(window.__amplAuditEvents) ? window.__amplAuditEvents.slice(-20) : []
      };
    })()`,
    (state) =>
      state?.songCount === 0 &&
      /失效|异常|扫描文件夹|空的|暂无本地音乐|管理文件夹/i.test(state?.bodyText || ''),
    40_000,
    'library repair applied'
  );

  const openManager = await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector('.ri-folder-settings-line')?.closest('button');
      if (!button) return { clicked: false, reason: 'folder-manager-button-missing' };
      button.click();
      return { clicked: true };
    })()`
  );

  const managerReady = await waitForState(
    cdp,
    `(() => ({
      drawerVisible: Boolean(document.querySelector('.n-drawer')),
      drawerText: document.querySelector('.n-drawer')?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 1800) || '',
      drawerButtons: Array.from(document.querySelectorAll('.n-drawer button')).map((node) => ({
        text: node.innerText?.replace(/\\s+/g, ' ').trim() || '',
        ariaLabel: node.getAttribute('aria-label') || ''
      }))
    }))()`,
    (state) => state?.drawerVisible,
    20_000,
    'folder manager visible'
  );

  const removeMissingFolder = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll('.n-drawer button')).find((node) => {
        const label = node.getAttribute('aria-label') || '';
        return label.includes(${JSON.stringify(sampleDir)}) && (label.includes('删除') || label.includes('Delete'));
      }) || document.querySelector('.n-drawer .ri-delete-bin-line')?.closest('button');
      if (!button) {
        return { clicked: false, reason: 'remove-missing-folder-button-missing' };
      }
      const ariaLabel = button.getAttribute('aria-label') || '';
      button.click();
      return { clicked: true, ariaLabel };
    })()`
  );

  const afterRemove = await waitForState(
    cdp,
    `(() => {
      const persisted = localStorage.getItem('local-music-store');
      return {
        songCount: document.querySelectorAll('.standard-song-item').length,
        bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2800) || '',
        persistedStore: persisted ? JSON.parse(persisted) : null,
        auditEvents: Array.isArray(window.__amplAuditEvents) ? window.__amplAuditEvents.slice(-20) : []
      };
    })()`,
    (state) =>
      (state?.persistedStore?.folderPaths?.length || 0) === 0 &&
      state?.songCount === 0,
    30_000,
    'missing folder removed'
  );

  const sampleFileStats = await stat(sampleFilePath).catch(() => null);
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const pngPath = path.resolve('.tmp', `${outBase}.png`);
  const jsonPath = path.resolve('.tmp', `${outBase}.json`);
  const payload = {
    exePath,
    sampleDir,
    sampleFilePath,
    sampleFileSize: sampleFileStats?.size ?? null,
    clearIndexedDbResult,
    routeReady,
    firstScan,
    afterFirstScan,
    removedFolderStats,
    triggerRescan,
    afterFolderMissing,
    openManager,
    managerReady,
    repairButtonReady,
    repairLibrary,
    afterRepair,
    removeMissingFolder,
    afterRemove
  };
  await writeFile(pngPath, Buffer.from(screenshot.data, 'base64'));
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(JSON.stringify({ jsonPath, pngPath, payload }, null, 2));
} finally {
  cdp?.close();
  await kill();
  try {
    await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch (error) {
    console.warn(`[cleanup] failed to remove temp root: ${tempRoot}`, error);
  }
}
