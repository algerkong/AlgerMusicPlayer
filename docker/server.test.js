'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { rewriteContainerIndex } = require('./prepare-static');
const { sanitizeNcmDependency } = require('./sanitize-dependencies');

const {
  checkTcpPort,
  createApp,
  ensureAnonymousToken,
  filterHopByHopHeaders,
  normalizeMusicRequest,
  normalizePlayableResult,
  parseMusicSources
} = require('./server');

const silentLogger = {
  error() {},
  info() {}
};

const validMusicRequest = {
  id: 347230,
  song: {
    name: '海阔天空',
    alias: ['Boundless Oceans Vast Skies'],
    duration: 326_000,
    album: { id: 31_234, name: '乐与怒' },
    artists: [{ id: 11_111, name: 'Beyond' }]
  }
};

function listen(serverOrApp) {
  return new Promise((resolve, reject) => {
    const isExpressApp = typeof serverOrApp === 'function';
    const server = isExpressApp ? serverOrApp.listen(0, '127.0.0.1') : serverOrApp;

    const handleError = (error) => {
      server.off('listening', handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off('error', handleError);
      resolve(server);
    };

    if (server.listening) {
      resolve(server);
      return;
    }

    server.once('error', handleError);
    server.once('listening', handleListening);
    if (!isExpressApp) server.listen(0, '127.0.0.1');
  });
}

function close(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve) => server.close(resolve));
}

function request(server, options = {}) {
  const body = options.body;
  const headers = { ...(options.headers || {}) };
  if (body !== undefined && headers['content-length'] === undefined) {
    headers['content-length'] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const clientRequest = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        path: options.path || '/',
        method: options.method || 'GET',
        headers
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      }
    );
    clientRequest.once('error', reject);
    if (body !== undefined) clientRequest.write(body);
    clientRequest.end();
  });
}

function jsonRequest(server, pathName, body, options = {}) {
  return request(server, {
    ...options,
    path: pathName,
    method: options.method || 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
}

function createTestApp(options = {}) {
  return createApp({
    match: async () => ({ url: 'https://example.test/song.mp3' }),
    sources: ['migu', 'kugou', 'kuwo', 'pyncmd'],
    readinessCheck: async () => true,
    staticDirectory: null,
    logger: silentLogger,
    ...options
  });
}

test('ensureAnonymousToken creates the token before dependency loading without truncating it', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'alger-token-test-'));

  try {
    const tokenPath = ensureAnonymousToken({ tempDirectory: temporaryDirectory });
    assert.equal(tokenPath, path.join(temporaryDirectory, 'anonymous_token'));
    assert.equal(fs.readFileSync(tokenPath, 'utf8'), '');

    fs.writeFileSync(tokenPath, 'existing-token');
    ensureAnonymousToken({ tempDirectory: temporaryDirectory });
    assert.equal(fs.readFileSync(tokenPath, 'utf8'), 'existing-token');
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('rewriteContainerIndex roots entry assets for SPA fallback routes', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'alger-index-test-'));
  const indexPath = path.join(temporaryDirectory, 'index.html');

  try {
    fs.writeFileSync(
      indexPath,
      '<link href="./assets/app.css"><script src="./assets/app.js"></script><a href="#/home">home</a>'
    );
    rewriteContainerIndex(indexPath);
    assert.equal(
      fs.readFileSync(indexPath, 'utf8'),
      '<link href="/assets/app.css"><script src="/assets/app.js"></script><a href="#/home">home</a>'
    );
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('sanitizeNcmDependency removes bundled cookies and sensitive request logging', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'alger-dependency-test-'));
  const utilityDirectory = path.join(temporaryDirectory, 'util');
  const configDirectory = path.join(temporaryDirectory, 'config');
  const handlerPath = path.join(utilityDirectory, 'biliApiHandler.js');
  const optionPath = path.join(utilityDirectory, 'option.js');
  const serverPath = path.join(temporaryDirectory, 'server.js');
  const cookiePath = path.join(configDirectory, 'bilibili_cookie.txt');

  try {
    fs.mkdirSync(utilityDirectory, { recursive: true });
    fs.mkdirSync(configDirectory, { recursive: true });
    fs.writeFileSync(
      handlerPath,
      "console.log('before')\n  console.log('defaultCookieString', defaultCookieString)\nconsole.log('after')\n"
    );
    fs.writeFileSync(
      serverPath,
      "console.log('[OK]', decode(req.originalUrl))\nconsole.log('[ERR]', decode(req.originalUrl))\n"
    );
    fs.writeFileSync(
      optionPath,
      [
        "const createOption = (query, crypto = '') => ({",
        "  crypto: query.crypto || crypto || '',",
        '  cookie: query.cookie,',
        "  ua: query.ua || '',",
        '  proxy: query.proxy,',
        '  realIP: query.realIP,',
        "  domain: query.domain || '',",
        '})'
      ].join('\n')
    );
    fs.writeFileSync(cookiePath, 'sensitive-cookie');

    sanitizeNcmDependency(temporaryDirectory);

    assert.doesNotMatch(fs.readFileSync(handlerPath, 'utf8'), /defaultCookieString',/);
    assert.match(fs.readFileSync(handlerPath, 'utf8'), /before[\s\S]*after/);
    assert.equal((fs.readFileSync(serverPath, 'utf8').match(/req\.path/g) || []).length, 2);
    assert.doesNotMatch(fs.readFileSync(serverPath, 'utf8'), /originalUrl/);
    const optionSource = fs.readFileSync(optionPath, 'utf8');
    assert.doesNotMatch(optionSource, /query\.(?:crypto|ua|proxy|realIP|domain)/);
    assert.match(optionSource, /cookie: query\.cookie/);
    assert.match(optionSource, /crypto: crypto \|\| ''/);
    assert.equal(fs.existsSync(cookiePath), false);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('parseMusicSources defaults, normalizes, deduplicates, and rejects unsupported values', () => {
  assert.deepEqual(parseMusicSources(), ['migu', 'kugou', 'kuwo', 'pyncmd']);
  assert.deepEqual(parseMusicSources(' KUWO, migu,kuwo '), ['kuwo', 'migu']);
  assert.throws(() => parseMusicSources('qq,migu'), /unsupported source/);
  assert.throws(() => parseMusicSources(','), /unsupported source/);
});

test('normalizePlayableResult accepts web URLs and upgrades insecure media URLs', () => {
  assert.deepEqual(
    normalizePlayableResult({ url: 'http://media.example.test/song.mp3', br: 128_000 }),
    {
      url: 'http://media.example.test/song.mp3',
      br: 128_000
    }
  );
  assert.deepEqual(
    normalizePlayableResult(
      { url: 'http://media.example.test/song.mp3', br: 128_000 },
      { upgradeInsecure: true }
    ),
    {
      url: 'https://media.example.test/song.mp3',
      br: 128_000
    }
  );
  assert.deepEqual(normalizePlayableResult({ url: 'https://media.example.test/song.mp3' }), {
    url: 'https://media.example.test/song.mp3'
  });
  assert.equal(normalizePlayableResult({ url: 'file:///etc/passwd' }), null);
  assert.equal(normalizePlayableResult({ url: 'not a URL' }), null);
});

test('normalizeMusicRequest strictly validates and normalizes the canonical shape', () => {
  const normalized = normalizeMusicRequest({
    id: '347230',
    song: {
      name: '  海阔天空  ',
      alias: ['  Boundless Oceans Vast Skies  ', ''],
      duration: '326000',
      album: { id: '31234', name: ' 乐与怒 ' },
      artists: [{ id: '11111', name: ' Beyond ' }]
    }
  });

  assert.deepEqual(normalized, {
    id: 347_230,
    song: {
      name: '海阔天空',
      alias: ['Boundless Oceans Vast Skies', ''],
      duration: 326_000,
      album: { id: 31_234, name: '乐与怒' },
      artists: [{ id: 11_111, name: 'Beyond' }]
    }
  });

  assert.throws(
    () => normalizeMusicRequest({ ...validMusicRequest, sources: ['migu'] }),
    /unsupported field/
  );
  assert.throws(() => normalizeMusicRequest({ ...validMusicRequest, id: 0 }), /safe integer/);
  assert.throws(
    () =>
      normalizeMusicRequest({
        ...validMusicRequest,
        song: { ...validMusicRequest.song, album: { id: 0, name: '乐与怒' } }
      }),
    /safe integer/
  );
  assert.throws(
    () =>
      normalizeMusicRequest({
        ...validMusicRequest,
        song: { ...validMusicRequest.song, artists: [{ id: 11_111, name: '' }] }
      }),
    /invalid length/
  );
  assert.throws(
    () =>
      normalizeMusicRequest({
        ...validMusicRequest,
        song: { ...validMusicRequest.song, alias: 'not-an-array' }
      }),
    /must be an array/
  );
  assert.throws(
    () =>
      normalizeMusicRequest({
        ...validMusicRequest,
        song: {
          ...validMusicRequest.song,
          artists: [{ id: 1, name: 'Artist', url: 'unexpected' }]
        }
      }),
    /unsupported field/
  );
});

test('POST /music passes only server-selected sources and returns the adapted success shape', async (t) => {
  let matchArguments;
  const app = createTestApp({
    sources: ['kuwo', 'migu'],
    match: async (...args) => {
      matchArguments = args;
      return { url: 'http://example.test/song.mp3', br: 320_000, size: 12_345 };
    }
  });
  const server = await listen(app);
  t.after(() => close(server));

  const response = await jsonRequest(server, '/music', validMusicRequest, {
    headers: { 'x-forwarded-proto': 'https' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.deepEqual(matchArguments, [
    validMusicRequest.id,
    ['kuwo', 'migu'],
    validMusicRequest.song
  ]);
  assert.deepEqual(JSON.parse(response.body), {
    code: 200,
    message: 'success',
    data: { url: 'https://example.test/song.mp3', br: 320_000, size: 12_345 }
  });
});

test('POST /music returns 400 for invalid client input without invoking match', async (t) => {
  let matchCalls = 0;
  const app = createTestApp({
    match: async () => {
      matchCalls += 1;
      return { url: 'https://example.test/song.mp3' };
    }
  });
  const server = await listen(app);
  t.after(() => close(server));

  const response = await jsonRequest(server, '/music', {
    ...validMusicRequest,
    sources: ['migu']
  });

  assert.equal(response.statusCode, 400);
  assert.equal(JSON.parse(response.body).error, 'invalid_request');
  assert.equal(matchCalls, 0);
});

test('POST /music rejects bodies larger than 32 KiB', async (t) => {
  const app = createTestApp();
  const server = await listen(app);
  t.after(() => close(server));

  const oversizedBody = JSON.stringify({
    ...validMusicRequest,
    padding: 'x'.repeat(33 * 1024)
  });
  const response = await request(server, {
    path: '/music',
    method: 'POST',
    body: oversizedBody,
    headers: { 'content-type': 'application/json' }
  });

  assert.equal(response.statusCode, 413);
  assert.equal(JSON.parse(response.body).error, 'payload_too_large');
});

test('POST /music distinguishes no match, timeout, and safe internal failures', async (t) => {
  const cases = [
    {
      match: async () => null,
      expectedStatus: 404,
      expectedError: 'not_found'
    },
    {
      match: async () => new Promise(() => {}),
      musicTimeoutMs: 20,
      expectedStatus: 504,
      expectedError: 'music_timeout'
    },
    {
      match: async () => {
        throw new Error('secret upstream details');
      },
      expectedStatus: 500,
      expectedError: 'internal_error'
    }
  ];

  for (const testCase of cases) {
    const app = createTestApp(testCase);
    const server = await listen(app);
    t.after(() => close(server));
    const response = await jsonRequest(server, '/music', validMusicRequest);
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, testCase.expectedStatus);
    assert.equal(body.error, testCase.expectedError);
    assert.doesNotMatch(response.body, /secret upstream details/);
  }
});

test('GET /healthz uses the local NCM TCP readiness result', async (t) => {
  const readinessCalls = [];
  let ready = false;
  const app = createTestApp({
    ncmPort: 31_234,
    healthTimeoutMs: 73,
    readinessCheck: async (options) => {
      readinessCalls.push(options);
      return ready;
    }
  });
  const server = await listen(app);
  t.after(() => close(server));

  const unavailable = await request(server, { path: '/healthz' });
  assert.equal(unavailable.statusCode, 503);
  assert.deepEqual(JSON.parse(unavailable.body), {
    status: 'unavailable',
    ncmApi: 'unavailable'
  });

  ready = true;
  const healthy = await request(server, { path: '/healthz' });
  assert.equal(healthy.statusCode, 200);
  assert.deepEqual(JSON.parse(healthy.body), { status: 'ok', ncmApi: 'ok' });
  assert.deepEqual(readinessCalls, [
    { host: '127.0.0.1', port: 31_234, timeoutMs: 73 },
    { host: '127.0.0.1', port: 31_234, timeoutMs: 73 }
  ]);
});

test('checkTcpPort reports whether a localhost TCP listener is ready', async (t) => {
  const target = await listen(http.createServer((_request, response) => response.end('ok')));
  const port = target.address().port;
  t.after(() => close(target));

  assert.equal(await checkTcpPort({ host: '127.0.0.1', port, timeoutMs: 100 }), true);
  await close(target);
  assert.equal(await checkTcpPort({ host: '127.0.0.1', port, timeoutMs: 30 }), false);
});

test('hop-by-hop header filtering honors both standard and Connection-listed headers', () => {
  assert.deepEqual(
    filterHopByHopHeaders({
      connection: 'keep-alive, x-private',
      'keep-alive': 'timeout=5',
      'x-private': 'secret',
      cookie: 'MUSIC_U=abc',
      accept: 'application/json'
    }),
    { cookie: 'MUSIC_U=abc', accept: 'application/json' }
  );
});

test('/api proxies method, path, body, cookies, and end-to-end headers to localhost', async (t) => {
  let upstreamRequest;
  const upstream = await listen(
    http.createServer((requestToUpstream, responseFromUpstream) => {
      const chunks = [];
      requestToUpstream.on('data', (chunk) => chunks.push(chunk));
      requestToUpstream.on('end', () => {
        upstreamRequest = {
          method: requestToUpstream.method,
          url: requestToUpstream.url,
          headers: requestToUpstream.headers,
          body: Buffer.concat(chunks).toString('utf8')
        };
        responseFromUpstream.writeHead(201, {
          'content-type': 'application/json',
          connection: 'close, x-upstream-private',
          'x-upstream-private': 'secret',
          'x-powered-by': 'Express',
          'access-control-allow-origin': 'https://attacker.example',
          'access-control-allow-credentials': 'true',
          'set-cookie': ['MUSIC_U=updated; Path=/; HttpOnly']
        });
        responseFromUpstream.end('{"code":200}');
      });
    })
  );
  t.after(() => close(upstream));

  const app = createTestApp({ ncmPort: upstream.address().port });
  const server = await listen(app);
  t.after(() => close(server));

  const response = await request(server, {
    path: '/api/login/cellphone?timestamp=1',
    method: 'POST',
    body: '{"phone":"123"}',
    headers: {
      'content-type': 'application/json',
      cookie: 'MUSIC_U=abc',
      origin: `http://127.0.0.1:${server.address().port}`,
      'sec-fetch-site': 'same-origin',
      'x-forwarded-proto': 'http',
      connection: 'keep-alive, x-client-private',
      'x-client-private': 'secret'
    }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body, '{"code":200}');
  assert.equal(response.headers['x-upstream-private'], undefined);
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.equal(response.headers['access-control-allow-credentials'], undefined);
  assert.deepEqual(response.headers['set-cookie'], [
    'MUSIC_U=updated; Path=/; HttpOnly; SameSite=Strict'
  ]);
  assert.equal(upstreamRequest.method, 'POST');
  assert.equal(upstreamRequest.url, '/login/cellphone?timestamp=1');
  assert.equal(upstreamRequest.body, '{"phone":"123"}');
  assert.equal(upstreamRequest.headers.cookie, 'MUSIC_U=abc');
  assert.equal(upstreamRequest.headers['x-client-private'], undefined);
  assert.equal(upstreamRequest.headers.origin, undefined);
  assert.equal(upstreamRequest.headers['sec-fetch-site'], undefined);
  assert.equal(upstreamRequest.headers['x-forwarded-proto'], undefined);
  assert.equal(upstreamRequest.headers.host, `127.0.0.1:${upstream.address().port}`);
});

test('/api rejects cross-origin browser requests but allows clients without Origin', async (t) => {
  let upstreamCalls = 0;
  const upstream = await listen(
    http.createServer((requestToUpstream, responseFromUpstream) => {
      upstreamCalls += 1;
      requestToUpstream.resume();
      responseFromUpstream.end('{"code":200}');
    })
  );
  t.after(() => close(upstream));

  const app = createTestApp({ ncmPort: upstream.address().port });
  const server = await listen(app);
  t.after(() => close(server));

  const crossOrigin = await request(server, {
    path: '/api/like',
    method: 'POST',
    body: 'id=123',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://attacker.example'
    }
  });
  assert.equal(crossOrigin.statusCode, 403);
  assert.equal(upstreamCalls, 0);

  const crossSiteNavigation = await request(server, {
    path: '/api/like?id=123',
    headers: { 'sec-fetch-site': 'cross-site' }
  });
  assert.equal(crossSiteNavigation.statusCode, 403);
  assert.equal(upstreamCalls, 0);

  const nativeClient = await request(server, {
    path: '/api/login/status',
    method: 'POST',
    body: 'timestamp=1',
    headers: { 'content-type': 'application/x-www-form-urlencoded' }
  });
  assert.equal(nativeClient.statusCode, 200);
  assert.equal(upstreamCalls, 1);
});

test('/api blocks dependency routes that mutate global state or proxy arbitrary URLs', async (t) => {
  const app = createTestApp();
  const server = await listen(app);
  t.after(() => close(server));

  const blockedPaths = [
    '/api/bilibili/stream-proxy?url=http://169.254.169.254/latest/meta-data',
    '/api/%62ilibili/stream-proxy?url=http://127.0.0.1',
    '/api/bilibili/update-cookie',
    '/api/bilibili/refresh-cookie',
    '/api/bilibili/clear-cache'
  ];

  for (const pathName of blockedPaths) {
    const response = await request(server, { path: pathName, method: 'POST' });
    assert.equal(response.statusCode, 403, pathName);
    assert.equal(JSON.parse(response.body).error, 'forbidden');
  }
});

test('/api returns 504 when the localhost NCM API exceeds its timeout', async (t) => {
  const upstream = await listen(
    http.createServer((requestToUpstream) => {
      requestToUpstream.resume();
    })
  );
  t.after(() => close(upstream));

  const app = createTestApp({
    ncmPort: upstream.address().port,
    proxyTimeoutMs: 20
  });
  const server = await listen(app);
  t.after(() => close(server));

  const response = await request(server, { path: '/api/hanging' });
  assert.equal(response.statusCode, 504);
  assert.equal(JSON.parse(response.body).error, 'upstream_timeout');
});

test('static files and SPA routes are served from the configured public directory', async (t) => {
  const staticDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'alger-static-test-'));
  fs.writeFileSync(path.join(staticDirectory, 'index.html'), '<!doctype html><title>Alger</title>');
  t.after(() => fs.rmSync(staticDirectory, { recursive: true, force: true }));

  const app = createTestApp({ staticDirectory });
  const server = await listen(app);
  t.after(() => close(server));

  const home = await request(server, { path: '/', headers: { accept: 'text/html' } });
  const deepLink = await request(server, {
    path: '/playlist/123',
    headers: { accept: 'text/html' }
  });

  assert.equal(home.statusCode, 200);
  assert.match(home.body, /<title>Alger<\/title>/);
  assert.equal(deepLink.statusCode, 200);
  assert.match(deepLink.body, /<title>Alger<\/title>/);
});
