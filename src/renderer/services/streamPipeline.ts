/**
 * 流式播放管线策略（大厂向）
 *
 * 现实约束：音源是 progressive HTTP（非 HLS 切片列表），整曲仍由浏览器
 * 边下边播；本模块做的是「策略层」优化，而不是自建 MSE 分片播放器：
 *
 * 1. 低码率起播 + 动态升质（boot → target）
 * 2. 预加载 / 预缓冲水位（何时 promote / 何时升质）
 * 3. Range 首段预热（主进程 CDN 热连接，非整曲下载）
 * 4. 本地磁盘缓存竞速
 * 5. 解码侧：AudioContext 预热 + 缓冲水位再切轨
 * 6. 网络自适应：根据近期 TTFA 降 boot 档
 */

import { clampQualityToAvailable, normalizeQualityKey, qualityRank } from '../utils/qualityClamp';

/** 起播缓冲：有多少秒 ahead 才认为「可稳播」 */
export const BOOT_BUFFER_READY_SEC = 1.2;
/** 升质前当前曲至少还要缓冲这么多秒，避免换档卡顿 */
export const UPGRADE_MIN_BUFFER_SEC = 4;
/** 升质前至少播了这么久，再换无损（避免刚起播就抢带宽） */
export const UPGRADE_MIN_PLAYED_SEC = 2.5;
/** standby 可 promote 的缓冲水位 */
export const PROMOTE_MIN_BUFFER_SEC = 0.8;
/** 网络差时 boot 再降一档 */
export const SLOW_NETWORK_TTFA_MS = 1800;
/** 记录最近多少次首包耗时 */
const TTFA_SAMPLE_MAX = 12;

export type NetworkClass = 'fast' | 'normal' | 'slow';

const recentTtfaMs: number[] = [];

/** 记录一次起播总耗时（ms），供 boot 策略自适应 */
export function recordTtfaSample(totalMs: number): void {
  if (!Number.isFinite(totalMs) || totalMs <= 0) return;
  recentTtfaMs.push(totalMs);
  while (recentTtfaMs.length > TTFA_SAMPLE_MAX) recentTtfaMs.shift();
}

export function getNetworkClass(): NetworkClass {
  if (recentTtfaMs.length < 3) return 'normal';
  const sorted = [...recentTtfaMs].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  if (p50 >= SLOW_NETWORK_TTFA_MS) return 'slow';
  if (p50 <= 700) return 'fast';
  return 'normal';
}

/**
 * 起播档：目标很高时先用较低档出声，后台再升。
 * - 无损/录音室/全景 → 极高（或更高可用）
 * - 极高 → 较高
 * - 网络差再降一档
 * - 用户 force 手选不走这里（外层 forceResolve）
 */
export function pickBootQuality(
  targetQuality: string,
  available?: string[],
  network: NetworkClass = getNetworkClass()
): { boot: string; upgradeTo?: string } {
  const target = clampQualityToAvailable(targetQuality, available);
  let boot = target;

  if (qualityRank(target) >= qualityRank('lossless')) {
    // 无损+ → 先极高
    boot = clampQualityToAvailable('highest', available);
  } else if (normalizeQualityKey(target) === 'highest') {
    boot = clampQualityToAvailable('higher', available);
  }

  if (network === 'slow' && qualityRank(boot) > qualityRank('medium')) {
    // 弱网再降一档
    if (normalizeQualityKey(boot) === 'highest') {
      boot = clampQualityToAvailable('higher', available);
    } else if (normalizeQualityKey(boot) === 'higher') {
      boot = clampQualityToAvailable('medium', available);
    }
  }

  if (qualityRank(target) > qualityRank(boot)) {
    return { boot, upgradeTo: target };
  }
  return { boot: target };
}

/** HTMLMediaElement 当前播放点之后已缓冲的秒数 */
export function getBufferedAheadSeconds(el: HTMLMediaElement | null | undefined): number {
  if (!el) return 0;
  try {
    const t = el.currentTime || 0;
    const buf = el.buffered;
    if (!buf || buf.length === 0) return 0;
    for (let i = 0; i < buf.length; i++) {
      const start = buf.start(i);
      const end = buf.end(i);
      if (t >= start - 0.05 && t <= end + 0.05) {
        return Math.max(0, end - t);
      }
      if (t < start) {
        // 还在空洞前，算不到 ahead
        return 0;
      }
    }
    // 取最后一个区间终点
    const lastEnd = buf.end(buf.length - 1);
    return Math.max(0, lastEnd - t);
  } catch {
    return 0;
  }
}

/** 是否达到「可稳起播」缓冲 */
export function isBootBufferReady(el: HTMLMediaElement | null | undefined): boolean {
  if (!el) return false;
  if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return getBufferedAheadSeconds(el) >= BOOT_BUFFER_READY_SEC || el.readyState >= 3;
  }
  return el.readyState >= 2 && getBufferedAheadSeconds(el) >= 0.4;
}

/** 是否适合现在做无损升质（缓冲 + 已播时长） */
export function canUpgradeNow(el: HTMLMediaElement | null | undefined): boolean {
  if (!el) return false;
  const played = Number.isFinite(el.currentTime) ? el.currentTime : 0;
  if (played < UPGRADE_MIN_PLAYED_SEC) return false;
  return getBufferedAheadSeconds(el) >= UPGRADE_MIN_BUFFER_SEC;
}

/** standby 是否够 promote */
export function canPromoteFromBuffer(el: HTMLMediaElement | null | undefined): boolean {
  if (!el) return false;
  return el.readyState >= 1 && getBufferedAheadSeconds(el) >= PROMOTE_MIN_BUFFER_SEC;
}

/**
 * 等待缓冲水位；超时仍返回当前状态（调用方决定是否继续）。
 */
export async function waitForBuffer(
  getEl: () => HTMLMediaElement | null | undefined,
  minAheadSec: number,
  timeoutMs: number,
  isCancelled?: () => boolean
): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (isCancelled?.()) return false;
    const el = getEl();
    if (el && getBufferedAheadSeconds(el) >= minAheadSec) return true;
    if (el && el.readyState >= 3 && getBufferedAheadSeconds(el) >= minAheadSec * 0.5) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  const el = getEl();
  return !!el && getBufferedAheadSeconds(el) >= Math.min(1, minAheadSec);
}
