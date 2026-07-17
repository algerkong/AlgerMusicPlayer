import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const testRoot = path.join(os.tmpdir(), `lymusic-pathguard-${process.pid}-${Date.now()}`);
const downloads = path.join(testRoot, 'downloads');
const userData = path.join(testRoot, 'userData');
const cacheDir = path.join(userData, 'cache');

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return userData;
      if (name === 'downloads') return downloads;
      return testRoot;
    }
  }
}));

vi.mock('./config', () => ({
  getStore: () => ({
    get: (key: string) => {
      if (key === 'set.downloadPath') return downloads;
      if (key === 'set.diskCacheDir') return cacheDir;
      return undefined;
    }
  })
}));

import {
  invalidatePathGuardCaches,
  isPathInsideRoot,
  parseLocalProtocolUrl,
  resolveSafePath
} from './pathGuard';

describe('isPathInsideRoot', () => {
  it('accepts path equal to or under root', () => {
    expect(isPathInsideRoot('/data/music', '/data/music')).toBe(true);
    expect(isPathInsideRoot('/data/music/a.mp3', '/data/music')).toBe(true);
  });

  it('rejects path outside root or sibling escape', () => {
    expect(isPathInsideRoot('/data/other/a.mp3', '/data/music')).toBe(false);
    expect(isPathInsideRoot('/data/music-evil/a', '/data/music')).toBe(false);
  });
});

describe('parseLocalProtocolUrl', () => {
  it('parses absolute posix-style local URLs', () => {
    const p = parseLocalProtocolUrl('local:///tmp/foo%20bar.mp3');
    expect(p).toContain('foo bar.mp3');
  });
});

describe('resolveSafePath', () => {
  beforeAll(() => {
    fs.mkdirSync(downloads, { recursive: true });
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(path.join(userData, 'ly-music-cache'), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    invalidatePathGuardCaches();
  });

  it('allows files under download root', () => {
    const file = path.join(downloads, 'song.mp3');
    fs.writeFileSync(file, 'x');
    const safe = resolveSafePath(file);
    expect(safe).toBeTruthy();
    expect(safe && path.resolve(safe)).toBe(path.resolve(file));
  });

  it('allows files under disk cache root', () => {
    const file = path.join(cacheDir, 'music', 'a.bin');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'y');
    expect(resolveSafePath(file)).toBeTruthy();
  });

  it('rejects paths outside allowed roots', () => {
    const outside = path.join(testRoot, 'outside.txt');
    fs.writeFileSync(outside, 'z');
    expect(resolveSafePath(outside)).toBeNull();
    expect(resolveSafePath('/etc/passwd')).toBeNull();
  });

  it('rejects empty and null-byte paths', () => {
    expect(resolveSafePath('')).toBeNull();
    expect(resolveSafePath('a\0b')).toBeNull();
    expect(resolveSafePath(null)).toBeNull();
  });
});
