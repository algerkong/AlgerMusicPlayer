import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function readScalar(line, prefix) {
  return line.slice(prefix.length).trim().replace(/^'/, '').replace(/'$/, '');
}

function parseLatestMacYml(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const result = {
    version: '',
    files: [],
    path: '',
    sha512: '',
    releaseDate: ''
  };

  let currentFile = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    if (line.startsWith('version: ')) {
      result.version = readScalar(line, 'version: ');
      continue;
    }

    if (line.startsWith('path: ')) {
      result.path = readScalar(line, 'path: ');
      continue;
    }

    if (line.startsWith('sha512: ')) {
      result.sha512 = readScalar(line, 'sha512: ');
      continue;
    }

    if (line.startsWith('releaseDate: ')) {
      result.releaseDate = readScalar(line, 'releaseDate: ');
      continue;
    }

    if (line.startsWith('  - url: ')) {
      currentFile = {
        url: readScalar(line, '  - url: ')
      };
      result.files.push(currentFile);
      continue;
    }

    if (line.startsWith('    sha512: ') && currentFile) {
      currentFile.sha512 = readScalar(line, '    sha512: ');
      continue;
    }

    if (line.startsWith('    size: ') && currentFile) {
      currentFile.size = Number.parseInt(readScalar(line, '    size: '), 10);
    }
  }

  return result;
}

function uniqueFiles(files) {
  const fileMap = new Map();

  for (const file of files) {
    fileMap.set(file.url, file);
  }

  return Array.from(fileMap.values());
}

function stringifyLatestMacYml(data) {
  const lines = [`version: ${data.version}`, 'files:'];

  for (const file of data.files) {
    lines.push(`  - url: ${file.url}`);
    lines.push(`    sha512: ${file.sha512}`);
    lines.push(`    size: ${file.size}`);
  }

  lines.push(`path: ${data.path}`);
  lines.push(`sha512: ${data.sha512}`);
  lines.push(`releaseDate: '${data.releaseDate}'`);

  return `${lines.join('\n')}\n`;
}

const [x64Path, arm64Path, outputPath] = process.argv.slice(2);

if (!x64Path || !arm64Path || !outputPath) {
  console.error(
    'Usage: node scripts/merge_latest_mac_yml.mjs <latest-mac-x64.yml> <latest-mac-arm64.yml> <output.yml>'
  );
  process.exit(1);
}

const x64Data = parseLatestMacYml(x64Path);
const arm64Data = parseLatestMacYml(arm64Path);

if (x64Data.version !== arm64Data.version) {
  console.error(
    `Version mismatch between mac update files: ${x64Data.version} !== ${arm64Data.version}`
  );
  process.exit(1);
}

const mergedData = {
  ...x64Data,
  files: uniqueFiles([...x64Data.files, ...arm64Data.files]),
  releaseDate: arm64Data.releaseDate || x64Data.releaseDate
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, stringifyLatestMacYml(mergedData), 'utf8');
