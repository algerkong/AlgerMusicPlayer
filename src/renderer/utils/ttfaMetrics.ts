/**
 * Time-To-First-Audio 轻量打点。
 * 仅 console，不落盘；用于对照 resolve / 首包 / promote 哪段最慢。
 */

let seq = 0;
let activeId = 0;
let t0 = 0;
let songKey = '';
const phases: Record<string, number> = {};

export function ttfaBegin(songId: string | number | undefined, reason = 'play'): number {
  seq += 1;
  activeId = seq;
  t0 = performance.now();
  songKey = songId != null ? String(songId) : '';
  for (const k of Object.keys(phases)) delete phases[k];
  console.info(`[ttfa#${activeId}] begin reason=${reason} id=${songKey}`);
  return activeId;
}

export function ttfaMark(id: number, phase: string): void {
  if (id !== activeId || !t0) return;
  const now = performance.now();
  phases[phase] = now;
  console.info(`[ttfa#${id}] ${phase} +${(now - t0).toFixed(0)}ms`);
}

export function ttfaAudioReady(how: 'promote' | 'load' | 'same' | 'resume'): void {
  if (!activeId || !t0) return;
  const now = performance.now();
  const resolveMs = phases.resolve != null ? phases.resolve - t0 : undefined;
  const total = now - t0;
  console.info(
    `[ttfa#${activeId}] audio_ready via=${how} total=${total.toFixed(0)}ms` +
      (resolveMs != null ? ` resolve=${resolveMs.toFixed(0)}ms` : '') +
      (songKey ? ` id=${songKey}` : '')
  );
  // 一轮结束，避免旧 mark 污染
  activeId = 0;
  t0 = 0;
}

export function ttfaCurrentId(): number {
  return activeId;
}
