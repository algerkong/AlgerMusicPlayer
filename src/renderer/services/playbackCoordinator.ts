/**
 * 唯一播放命令入口（PlaybackCoordinator）。
 *
 * UI / Pinia store 只应通过本模块发 command，不要直接调 audioService 换曲。
 * 内部委托 playbackController（generation 取消 + 元数据加载）。
 *
 * 与 playerCore 的循环依赖：本模块不静态导入 playerCore；
 * playbackController 内对 store 使用动态 import。
 */

import type { SongResult } from '@/types/music';

import {
  getCurrentGeneration,
  initializePlayState,
  playTrack,
  setupUrlExpiredHandler
} from './playbackController';

export type PlaybackCommand =
  | { type: 'play'; song: SongResult; shouldPlay?: boolean }
  | { type: 'initialize' }
  | { type: 'setupUrlExpired' };

export const playbackCoordinator = {
  /** 播放指定曲目（换曲主路径） */
  playTrack,

  /** 当前 generation（调试/竞态检查） */
  getCurrentGeneration,

  /** 从持久化恢复播放状态 */
  initializePlayState,

  /** 注册 URL 过期处理 */
  setupUrlExpiredHandler,

  /** 统一 command 分发 */
  async dispatch(command: PlaybackCommand): Promise<boolean | void> {
    switch (command.type) {
      case 'play':
        return playTrack(command.song, command.shouldPlay ?? true);
      case 'initialize':
        return initializePlayState();
      case 'setupUrlExpired':
        setupUrlExpiredHandler();
        return;
      default:
        return;
    }
  }
};

export { getCurrentGeneration, initializePlayState, playTrack, setupUrlExpiredHandler };
