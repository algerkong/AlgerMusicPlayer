import { beforeEach, describe, expect, it, vi } from 'vitest';

const lookup = vi.fn();

vi.mock('dns/promises', () => ({
  default: {
    lookup: (...args: unknown[]) => lookup(...args)
  },
  lookup: (...args: unknown[]) => lookup(...args)
}));

import { assertSafeCoverUrl, assertSafeHttpsUrl, isBlockedIp, UnsafeUrlError } from './urlGuard';

describe('isBlockedIp', () => {
  it('blocks loopback and private IPv4', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('10.0.0.1')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('0.0.0.0')).toBe(true);
  });

  it('allows public IPv4', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
  });

  it('blocks loopback and ULA IPv6', () => {
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('fc00::1')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
  });
});

describe('assertSafeHttpsUrl', () => {
  beforeEach(() => {
    lookup.mockReset();
  });

  it('rejects non-HTTPS and empty', async () => {
    await expect(assertSafeHttpsUrl('http://example.com/a')).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertSafeHttpsUrl('file:///etc/passwd')).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertSafeHttpsUrl('')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('rejects localhost hostnames without DNS', async () => {
    await expect(assertSafeHttpsUrl('https://localhost/x')).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertSafeHttpsUrl('https://foo.local/x')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('rejects private IP literals', async () => {
    await expect(assertSafeHttpsUrl('https://127.0.0.1/secret')).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
    await expect(assertSafeHttpsUrl('https://192.168.0.2/a')).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
  });

  it('rejects when DNS resolves to private IP', async () => {
    lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(assertSafeHttpsUrl('https://evil.example/x')).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
    expect(lookup).toHaveBeenCalled();
  });

  it('accepts HTTPS when DNS is public', async () => {
    lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const href = await assertSafeHttpsUrl('https://cdn.example.com/track.mp3');
    expect(href).toContain('https://cdn.example.com/track.mp3');
  });
});

describe('assertSafeCoverUrl', () => {
  beforeEach(() => {
    lookup.mockReset();
    lookup.mockResolvedValue([{ address: '1.1.1.1', family: 4 }]);
  });

  it('upgrades http to https then validates', async () => {
    const href = await assertSafeCoverUrl('http://img.example.com/c.jpg');
    expect(href.startsWith('https://')).toBe(true);
  });
});
