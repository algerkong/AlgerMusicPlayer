import { Howl } from 'howler';

import type { SongResult } from '@/types/music';

class PreloadService {
  private loadingPromises: Map<string | number, Promise<Howl>> = new Map();
  private preloadedSounds: Map<string | number, Howl> = new Map();

  /**
   * 加载并验证音频
   * 如果已经在加载中，返回现有的 Promise
   * 如果已经加载完成，返回缓存的 Howl 实例
   */
  public async load(song: SongResult): Promise<Howl> {
    if (!song || !song.id) {
      throw new Error('无效的歌曲对象');
    }

    // 1. 检查是否有正在进行的加载
    if (this.loadingPromises.has(song.id)) {
      console.log(`[PreloadService] 歌曲 ${song.name} 正在加载中，复用现有请求`);
      return this.loadingPromises.get(song.id)!;
    }

    // 2. 检查是否有已完成的缓存
    if (this.preloadedSounds.has(song.id)) {
      const sound = this.preloadedSounds.get(song.id)!;
      if (sound.state() === 'loaded') {
        console.log(`[PreloadService] 歌曲 ${song.name} 已预加载完成，直接使用`);
        return sound;
      } else {
        // 如果缓存的音频状态不正常，清理并重新加载
        this.preloadedSounds.delete(song.id);
      }
    }

    // 3. 开始新的加载过程
    const loadPromise = this._performLoad(song);
    this.loadingPromises.set(song.id, loadPromise);

    try {
      const sound = await loadPromise;
      this.preloadedSounds.set(song.id, sound);
      return sound;
    } finally {
      this.loadingPromises.delete(song.id);
    }
  }

  /**
   * 执行实际的加载和验证逻辑
   */
  private async _performLoad(song: SongResult): Promise<Howl> {
    console.log(`[PreloadService] 开始加载歌曲: ${song.name}`);

    if (!song.playMusicUrl) {
      throw new Error('歌曲没有 URL');
    }

    // 创建初始音频实例
    const sound = await this._createSound(song.playMusicUrl);

    // 检查时长
    const duration = sound.duration();
    const expectedDuration = (song.dt || 0) / 1000;

    // 时长差异只记录警告，不自动触发重新解析
    // 用户可以通过 ReparsePopover 手动选择正确的音源
    if (expectedDuration > 0 && Math.abs(duration - expectedDuration) > 5) {
      console.warn(
        `[PreloadService] 时长差异警告：实际 ${duration.toFixed(1)}s, 预期 ${expectedDuration.toFixed(1)}s (${song.name})`
      );
    }

    return sound;
  }

  private _createSound(url: string): Promise<Howl> {
    return new Promise((resolve, reject) => {
      const sound = new Howl({
        src: [url],
        html5: true,
        preload: true,
        autoplay: false,
        onload: () => resolve(sound),
        onloaderror: (_, err) => reject(err)
      });
    });
  }

  /**
   * 取消特定歌曲的预加载（如果可能）
   * 注意：Promise 无法真正取消，但我们可以清理结果
   */
  public cancel(songId: string | number) {
    if (this.preloadedSounds.has(songId)) {
      const sound = this.preloadedSounds.get(songId)!;
      sound.unload();
      this.preloadedSounds.delete(songId);
    }
    // loadingPromises 中的任务会继续执行，但因为 preloadedSounds 中没有记录，
    // 下次请求时会重新加载（或者我们可以让 _performLoad 检查一个取消标记，但这增加了复杂性）
  }

  /**
   * 获取已预加载的音频实例（如果存在）
   */
  public getPreloadedSound(songId: string | number): Howl | undefined {
    return this.preloadedSounds.get(songId);
  }

  /**
   * 消耗（使用）已预加载的音频
   * 从缓存中移除但不 unload（由调用方管理生命周期）
   * @returns 预加载的 Howl 实例，如果没有则返回 undefined
   */
  public consume(songId: string | number): Howl | undefined {
    const sound = this.preloadedSounds.get(songId);
    if (sound) {
      this.preloadedSounds.delete(songId);
      console.log(`[PreloadService] 消耗预加载的歌曲: ${songId}`);
      return sound;
    }
    return undefined;
  }

  /**
   * 清理所有预加载资源
   */
  public clearAll() {
    this.preloadedSounds.forEach((sound) => sound.unload());
    this.preloadedSounds.clear();
    this.loadingPromises.clear();
  }
}

export const preloadService = new PreloadService();
