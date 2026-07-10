const { spawn } = await import('node:child_process');
const { existsSync } = await import('node:fs');
const { mkdtemp, mkdir, readdir, rm, stat, writeFile } = await import('node:fs/promises');
const path = await import('node:path');

const exePath = process.env.AMPL_EXE_PATH
  ? path.resolve(process.env.AMPL_EXE_PATH)
  : path.resolve('dist', 'win-unpacked', 'AMPL Music.exe');
if (!existsSync(exePath)) throw new Error(`exe not found: ${exePath}`);

const outBase = process.env.AMPL_ROUTE_OUT_BASENAME || 'smoke-download-postactions';
const port = Number(process.env.AMPL_DEBUG_PORT || 9421);
const tempRoot = await mkdtemp(path.join(path.resolve('.tmp'), `${outBase}-profile-`));
const downloadDir = path.join(tempRoot, 'download-output');
for (const dir of ['APPDATA', 'LOCALAPPDATA', 'TEMP']) {
  await mkdir(path.join(tempRoot, dir), { recursive: true });
}
await mkdir(downloadDir, { recursive: true });

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
    } catch {}
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

const downloadDebugExpression = `window.api.downloadGetCompleted().then(async (completed) => {
  const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
  const downloadStore = pinia?._s?.get('download');
  const downloadButton = Array.from(document.querySelectorAll('.action-bar button')).find((node) =>
    node.querySelector('.ri-download-line')
  );
  return ({
    hash: location.hash,
    completedCount: completed.length,
    completed: completed.slice(0, 5).map((item) => ({ name: item.name, path: item.path })),
    queue: await window.api.downloadGetQueue(),
    failedCount: downloadStore?.failedCount ?? 0,
    taskStates: downloadStore
      ? Array.from(downloadStore.tasks.values()).map((item) => ({
          filename: item.filename,
          state: item.state,
          error: item.error || '',
          loaded: item.loaded ?? 0,
          total: item.total ?? 0
        }))
      : [],
    checkedCount: document.querySelectorAll(
      '.song-item-select input[type="checkbox"]:checked, .song-item-select .n-checkbox.n-checkbox--checked'
    ).length,
    downloadButtonDisabled: !!downloadButton?.disabled,
    downloadButtonLabel: downloadButton?.innerText?.replace(/\\s+/g, ' ').trim() || '',
    messageTexts: Array.from(document.querySelectorAll('.n-message')).map((node) =>
      node.innerText?.replace(/\\s+/g, ' ').trim() || ''
    ),
    auditEvents: Array.isArray(window.__amplAuditEvents) ? window.__amplAuditEvents.slice(-80) : [],
    downloadHooks: window.__amplDownloadHooks || null,
    bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2400) || ''
  });
})`;

async function kill() {
  if (!child?.pid) return;
  await new Promise((resolve) => {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    killer.on('exit', resolve);
    killer.on('error', resolve);
  });
}

async function listArtifacts(dirPath) {
  try {
    const entries = await readdir(dirPath);
    const files = [];
    for (const name of entries) {
      const fullPath = path.join(dirPath, name);
      const fileStat = await stat(fullPath);
      files.push({ name, size: fileStat.size, modifiedTime: fileStat.mtimeMs });
    }
    return files.sort((a, b) => b.modifiedTime - a.modifiedTime);
  } catch {
    return [];
  }
}

let cdp;
const pngPath = path.resolve('.tmp', `${outBase}.png`);
const jsonPath = path.resolve('.tmp', `${outBase}.json`);
const payload = {
  exePath,
  downloadDir,
  pass: false
};
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
      window.__amplAuditEvents = [];
      window.__amplDownloadHooks = {
        addBatchCalls: [],
        addCalls: [],
        ipcSends: []
      };
      const push = (type, payload) => {
        try {
          window.__amplAuditEvents.push({ type, payload, hash: location.hash, ts: Date.now() });
        } catch {}
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

      const patchDownloadHooks = () => {
        try {
          if (window.api?.downloadAddBatch && !window.__amplDownloadHooks.__patchedAddBatch) {
            const originalDownloadAddBatch = window.api.downloadAddBatch.bind(window.api);
            window.api.downloadAddBatch = async (downloadPayload) => {
              push('window.api.downloadAddBatch', {
                itemCount: Array.isArray(downloadPayload?.items) ? downloadPayload.items.length : 0,
                firstItem: downloadPayload?.items?.[0]
                  ? {
                      filename: downloadPayload.items[0].filename,
                      url: String(downloadPayload.items[0].url || '').slice(0, 120),
                      type: downloadPayload.items[0].type || ''
                    }
                  : null
              });
              window.__amplDownloadHooks.addBatchCalls.push({
                itemCount: Array.isArray(downloadPayload?.items) ? downloadPayload.items.length : 0,
                firstItemFilename: downloadPayload?.items?.[0]?.filename || '',
                ts: Date.now()
              });
              return await originalDownloadAddBatch(downloadPayload);
            };
            window.__amplDownloadHooks.__patchedAddBatch = true;
          }

          if (window.api?.downloadAdd && !window.__amplDownloadHooks.__patchedAdd) {
            const originalDownloadAdd = window.api.downloadAdd.bind(window.api);
            window.api.downloadAdd = async (downloadPayload) => {
              push('window.api.downloadAdd', {
                filename: downloadPayload?.filename || '',
                url: String(downloadPayload?.url || '').slice(0, 120),
                type: downloadPayload?.type || ''
              });
              window.__amplDownloadHooks.addCalls.push({
                filename: downloadPayload?.filename || '',
                ts: Date.now()
              });
              return await originalDownloadAdd(downloadPayload);
            };
            window.__amplDownloadHooks.__patchedAdd = true;
          }

          if (window.electron?.ipcRenderer?.send && !window.__amplDownloadHooks.__patchedIpcSend) {
            const originalSend = window.electron.ipcRenderer.send.bind(window.electron.ipcRenderer);
            window.electron.ipcRenderer.send = (channel, ...args) => {
              if (channel === 'set-store-value') {
                push('window.electron.ipcRenderer.send', {
                  channel,
                  key: args[0],
                  value: args[1]
                });
                window.__amplDownloadHooks.ipcSends.push({
                  channel,
                  key: args[0],
                  value: args[1],
                  ts: Date.now()
                });
              }
              return originalSend(channel, ...args);
            };
            window.__amplDownloadHooks.__patchedIpcSend = true;
          }
        } catch (error) {
          push('patchDownloadHooks.error', String(error));
        }
      };

      patchDownloadHooks();
      setTimeout(patchDownloadHooks, 0);
      document.addEventListener('DOMContentLoaded', patchDownloadHooks, { once: true });
    })();`
  });
  await cdp.send('Page.reload', { ignoreCache: true });
  await delay(2_500);

  payload.storeConfigDispatch = await evaluate(
    cdp,
    `(() => {
      window.electron?.ipcRenderer?.send('set-store-value', 'set.downloadPath', ${JSON.stringify(downloadDir)});
      window.electron?.ipcRenderer?.send('set-store-value', 'set.downloadSaveLyric', false);
      return {
        dispatched: true,
        downloadPath: ${JSON.stringify(downloadDir)}
      };
    })()`
  );
  await delay(1_000);
  payload.stateAfterStoreConfig = await evaluate(cdp, `(${downloadDebugExpression})`);

  await evaluate(cdp, `window.location.hash = '#/search-result?keyword=%E5%91%A8%E6%9D%B0%E4%BC%A6&type=1'; true;`);
  await waitForState(
    cdp,
    `(() => ({ songCount: document.querySelectorAll('.standard-song-item').length }))()`,
    (state) => state?.songCount >= 1,
    45_000,
    'search results ready'
  );

  const firstSelectMode = await evaluate(
    cdp,
    `(() => {
      const trigger = document.querySelector('.action-bar .ri-checkbox-multiple-line')?.closest('button');
      if (!trigger) return { opened: false, reason: 'select-trigger-missing' };
      trigger.click();
      return { opened: true };
    })()`
  );
  await delay(1_200);

  const firstSelectSong = await evaluate(
    cdp,
    `(() => {
      const container = document.querySelector('.standard-song-item .song-item-select');
      const checkboxInput = container?.querySelector('input[type="checkbox"]');
      const checkboxBox = container?.querySelector('.n-checkbox-box');
      const clickable = checkboxInput || checkboxBox || container;
      if (!clickable) {
        return { clicked: false, reason: 'first-checkbox-not-found' };
      }
      clickable.click();
      return {
        clicked: true,
        selectedTitle: document.querySelector('.standard-song-item .song-item-content-title')?.textContent?.trim() || '',
        checkedAfterClick: !!checkboxInput?.checked,
        checkedDomCount: document.querySelectorAll(
          '.song-item-select input[type="checkbox"]:checked, .song-item-select .n-checkbox.n-checkbox--checked'
        ).length,
        buttonLabels: Array.from(document.querySelectorAll('.action-bar button')).map((node) => node.innerText?.replace(/\\s+/g, ' ').trim() || '')
      };
    })()`
  );
  await delay(700);
  payload.firstSelectionState = await evaluate(cdp, `(${downloadDebugExpression})`);

  const firstDownload = await evaluate(
    cdp,
    `(() => {
      const downloadButton = Array.from(document.querySelectorAll('.action-bar button')).find((node) => node.querySelector('.ri-download-line'));
      if (!downloadButton) {
        return { clicked: false, reason: 'download-button-not-found' };
      }
      const label = downloadButton.innerText?.replace(/\\s+/g, ' ').trim() || '';
      const disabled = !!downloadButton.disabled;
      downloadButton.click();
      return { clicked: true, label, disabled };
    })()`
  );
  payload.stateImmediatelyAfterFirstDownloadClick = await evaluate(cdp, `(${downloadDebugExpression})`);

  const firstDownloadDispatchObserved = await waitForState(
    cdp,
    downloadDebugExpression,
    (state) =>
      (state?.downloadHooks?.addBatchCalls?.length ?? 0) > 0 ||
      (state?.downloadHooks?.addCalls?.length ?? 0) > 0 ||
      (state?.queue?.length ?? 0) > 0 ||
      state?.completedCount >= 1 ||
      state?.failedCount > 0 ||
      (state?.auditEvents || []).some((event) =>
        ['console.error', 'console.warn'].includes(event?.type)
      ),
    20_000,
    'first download dispatch observed'
  );

  const firstQueueSettled = await waitForState(
    cdp,
    downloadDebugExpression,
    (state) => state?.completedCount >= 1 || state?.failedCount > 0,
    120_000,
    'first download settled'
  );

  await evaluate(cdp, `window.location.hash = '#/downloads'; true;`);
  await delay(4_000);

  const downloadedState = await waitForState(
    cdp,
    `window.api.downloadGetCompleted().then(async (completed) => ({
      hash: location.hash,
      completedCount: completed.length,
      completed: completed.slice(0, 5).map((item) => ({ name: item.name, path: item.path })),
      bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2400) || ''
    }))`,
    (state) => state?.completedCount >= 1,
    30_000,
    'downloads page populated'
  );

  const playDownloaded = await evaluate(
    cdp,
    `(() => {
      const overlay = document.querySelector('.downloaded-item .absolute.inset-0');
      if (!overlay) return { clicked: false, reason: 'downloaded-play-overlay-missing' };
      const cardText = overlay.closest('.downloaded-item')?.innerText?.replace(/\\s+/g, ' ').trim() || '';
      overlay.click();
      return { clicked: true, cardText };
    })()`
  );
  await delay(2_500);

  const afterPlay = await evaluate(
    cdp,
    `(() => ({
      bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2400) || '',
      playButtonAria: document.querySelector('.music-buttons-play')?.getAttribute('aria-label') || '',
      auditEvents: Array.isArray(window.__amplAuditEvents) ? window.__amplAuditEvents.slice(-20) : []
    }))()`
  );

  const clearAll = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll('.action-bar button')).find((node) => node.querySelector('.ri-delete-bin-line'));
      if (!button) return { clicked: false, reason: 'clear-all-button-missing' };
      const label = button.innerText?.replace(/\\s+/g, ' ').trim() || '';
      button.click();
      return { clicked: true, label };
    })()`
  );
  await delay(1_000);
  const confirmClear = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll('.n-dialog .n-button')).find((node) => {
        const text = node.innerText?.replace(/\\s+/g, ' ').trim() || '';
        return text.includes('确定清空') || text.includes('Clear') || text.includes('Confirm');
      }) || Array.from(document.querySelectorAll('.n-dialog .n-button')).find((node) => node.className.includes('n-button--primary-type'));
      if (!button) return { clicked: false, reason: 'clear-confirm-button-missing', dialogText: document.querySelector('.n-dialog')?.innerText || '' };
      const label = button.innerText?.replace(/\\s+/g, ' ').trim() || '';
      button.click();
      return { clicked: true, label };
    })()`
  );

  const afterClear = await waitForState(
    cdp,
    `window.api.downloadGetCompleted().then(async (completed) => ({
      completedCount: completed.length,
      bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2400) || '',
      completed
    }))`,
    (state) => state?.completedCount === 0,
    30_000,
    'clear all applied'
  );

  await evaluate(cdp, `window.location.hash = '#/search-result?keyword=%E5%91%A8%E6%9D%B0%E4%BC%A6&type=1'; true;`);
  await waitForState(
    cdp,
    `(() => ({ songCount: document.querySelectorAll('.standard-song-item').length }))()`,
    (state) => state?.songCount >= 1,
    45_000,
    'search results ready for second download'
  );

  const secondSelectMode = await evaluate(
    cdp,
    `(() => {
      const trigger = document.querySelector('.action-bar .ri-checkbox-multiple-line')?.closest('button');
      if (!trigger) return { opened: false, reason: 'second-select-trigger-missing' };
      trigger.click();
      return { opened: true };
    })()`
  );
  await delay(1_200);

  const secondSelectSong = await evaluate(
    cdp,
    `(() => {
      const container = document.querySelector('.standard-song-item .song-item-select');
      const checkboxInput = container?.querySelector('input[type="checkbox"]');
      const checkboxBox = container?.querySelector('.n-checkbox-box');
      const clickable = checkboxInput || checkboxBox || container;
      if (!clickable) {
        return { clicked: false, reason: 'second-checkbox-not-found' };
      }
      clickable.click();
      return {
        clicked: true,
        selectedTitle: document.querySelector('.standard-song-item .song-item-content-title')?.textContent?.trim() || '',
        buttonLabels: Array.from(document.querySelectorAll('.action-bar button')).map((node) => node.innerText?.replace(/\\s+/g, ' ').trim() || '')
      };
    })()`
  );
  await delay(700);

  const secondDownload = await evaluate(
    cdp,
    `(() => {
      const downloadButton = Array.from(document.querySelectorAll('.action-bar button')).find((node) => node.querySelector('.ri-download-line'));
      if (!downloadButton) {
        return { clicked: false, reason: 'second-download-button-not-found' };
      }
      const label = downloadButton.innerText?.replace(/\\s+/g, ' ').trim() || '';
      downloadButton.click();
      return { clicked: true, label };
    })()`
  );

  const secondDownloadDispatchObserved = await waitForState(
    cdp,
    downloadDebugExpression,
    (state) =>
      (state?.downloadHooks?.addBatchCalls?.length ?? 0) >= 2 ||
      (state?.queue?.length ?? 0) > 0 ||
      state?.completedCount >= 1 ||
      state?.failedCount > 0,
    20_000,
    'second download dispatch observed'
  );

  const secondQueueSettled = await waitForState(
    cdp,
    downloadDebugExpression,
    (state) => state?.completedCount >= 1 || state?.failedCount > 0,
    120_000,
    'second download settled'
  );

  await evaluate(cdp, `window.location.hash = '#/downloads'; true;`);
  await delay(4_000);

  const deletePageReady = await waitForState(
    cdp,
    `window.api.downloadGetCompleted().then(async (completed) => ({
      completedCount: completed.length,
      completed: completed.slice(0, 5).map((item) => ({ name: item.name, path: item.path })),
      bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2400) || ''
    }))`,
    (state) => state?.completedCount >= 1,
    30_000,
    'downloads page repopulated'
  );

  const deleteOne = await evaluate(
    cdp,
    `(() => {
      const deleteButton = document.querySelector('.downloaded-item .ri-delete-bin-line')?.closest('button');
      if (!deleteButton) return { clicked: false, reason: 'single-delete-button-missing' };
      const cardText = deleteButton.closest('.downloaded-item')?.innerText?.replace(/\\s+/g, ' ').trim() || '';
      deleteButton.click();
      return { clicked: true, cardText };
    })()`
  );
  await delay(1_000);
  const confirmDelete = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll('.n-dialog .n-button')).find((node) => {
        const text = node.innerText?.replace(/\\s+/g, ' ').trim() || '';
        return text.includes('确定删除') || text.includes('Delete') || text.includes('Confirm');
      }) || Array.from(document.querySelectorAll('.n-dialog .n-button')).find((node) => node.className.includes('n-button--primary-type'));
      if (!button) return { clicked: false, reason: 'delete-confirm-button-missing', dialogText: document.querySelector('.n-dialog')?.innerText || '' };
      const label = button.innerText?.replace(/\\s+/g, ' ').trim() || '';
      button.click();
      return { clicked: true, label };
    })()`
  );

  const afterDelete = await waitForState(
    cdp,
    `window.api.downloadGetCompleted().then(async (completed) => ({
      completedCount: completed.length,
      completed: completed.slice(0, 5).map((item) => ({ name: item.name, path: item.path })),
      bodyText: document.body?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 2400) || ''
    }))`,
    (state) => state?.completedCount === 0,
    30_000,
    'single delete applied'
  );

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const downloadArtifacts = await listArtifacts(downloadDir);
  Object.assign(payload, {
    firstSelectMode,
    firstSelectSong,
    firstDownloadDispatchObserved,
    firstDownload,
    firstQueueSettled,
    downloadedState,
    playDownloaded,
    afterPlay,
    clearAll,
    confirmClear,
    afterClear,
    secondSelectMode,
    secondSelectSong,
    secondDownloadDispatchObserved,
    secondDownload,
    secondQueueSettled,
    deletePageReady,
    deleteOne,
    confirmDelete,
    afterDelete,
    downloadArtifacts,
    pass: true
  });
  await writeFile(pngPath, Buffer.from(screenshot.data, 'base64'));
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(JSON.stringify({ jsonPath, pngPath, payload }, null, 2));
} catch (error) {
  payload.pass = false;
  payload.error = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null
  };
  if (cdp) {
    try {
      payload.failureState = await evaluate(cdp, `(${downloadDebugExpression})`);
    } catch (captureError) {
      payload.failureStateCaptureError = String(captureError);
    }

    try {
      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(pngPath, Buffer.from(screenshot.data, 'base64'));
    } catch (screenshotError) {
      payload.failureScreenshotError = String(screenshotError);
    }
  }

  payload.downloadArtifacts = await listArtifacts(downloadDir);
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  throw error;
} finally {
  cdp?.close();
  await kill();
  try {
    await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch (error) {
    console.warn(`[cleanup] failed to remove temp root: ${tempRoot}`, error);
  }
}
