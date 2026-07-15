import type { SongResult } from '@/types/music';

import { audioService } from './audioService';

/**
 * 预加载服务（P2：并入双槽 audioService）
 *
 * 旧实现用临时 Audio 做 metadata 探测，与 standby 槽无关且浪费连接。
 * 现在 load() = 把 URL 灌进 audioService.preload（真缓冲，切歌可 promote）。
 */
class PreloadService {
  private lastUrls = new Map<string | number, string>();
  private static readonly MAX = 100;

  /**
   * 预热歌曲音频到 standby 槽。
   * @returns 逻辑 URL（兼容旧调用方）
   */
  public async load(song: SongResult): Promise<string> {
    if (!song?.id) throw new Error('无效的歌曲对象');
    if (!song.playMusicUrl) throw new Error('歌曲没有 URL');

    const url = song.playMusicUrl;
    try {
      audioService.preload(url, song);
      this.lastUrls.set(song.id, url);
      if (this.lastUrls.size > PreloadService.MAX) {
        const oldest = this.lastUrls.keys().next().value;
        if (oldest !== undefined) this.lastUrls.delete(oldest);
      }
      console.info(`[PreloadService] standby preload id=${song.id} ${song.name || ''}`);
    } catch (e) {
      console.warn('[PreloadService] preload failed', e);
    }
    return url;
  }

  public consume(songId: string | number): string | undefined {
    const url = this.lastUrls.get(songId);
    if (url) {
      this.lastUrls.delete(songId);
      return url;
    }
    return undefined;
  }

  public cancel(songId: string | number) {
    this.lastUrls.delete(songId);
  }

  public getPreloadedSound(songId: string | number): string | undefined {
    return this.lastUrls.get(songId);
  }

  public clearAll() {
    this.lastUrls.clear();
  }
}

export const preloadService = new PreloadService();
