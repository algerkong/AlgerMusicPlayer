'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_INDEX_PATH = path.resolve(__dirname, '../out/renderer/index.html');
const RELATIVE_ENTRY_ASSET = /\b(src|href)=(["'])\.\/([^"']+)\2/g;

function rewriteContainerIndex(indexPath = DEFAULT_INDEX_PATH) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const rewritten = html.replace(
    RELATIVE_ENTRY_ASSET,
    (_match, attribute, quote, assetPath) => `${attribute}=${quote}/${assetPath}${quote}`
  );

  if (rewritten === html) {
    throw new Error('Container entry point has no relative src or href attributes to rewrite');
  }

  fs.writeFileSync(indexPath, rewritten);
}

if (require.main === module) {
  rewriteContainerIndex(process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INDEX_PATH);
}

module.exports = { rewriteContainerIndex };
