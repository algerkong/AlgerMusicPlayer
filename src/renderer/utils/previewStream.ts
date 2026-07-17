import type { SongResult } from '@/types/music';
import { getSongDurationMs } from '@/utils/songFields';

/**
 * 试听流缓存文件名带 `.preview.`（见 ly-music-source resolve）。
 * 切回已播过的歌时会直接复用 playMusicUrl，跳过 resolve，
 * 必须从 URL / 元数据恢复 isPreviewStream，否则歌词 base 被清零对不上。
 */
export function isPreviewStreamUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('.preview.');
}

/** 根据 URL / 已有字段恢复试听标记；不丢已有 preview.startMs */
export function restorePreviewStreamFlags(song: SongResult): SongResult {
  if (!song) return song;
  const url = song.playMusicUrl || '';
  if (isPreviewStreamUrl(url) || song.isPreviewStream) {
    song.isPreviewStream = true;
    if (!song.preview) {
      song.preview = { startMs: 0, durationMs: 0 };
    }
  }
  return song;
}

/**
 * 用「音频时长 vs 全曲时长」兜底：试听约 30–60s，全曲更长时对齐 preview.startMs。
 * @returns 应用后的 lyric base 秒；非试听返回 0
 */
export function detectPreviewLyricBaseSec(
  song: SongResult | null | undefined,
  audioDurationSec: number
): number {
  if (!song || !Number.isFinite(audioDurationSec) || audioDurationSec <= 0) {
    return song?.isPreviewStream && song.preview?.startMs
      ? Math.max(0, song.preview.startMs) / 1000
      : 0;
  }

  const fullMs = getSongDurationMs(song);
  const fullSec = fullMs > 10_000 ? fullMs / 1000 : fullMs > 0 ? fullMs : 0;

  // 明确标记或缓存路径
  if (song.isPreviewStream || isPreviewStreamUrl(song.playMusicUrl)) {
    const start = Number(song.preview?.startMs) || 0;
    return Math.max(0, start) / 1000;
  }

  // 时长启发式：音频明显短于全曲 → 当试听
  if (fullSec > 90 && audioDurationSec < fullSec * 0.45) {
    const start = Number(song.preview?.startMs) || 0;
    if (start > 0) {
      song.isPreviewStream = true;
      return start / 1000;
    }
  }

  return 0;
}
