import type { SongResult } from '@/types/music';

/**
 * 预加载服务
 *
 * 新架构下 audioService 使用单一 HTMLAudioElement（换歌改 src），
 * 不再需要预创建 Howl 实例。PreloadService 改为验证 URL 可用性并缓存元数据。
 */
class PreloadService {
  private validatedUrls: Map<string | number, string> = new Map();
  private loadingPromises: Map<string | number, Promise<string>> = new Map();

  /**
   * 验证歌曲 URL 可用性
   * 通过 HEAD 请求检查 URL 是否可访问，并缓存验证结果
   */
  public async load(song: SongResult): Promise<string> {
    if (!song || !song.id) {
      throw new Error('无效的歌曲对象');
    }

    if (!song.playMusicUrl) {
      throw new Error('歌曲没有 URL');
    }

    // 已验证过的 URL
    if (this.validatedUrls.has(song.id)) {
      console.log(`[PreloadService] 歌曲 ${song.name} URL 已验证，直接使用`);
      return this.validatedUrls.get(song.id)!;
    }

    // 正在验证中
    if (this.loadingPromises.has(song.id)) {
      console.log(`[PreloadService] 歌曲 ${song.name} 正在验证中，复用现有请求`);
      return this.loadingPromises.get(song.id)!;
    }

    console.log(`[PreloadService] 开始验证歌曲: ${song.name}`);

    const url = song.playMusicUrl;
    const loadPromise = this._validate(url, song);
    this.loadingPromises.set(song.id, loadPromise);

    try {
      const validatedUrl = await loadPromise;
      this.validatedUrls.set(song.id, validatedUrl);
      return validatedUrl;
    } finally {
      this.loadingPromises.delete(song.id);
    }
  }

  /**
   * 验证 URL 可用性（通过创建临时 Audio 元素检测是否可加载）
   */
  private async _validate(url: string, song: SongResult): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const testAudio = new Audio();
      testAudio.crossOrigin = 'anonymous';
      testAudio.preload = 'metadata';

      const cleanup = () => {
        testAudio.removeEventListener('loadedmetadata', onLoaded);
        testAudio.removeEventListener('error', onError);
        testAudio.src = '';
        testAudio.load();
      };

      const onLoaded = () => {
        // 检查时长
        const duration = testAudio.duration;
        const expectedDuration = (song.dt || 0) / 1000;

        if (expectedDuration > 0 && duration > 0 && isFinite(duration)) {
          const durationDiff = Math.abs(duration - expectedDuration);
          if (duration < expectedDuration * 0.5 && durationDiff > 10) {
            console.warn(
              `[PreloadService] 时长严重不足：实际 ${duration.toFixed(1)}s, 预期 ${expectedDuration.toFixed(1)}s (${song.name})，可能是试听版`
            );
            window.dispatchEvent(
              new CustomEvent('audio-duration-mismatch', {
                detail: {
                  songId: song.id,
                  songName: song.name,
                  actualDuration: duration,
                  expectedDuration
                }
              })
            );
          }
        }

        cleanup();
        resolve(url);
      };

      const onError = () => {
        cleanup();
        reject(new Error(`URL 验证失败: ${song.name}`));
      };

      testAudio.addEventListener('loadedmetadata', onLoaded);
      testAudio.addEventListener('error', onError);
      testAudio.src = url;
      testAudio.load();

      // 5秒超时
      setTimeout(() => {
        cleanup();
        // 超时不算失败，URL 可能是可用的只是服务器慢
        resolve(url);
      }, 5000);
    });
  }

  /**
   * 消耗已验证的 URL（从缓存移除）
   */
  public consume(songId: string | number): string | undefined {
    const url = this.validatedUrls.get(songId);
    if (url) {
      this.validatedUrls.delete(songId);
      console.log(`[PreloadService] 消耗预验证的歌曲: ${songId}`);
      return url;
    }
    return undefined;
  }

  /**
   * 取消预加载
   */
  public cancel(songId: string | number) {
    this.validatedUrls.delete(songId);
  }

  /**
   * 获取已验证的 URL
   */
  public getPreloadedSound(songId: string | number): string | undefined {
    return this.validatedUrls.get(songId);
  }

  /**
   * 清理所有缓存
   */
  public clearAll() {
    this.validatedUrls.clear();
    this.loadingPromises.clear();
  }
}

export const preloadService = new PreloadService();
