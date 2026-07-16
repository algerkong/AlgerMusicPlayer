/**
 * 音质偏好 → 本曲可播档（自动回落）。
 * 录音室 / 全景声仅手选，不参与自动回落抢位。
 */

/** 普通音质阶梯（自动回落只用这些） */
export const AUTO_QUALITY_LADDER = ['lossless', 'highest', 'higher', 'medium'] as const;

/** 仅手选：自动回落时永不选中 */
export const MANUAL_ONLY_QUALITIES = new Set(['hi_res', 'spatial']);

/** 音质 key 归一 */
export const normalizeQualityKey = (q?: string) => {
  const s = String(q || '')
    .toLowerCase()
    .trim();
  if (s === 'standard' || s === '128') return 'medium';
  if (s === 'exhigh' || s === '320') return 'higher';
  if (s === 'hires' || s === 'hi-res') return 'hi_res';
  if (s === 'atmos') return 'spatial';
  if (s.includes('flac') && !s.includes('hi')) return 'lossless';
  return s;
};

export const qualityRank = (q?: string) => {
  const k = normalizeQualityKey(q);
  if (k === 'hi_res') return 110;
  if (k === 'spatial') return 105;
  if (k === 'lossless') return 100;
  if (k === 'highest') return 85;
  if (k === 'higher') return 80;
  if (k === 'medium') return 40;
  return 20;
};

/**
 * 本曲已有可用档时，把偏好压到本曲实际可播档。
 * - 无损无货 → 极高 → 较高 → 标准
 * - 录音室/全景：仅 wanted 就是该档且本曲有才用；否则走普通阶梯，绝不自动切过去
 */
export const clampQualityToAvailable = (wanted: string, available?: string[]) => {
  const want = normalizeQualityKey(wanted) || 'higher';
  if (!available?.length) return want;

  const availSet = new Set(available.map(normalizeQualityKey).filter(Boolean));
  if (availSet.has(want)) return want;

  let start = (AUTO_QUALITY_LADDER as readonly string[]).indexOf(want);
  if (start < 0) {
    // 手选录音室/全景但本曲没有：落到普通阶梯最高可用
    start = 0;
  }
  for (let i = start; i < AUTO_QUALITY_LADDER.length; i++) {
    const k = AUTO_QUALITY_LADDER[i];
    if (availSet.has(k)) return k;
  }
  for (const k of AUTO_QUALITY_LADDER) {
    if (availSet.has(k)) return k;
  }
  if (MANUAL_ONLY_QUALITIES.has(want)) return want;
  return want;
};
