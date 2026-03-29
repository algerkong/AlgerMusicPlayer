/**
 * 薄请求 ID 追踪器
 * 用于 usePlayerHooks.ts 内部检查请求是否仍为最新。
 * 实际的取消逻辑在 playbackController.ts 中（generation ID）。
 */

import type { SongResult } from '@/types/music';

class PlaybackRequestManager {
  private currentRequestId: string | null = null;
  private counter = 0;

  /**
   * 创建新请求，使之前的请求失效
   */
  createRequest(song: SongResult): string {
    const requestId = `req_${Date.now()}_${++this.counter}`;
    this.currentRequestId = requestId;
    console.log(`[RequestManager] 新请求: ${requestId}, 歌曲: ${song.name}`);
    return requestId;
  }

  /**
   * 检查请求是否仍为当前请求
   */
  isRequestValid(requestId: string): boolean {
    return this.currentRequestId === requestId;
  }

  /**
   * 激活请求（兼容旧调用，直接返回 isRequestValid 结果）
   */
  activateRequest(requestId: string): boolean {
    return this.isRequestValid(requestId);
  }

  /**
   * 标记请求完成
   */
  completeRequest(requestId: string): void {
    console.log(`[RequestManager] 完成: ${requestId}`);
  }

  /**
   * 标记请求失败
   */
  failRequest(requestId: string): void {
    console.log(`[RequestManager] 失败: ${requestId}`);
  }

  /**
   * 获取当前请求ID
   */
  getCurrentRequestId(): string | null {
    return this.currentRequestId;
  }
}

export const playbackRequestManager = new PlaybackRequestManager();
