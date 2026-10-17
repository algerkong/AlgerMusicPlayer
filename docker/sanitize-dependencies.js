'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DEPENDENCY_DIRECTORY = path.resolve(
  process.cwd(),
  'node_modules/netease-cloud-music-api-alger'
);
const RAW_COOKIE_LOG = /^[\t ]*console\.log\('defaultCookieString', defaultCookieString\)\r?\n/gm;
const REQUEST_URL_LOG = /decode\(req\.originalUrl\)/g;
const UNSAFE_OPTION_OVERRIDES = new Map([
  ["crypto: query.crypto || crypto || '',", "crypto: crypto || '',"],
  ["ua: query.ua || '',", "ua: '',"],
  ['proxy: query.proxy,', 'proxy: undefined,'],
  ['realIP: query.realIP,', 'realIP: undefined,'],
  ["domain: query.domain || '',", "domain: '',"]
]);

function sanitizeNcmDependency(dependencyDirectory = DEFAULT_DEPENDENCY_DIRECTORY) {
  const handlerPath = path.join(dependencyDirectory, 'util/biliApiHandler.js');
  const serverPath = path.join(dependencyDirectory, 'server.js');
  const optionPath = path.join(dependencyDirectory, 'util/option.js');
  const cookiePath = path.join(dependencyDirectory, 'config/bilibili_cookie.txt');
  const handlerSource = fs.readFileSync(handlerPath, 'utf8');
  const serverSource = fs.readFileSync(serverPath, 'utf8');
  let optionSource = fs.readFileSync(optionPath, 'utf8');
  const cookieLogMatches = handlerSource.match(RAW_COOKIE_LOG) || [];
  const requestUrlLogMatches = serverSource.match(REQUEST_URL_LOG) || [];

  if (cookieLogMatches.length !== 1) {
    throw new Error(
      `Expected exactly one raw Bilibili cookie log statement, found ${cookieLogMatches.length}`
    );
  }

  if (requestUrlLogMatches.length !== 2) {
    throw new Error(
      `Expected exactly two request URL log expressions, found ${requestUrlLogMatches.length}`
    );
  }

  for (const [unsafeExpression, safeExpression] of UNSAFE_OPTION_OVERRIDES) {
    const occurrences = optionSource.split(unsafeExpression).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `Expected exactly one NCM option expression ${JSON.stringify(unsafeExpression)}, found ${occurrences}`
      );
    }
    optionSource = optionSource.replace(unsafeExpression, safeExpression);
  }

  fs.writeFileSync(handlerPath, handlerSource.replace(RAW_COOKIE_LOG, ''));
  fs.writeFileSync(serverPath, serverSource.replace(REQUEST_URL_LOG, 'req.path'));
  fs.writeFileSync(optionPath, optionSource);
  fs.rmSync(cookiePath, { force: true });
}

if (require.main === module) {
  sanitizeNcmDependency(
    process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DEPENDENCY_DIRECTORY
  );
}

module.exports = { sanitizeNcmDependency };
