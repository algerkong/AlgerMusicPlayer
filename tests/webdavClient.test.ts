import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  downloadBackup,
  testConnection,
  uploadBackup,
  WebdavError
} from '../src/main/modules/webdavClient';

// 内存版 WebDAV：只实现客户端用到的 PROPFIND / MKCOL / PUT / GET + Basic 认证
const EXPECTED_AUTH = `Basic ${Buffer.from('user:p@ss:字').toString('base64')}`;

let server: Server;
let baseUrl: string;
let files: Map<string, string>;
let dirs: Set<string>;

beforeEach(async () => {
  files = new Map();
  dirs = new Set(['/dav']);
  server = createServer((req, res) => {
    if (req.headers.authorization !== EXPECTED_AUTH) {
      res.writeHead(401).end();
      return;
    }
    const path = decodeURIComponent(req.url ?? '').replace(/\/+$/, '');
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (req.method === 'PROPFIND') {
        res.writeHead(dirs.has(path) ? 207 : 404).end();
      } else if (req.method === 'MKCOL') {
        if (dirs.has(path)) {
          res.writeHead(405).end();
        } else {
          dirs.add(path);
          res.writeHead(201).end();
        }
      } else if (req.method === 'PUT') {
        // 与真实服务端一致：父目录不存在时拒绝写入
        if (!dirs.has(path.slice(0, path.lastIndexOf('/')))) {
          res.writeHead(409).end();
          return;
        }
        files.set(path, Buffer.concat(chunks).toString('utf8'));
        res.writeHead(201).end();
      } else if (req.method === 'GET' && files.has(path)) {
        res.writeHead(200).end(files.get(path));
      } else {
        res.writeHead(404).end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/dav/`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const config = () => ({ url: baseUrl, username: 'user', password: 'p@ss:字' });

describe('webdavClient', () => {
  it('returns null when the remote has no sync file yet', async () => {
    expect(await downloadBackup(config())).toBeNull();
  });

  it('creates the app folder on first upload and reads the same content back', async () => {
    await uploadBackup(config(), '{"历史":[1,2]}');

    expect(files.get('/dav/AlgerMusicPlayer/backup.json')).toBe('{"历史":[1,2]}');
    expect(await downloadBackup(config())).toBe('{"历史":[1,2]}');
  });

  it('overwrites the file when the folder already exists', async () => {
    await uploadBackup(config(), 'first');
    await uploadBackup(config(), 'second');

    expect(await downloadBackup(config())).toBe('second');
  });

  it('reports wrong credentials as an auth error', async () => {
    const error = await testConnection({ ...config(), password: 'wrong' }).catch((e) => e);

    expect(error).toBeInstanceOf(WebdavError);
    expect(error.kind).toBe('auth');
  });

  it('reports a missing collection as an http error with its status', async () => {
    const error = await testConnection({ ...config(), url: `${baseUrl}missing/` }).catch((e) => e);

    expect(error.kind).toBe('http');
    expect(error.status).toBe(404);
  });

  it('rejects non-http urls before sending anything', async () => {
    const error = await testConnection({ ...config(), url: 'ftp://example.com/dav' }).catch(
      (e) => e
    );

    expect(error.kind).toBe('invalidUrl');
  });

  it('reports an unreachable server as a network error', async () => {
    await new Promise((resolve) => server.close(resolve));
    const error = await downloadBackup(config()).catch((e) => e);
    server.listen(0, '127.0.0.1');

    expect(error.kind).toBe('network');
  });
});
