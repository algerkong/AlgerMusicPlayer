import dns from 'dns/promises';
import { isIP } from 'net';
import { URL } from 'url';

/** 出站 HTTPS 安全校验：防 SSRF（私网 / loopback / metadata 等） */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

export const DOWNLOAD_URL_LIMITS = {
  maxRedirects: 5,
  /** 音频下载硬上限 */
  maxAudioBytes: 500 * 1024 * 1024,
  /** 封面 HTTP 响应上限 */
  maxCoverBytes: 5 * 1024 * 1024,
  /** data: URL 字符串最大长度（含前缀） */
  maxDataUrlChars: 2 * 1024 * 1024,
  /** 队列中任务数上限 */
  maxQueueTasks: 100,
  /** getCompleted 并发 stat */
  completedStatConcurrency: 12
} as const;

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return -1;
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/** 是否私网 / 回环 / 链路本地 / 保留 / metadata 等不可出站地址 */
export function isBlockedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const n = ipv4ToInt(ip);
    if (n < 0) return true;
    const a = (n >>> 24) & 0xff;
    const b = (n >>> 16) & 0xff;
    // 0.0.0.0/8
    if (a === 0) return true;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 127.0.0.0/8
    if (a === 127) return true;
    // 169.254.0.0/16 (link-local + cloud metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 100.64.0.0/10 CGNAT
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 192.0.0.0/24, 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 docs
    if (a === 192 && b === 0) return true;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
    if (a === 203 && b === 0) return true;
    // multicast / reserved
    if (a >= 224) return true;
    return false;
  }

  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    // IPv4-mapped ::ffff:x.x.x.x
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return isBlockedIp(mapped[1]);
    // fe80::/10 link-local
    if (
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    ) {
      return true;
    }
    // fc00::/7 ULA
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    return false;
  }

  return true;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === 'metadata.google.internal') return true;
  return false;
}

/**
 * 校验 URL 为安全 HTTPS，并 DNS 解析拒绝私网 IP。
 * @returns 规范化后的 href
 */
export async function assertSafeHttpsUrl(raw: string): Promise<string> {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new UnsafeUrlError('URL 为空');
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UnsafeUrlError('URL 无效');
  }

  if (url.protocol !== 'https:') {
    throw new UnsafeUrlError('仅允许 HTTPS');
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError('不允许 URL 内嵌凭据');
  }

  const hostname = url.hostname;
  if (isBlockedHostname(hostname)) {
    throw new UnsafeUrlError(`禁止的主机名: ${hostname}`);
  }

  // 字面量 IP
  const hostAsIp = hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostAsIp)) {
    if (isBlockedIp(hostAsIp)) {
      throw new UnsafeUrlError(`禁止访问地址: ${hostAsIp}`);
    }
    return url.href;
  }

  // DNS 解析全部 A/AAAA
  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (error: any) {
    throw new UnsafeUrlError(`DNS 解析失败: ${error?.message || hostname}`);
  }

  if (!records?.length) {
    throw new UnsafeUrlError(`DNS 无记录: ${hostname}`);
  }

  for (const rec of records) {
    if (isBlockedIp(rec.address)) {
      throw new UnsafeUrlError(`解析到禁止地址 ${rec.address}`);
    }
  }

  return url.href;
}

/** http(s) 封面：http 升 https 后再校验 */
export async function assertSafeCoverUrl(raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://')) {
    return assertSafeHttpsUrl(`https://${trimmed.slice('http://'.length)}`);
  }
  return assertSafeHttpsUrl(trimmed);
}
