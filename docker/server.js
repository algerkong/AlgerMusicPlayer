'use strict';

const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const APP_HOST = '0.0.0.0';
const APP_PORT = 4488;
const NCM_HOST = '127.0.0.1';
const NCM_PORT = 30488;
const MUSIC_BODY_LIMIT = 32 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const HEALTH_TIMEOUT_MS = 1_000;
const SHUTDOWN_TIMEOUT_MS = 4_500;
const DEFAULT_STATIC_DIR = path.resolve(__dirname, '../public');
const SUPPORTED_MUSIC_SOURCES = Object.freeze(['migu', 'kugou', 'kuwo', 'pyncmd']);

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);
const PROXY_RESPONSE_BLOCKED_HEADERS = new Set([
  'access-control-allow-credentials',
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-allow-origin',
  'access-control-expose-headers',
  'access-control-max-age',
  'x-powered-by'
]);
const PROXY_REQUEST_BLOCKED_HEADERS = new Set([
  'forwarded',
  'origin',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip'
]);
const BLOCKED_NCM_ROUTES = new Set([
  '/bilibili/clear-cache',
  '/bilibili/refresh-cookie',
  '/bilibili/stream-proxy',
  '/bilibili/update-cookie'
]);

class RequestValidationError extends Error {}
class RequestTimeoutError extends Error {}

/**
 * netease-cloud-music-api-alger reads this file while its modules are loaded.
 * Keep this call above every require of that package.
 */
function ensureAnonymousToken(options = {}) {
  const fsModule = options.fsModule || fs;
  const tempDirectory = options.tempDirectory || os.tmpdir();
  const tokenPath = path.resolve(tempDirectory, 'anonymous_token');
  const fileDescriptor = fsModule.openSync(tokenPath, 'a', 0o600);
  fsModule.closeSync(fileDescriptor);
  return tokenPath;
}

ensureAnonymousToken();

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertAllowedKeys(value, allowedKeys, fieldName) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new RequestValidationError(`${fieldName} contains an unsupported field`);
    }
  }
}

function normalizeInteger(value, fieldName, options = {}) {
  const minimum = options.minimum === undefined ? 0 : options.minimum;
  let normalized = value;

  if (typeof normalized === 'string' && /^(?:0|[1-9]\d*)$/.test(normalized)) {
    normalized = Number(normalized);
  }

  if (!Number.isSafeInteger(normalized) || normalized < minimum) {
    throw new RequestValidationError(`${fieldName} must be a safe integer`);
  }

  return normalized;
}

function normalizeString(value, fieldName, options = {}) {
  const maximumLength = options.maximumLength || 512;

  if (typeof value !== 'string') {
    throw new RequestValidationError(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if ((!options.allowEmpty && normalized.length === 0) || normalized.length > maximumLength) {
    throw new RequestValidationError(`${fieldName} has an invalid length`);
  }

  return normalized;
}

function normalizeAlbum(value) {
  if (!isPlainObject(value)) {
    throw new RequestValidationError('song.album must be an object');
  }

  assertAllowedKeys(value, new Set(['id', 'name']), 'song.album');
  return {
    id: normalizeInteger(value.id, 'song.album.id', { minimum: 1 }),
    name: normalizeString(value.name, 'song.album.name')
  };
}

function normalizeArtists(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new RequestValidationError('song.artists must be a non-empty array');
  }

  return value.map((artist, index) => {
    if (!isPlainObject(artist)) {
      throw new RequestValidationError(`song.artists[${index}] must be an object`);
    }

    assertAllowedKeys(artist, new Set(['id', 'name']), `song.artists[${index}]`);
    return {
      id: normalizeInteger(artist.id, `song.artists[${index}].id`, { minimum: 1 }),
      name: normalizeString(artist.name, `song.artists[${index}].name`)
    };
  });
}

function normalizeAliases(value) {
  if (!Array.isArray(value) || value.length > 20) {
    throw new RequestValidationError('song.alias must be an array');
  }

  return value.map((alias, index) =>
    normalizeString(alias, `song.alias[${index}]`, { allowEmpty: true })
  );
}

function normalizeMusicRequest(value) {
  if (!isPlainObject(value)) {
    throw new RequestValidationError('request body must be an object');
  }

  assertAllowedKeys(value, new Set(['id', 'song']), 'request body');
  if (Object.prototype.hasOwnProperty.call(value, 'sources')) {
    throw new RequestValidationError('sources cannot be selected by the client');
  }

  if (!isPlainObject(value.song)) {
    throw new RequestValidationError('song must be an object');
  }

  assertAllowedKeys(value.song, new Set(['name', 'alias', 'duration', 'album', 'artists']), 'song');

  return {
    id: normalizeInteger(value.id, 'id', { minimum: 1 }),
    song: {
      name: normalizeString(value.song.name, 'song.name'),
      alias: normalizeAliases(value.song.alias),
      duration: normalizeInteger(value.song.duration, 'song.duration'),
      album: normalizeAlbum(value.song.album),
      artists: normalizeArtists(value.song.artists)
    }
  };
}

function parseMusicSources(value = process.env.MUSIC_SOURCES) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return [...SUPPORTED_MUSIC_SOURCES];
  }

  const requestedSources = String(value)
    .split(',')
    .map((source) => source.trim().toLowerCase())
    .filter(Boolean);
  const unsupportedSources = requestedSources.filter(
    (source) => !SUPPORTED_MUSIC_SOURCES.includes(source)
  );

  if (requestedSources.length === 0 || unsupportedSources.length > 0) {
    throw new Error('MUSIC_SOURCES contains an unsupported source');
  }

  return [...new Set(requestedSources)];
}

function hasPlayableUrl(value) {
  return isPlainObject(value) && typeof value.url === 'string' && value.url.trim().length > 0;
}

function normalizePlayableResult(value, options = {}) {
  if (!hasPlayableUrl(value)) return null;

  try {
    const url = new URL(value.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.protocol === 'http:' && options.upgradeInsecure) url.protocol = 'https:';
    return { ...value, url: url.toString() };
  } catch {
    return null;
  }
}

function requestUsesHttps(request) {
  const forwardedProtocol = request.headers['x-forwarded-proto'];
  const firstForwardedProtocol = Array.isArray(forwardedProtocol)
    ? forwardedProtocol[0]
    : forwardedProtocol?.split(',')[0];
  return request.secure === true || firstForwardedProtocol?.trim().toLowerCase() === 'https';
}

function withTimeout(operation, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new RequestTimeoutError('operation timed out'));
      }
    }, timeoutMs);
    timer.unref?.();

    Promise.resolve()
      .then(operation)
      .then(
        (value) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(value);
          }
        },
        (error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(error);
          }
        }
      );
  });
}

function connectionHeaderTokens(headers) {
  const connectionValue = headers.connection;
  const values = Array.isArray(connectionValue) ? connectionValue : [connectionValue];
  return values
    .filter((value) => typeof value === 'string')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function filterHopByHopHeaders(headers, additionalBlockedHeaders = []) {
  const blockedHeaders = new Set([
    ...HOP_BY_HOP_HEADERS,
    ...connectionHeaderTokens(headers),
    ...additionalBlockedHeaders
  ]);
  const filteredHeaders = {};

  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined && !blockedHeaders.has(name.toLowerCase())) {
      filteredHeaders[name] = value;
    }
  }

  return filteredHeaders;
}

function guardNcmRoute(request, response, next) {
  let requestPath;

  try {
    requestPath = decodeURIComponent(request.path)
      .replace(/\/{2,}/g, '/')
      .replace(/\/$/, '')
      .toLowerCase();
  } catch {
    response.status(400).json({ error: 'invalid_request', message: 'Invalid API path' });
    return;
  }

  if (BLOCKED_NCM_ROUTES.has(requestPath)) {
    response.status(403).json({ error: 'forbidden', message: 'This API route is not exposed' });
    return;
  }

  next();
}

function guardApiOrigin(request, response, next) {
  const fetchSiteHeader = request.headers['sec-fetch-site'];
  const fetchSite = Array.isArray(fetchSiteHeader) ? fetchSiteHeader[0] : fetchSiteHeader;
  if (fetchSite && fetchSite.trim().toLowerCase() !== 'same-origin') {
    response
      .status(403)
      .json({ error: 'forbidden', message: 'Cross-origin API requests are denied' });
    return;
  }

  const originHeader = request.headers.origin;
  if (!originHeader) {
    next();
    return;
  }

  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const host = request.headers.host?.trim().toLowerCase();

  try {
    const originUrl = new URL(origin);
    const expectedProtocol = requestUsesHttps(request) ? 'https:' : 'http:';
    if (originUrl.protocol === expectedProtocol && originUrl.host.toLowerCase() === host) {
      next();
      return;
    }
  } catch {
    // Invalid and opaque origins are denied below.
  }

  response
    .status(403)
    .json({ error: 'forbidden', message: 'Cross-origin API requests are denied' });
}

function enforceSameSiteStrict(setCookieHeader) {
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const normalized = cookies.map(
    (cookie) => `${cookie.replace(/;\s*SameSite=(?:Strict|Lax|None)/gi, '')}; SameSite=Strict`
  );
  return Array.isArray(setCookieHeader) ? normalized : normalized[0];
}

function checkTcpPort(options = {}) {
  const host = options.host || NCM_HOST;
  const port = options.port || NCM_PORT;
  const timeoutMs = options.timeoutMs || HEALTH_TIMEOUT_MS;
  const netModule = options.netModule || net;

  return new Promise((resolve) => {
    let settled = false;
    const socket = netModule.createConnection({ host, port });

    const finish = (ready) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ready);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function sendProxyError(response, error, logger) {
  if (response.headersSent || response.destroyed) return;

  if (error instanceof RequestTimeoutError || error?.code === 'ETIMEDOUT') {
    response.status(504).json({ error: 'upstream_timeout', message: 'Music API timed out' });
    return;
  }

  logger.error?.('NCM API proxy failed', error);
  response.status(502).json({ error: 'bad_gateway', message: 'Music API is unavailable' });
}

function createApiProxy(options = {}) {
  const httpModule = options.httpModule || http;
  const host = NCM_HOST;
  const port = options.port || NCM_PORT;
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
  const logger = options.logger || console;

  return (request, response) => {
    const headers = filterHopByHopHeaders(request.headers, PROXY_REQUEST_BLOCKED_HEADERS);
    headers.host = `${host}:${port}`;

    const upstreamRequest = httpModule.request(
      {
        host,
        port,
        method: request.method,
        path: request.url.startsWith('/') ? request.url : `/${request.url}`,
        headers
      },
      (upstreamResponse) => {
        const responseHeaders = filterHopByHopHeaders(
          upstreamResponse.headers,
          PROXY_RESPONSE_BLOCKED_HEADERS
        );
        if (responseHeaders['set-cookie']) {
          responseHeaders['set-cookie'] = enforceSameSiteStrict(responseHeaders['set-cookie']);
        }
        response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);

        upstreamResponse.once('aborted', () => {
          if (!response.destroyed) response.destroy();
        });
        upstreamResponse.once('error', (error) => {
          logger.error?.('NCM API response stream failed', error);
          if (!response.destroyed) response.destroy(error);
        });
        upstreamResponse.pipe(response);
      }
    );

    const destroyUpstream = () => {
      if (!upstreamRequest.destroyed) upstreamRequest.destroy();
    };

    request.once('aborted', destroyUpstream);
    response.once('close', () => {
      if (!response.writableEnded) destroyUpstream();
    });
    upstreamRequest.setTimeout(timeoutMs, () => {
      upstreamRequest.destroy(new RequestTimeoutError('NCM API proxy timed out'));
    });
    upstreamRequest.once('error', (error) => sendProxyError(response, error, logger));
    request.pipe(upstreamRequest);
  };
}

function loadMatch() {
  const matchModule = require('@unblockneteasemusic/server');
  return matchModule.default || matchModule;
}

function loadNcmServer() {
  ensureAnonymousToken();
  return require('netease-cloud-music-api-alger/server');
}

function createApp(options = {}) {
  const expressModule = options.expressModule || require('express');
  const match = options.match || loadMatch();
  const sources = options.sources || parseMusicSources();
  const ncmPort = options.ncmPort || NCM_PORT;
  const musicTimeoutMs = options.musicTimeoutMs || REQUEST_TIMEOUT_MS;
  const proxyTimeoutMs = options.proxyTimeoutMs || REQUEST_TIMEOUT_MS;
  const healthTimeoutMs = options.healthTimeoutMs || HEALTH_TIMEOUT_MS;
  const readinessCheck = options.readinessCheck || checkTcpPort;
  const staticDirectory =
    options.staticDirectory === undefined ? DEFAULT_STATIC_DIR : options.staticDirectory;
  const logger = options.logger || console;
  const app = expressModule();

  app.disable('x-powered-by');

  app.get('/healthz', async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    let ready = false;

    try {
      ready = await readinessCheck({
        host: NCM_HOST,
        port: ncmPort,
        timeoutMs: healthTimeoutMs
      });
    } catch (error) {
      logger.error?.('NCM API readiness check failed', error);
    }

    if (!ready) {
      response.status(503).json({ status: 'unavailable', ncmApi: 'unavailable' });
      return;
    }

    response.status(200).json({ status: 'ok', ncmApi: 'ok' });
  });

  app.post(
    '/music',
    expressModule.json({ limit: MUSIC_BODY_LIMIT, strict: true }),
    async (request, response) => {
      let normalized;

      try {
        normalized = normalizeMusicRequest(request.body);
      } catch (error) {
        if (error instanceof RequestValidationError) {
          response.status(400).json({ error: 'invalid_request', message: error.message });
          return;
        }
        throw error;
      }

      try {
        const matchResult = await withTimeout(
          () => match(normalized.id, [...sources], normalized.song),
          musicTimeoutMs
        );
        const result = normalizePlayableResult(matchResult, {
          upgradeInsecure: requestUsesHttps(request)
        });

        if (!result) {
          response
            .status(404)
            .json({ error: 'not_found', message: 'No playable music source was found' });
          return;
        }

        response.status(200).json({ code: 200, message: 'success', data: result });
      } catch (error) {
        if (error instanceof RequestTimeoutError) {
          response
            .status(504)
            .json({ error: 'music_timeout', message: 'Music matching timed out' });
          return;
        }

        logger.error?.('Music matching failed', error);
        response.status(500).json({ error: 'internal_error', message: 'Music matching failed' });
      }
    }
  );

  app.use(
    '/api',
    guardApiOrigin,
    guardNcmRoute,
    createApiProxy({
      port: ncmPort,
      timeoutMs: proxyTimeoutMs,
      logger,
      httpModule: options.httpModule
    })
  );

  if (staticDirectory) {
    app.use(expressModule.static(staticDirectory, { index: 'index.html', fallthrough: true }));
    app.get('*', (request, response, next) => {
      if (!request.accepts('html')) {
        next();
        return;
      }

      response.sendFile(path.join(staticDirectory, 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: 'not_found', message: 'Route not found' });
  });

  app.use((error, _request, response, _next) => {
    if (response.headersSent) return;

    if (error?.type === 'entity.too.large') {
      response
        .status(413)
        .json({ error: 'payload_too_large', message: 'Request body exceeds 32 KiB' });
      return;
    }

    if (error instanceof SyntaxError && error?.type === 'entity.parse.failed') {
      response
        .status(400)
        .json({ error: 'invalid_request', message: 'Request body is not valid JSON' });
      return;
    }

    if (error?.status === 404) {
      response.status(404).json({ error: 'not_found', message: 'Route not found' });
      return;
    }

    logger.error?.('Container server request failed', error);
    response.status(500).json({ error: 'internal_error', message: 'Internal server error' });
  });

  return app;
}

function parsePort(value, fallback, fieldName) {
  if (value === undefined || value === null || value === '') return fallback;
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${fieldName} must be a valid TCP port`);
  }
  return port;
}

function listen(app, options) {
  return new Promise((resolve, reject) => {
    const server = app.listen(options.port, options.host);
    const handleError = (error) => {
      server.off('listening', handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off('error', handleError);
      resolve(server);
    };
    server.once('error', handleError);
    server.once('listening', handleListening);
  });
}

async function waitForNcmReady(options) {
  const deadline = Date.now() + options.timeoutMs;

  while (Date.now() < deadline) {
    if (
      await options.readinessCheck({
        host: NCM_HOST,
        port: options.port,
        timeoutMs: Math.min(HEALTH_TIMEOUT_MS, options.timeoutMs)
      })
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('NCM API did not become ready');
}

function closeServer(server) {
  if (!server || !server.listening) return Promise.resolve();
  return new Promise((resolve) => server.close(resolve));
}

function createShutdown(options) {
  let shutdownPromise;

  return () => {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        options.appServer?.closeAllConnections?.();
        options.ncmServer?.closeAllConnections?.();
        resolve();
      }, options.timeoutMs);
      timeout.unref?.();

      Promise.all([closeServer(options.appServer), closeServer(options.ncmServer)]).then(() => {
        clearTimeout(timeout);
        resolve();
      });
    });

    return shutdownPromise;
  };
}

async function startContainerServer(options = {}) {
  ensureAnonymousToken();

  const logger = options.logger || console;
  const appPort = parsePort(options.port ?? process.env.PORT, APP_PORT, 'PORT');
  const ncmPort = parsePort(options.ncmPort ?? process.env.NCM_API_PORT, NCM_PORT, 'NCM_API_PORT');
  const sources = options.sources || parseMusicSources();
  const readinessCheck = options.readinessCheck || checkTcpPort;
  const ncmModule = options.ncmModule || loadNcmServer();
  let ncmApp;

  try {
    ncmApp = await ncmModule.serveNcmApi({ host: NCM_HOST, port: ncmPort, checkVersion: false });
    await waitForNcmReady({
      port: ncmPort,
      readinessCheck,
      timeoutMs: options.startupTimeoutMs || REQUEST_TIMEOUT_MS
    });

    const app = createApp({
      ...options,
      ncmPort,
      sources,
      readinessCheck,
      logger
    });
    const appServer = await listen(app, {
      host: options.host || process.env.APP_HOST || APP_HOST,
      port: appPort
    });
    const shutdown = createShutdown({
      appServer,
      ncmServer: ncmApp.server,
      timeoutMs: options.shutdownTimeoutMs || SHUTDOWN_TIMEOUT_MS
    });

    const handleSignal = async (signal) => {
      logger.info?.(`Received ${signal}; shutting down`);
      await shutdown();
      process.exit(0);
    };
    process.once('SIGINT', handleSignal);
    process.once('SIGTERM', handleSignal);

    logger.info?.(`Alger Music Player is listening on ${options.host || APP_HOST}:${appPort}`);
    return { app, appServer, ncmApp, shutdown };
  } catch (error) {
    await closeServer(ncmApp?.server);
    throw error;
  }
}

if (require.main === module) {
  startContainerServer().catch((error) => {
    console.error('Failed to start Alger Music Player', error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_STATIC_DIR,
  BLOCKED_NCM_ROUTES,
  HOP_BY_HOP_HEADERS,
  MUSIC_BODY_LIMIT,
  NCM_HOST,
  NCM_PORT,
  REQUEST_TIMEOUT_MS,
  SUPPORTED_MUSIC_SOURCES,
  RequestTimeoutError,
  RequestValidationError,
  checkTcpPort,
  createApiProxy,
  createApp,
  ensureAnonymousToken,
  filterHopByHopHeaders,
  guardApiOrigin,
  guardNcmRoute,
  normalizeMusicRequest,
  normalizePlayableResult,
  parseMusicSources,
  requestUsesHttps,
  startContainerServer,
  withTimeout
};
