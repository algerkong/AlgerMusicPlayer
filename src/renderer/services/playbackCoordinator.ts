/**
 * 唯一播放命令入口（PlaybackCoordinator）。
 *
 * 指挥链（自上而下，禁止跳层）：
 *   UI / hooks
 *     → playlist.setPlay | nextPlay | prevPlay  （列表索引 / 连点合并 / 同曲 toggle）
 *     → playbackCoordinator.playTrack           （本文件）
 *     → playbackController.playTrack            （generation 取消 + resolve + 元数据）
 *     → audioService.play | preload             （双槽音频）
 *
 * 例外（仍经 coordinator 暴露，不直接 import playbackController）：
 *   - seamlessSwitchQuality：用户改音质 / 后台升质
 *   - tryUpgradePartialStreamNow：前缀秒播 → 完整文件
 *   - initializePlayState / setupUrlExpiredHandler：启动恢复
 *
 * 循环依赖：不静态导入 Pinia；controller 内动态 import store。
 */

import type { SongResult } from '@/types/music';

import {
  getCurrentGeneration,
  initializePlayState,
  playTrack,
  seamlessSwitchQuality,
  setupUrlExpiredHandler,
  tryUpgradePartialStreamNow
} from './playbackController';

export type PlaybackCommand =
  | { type: 'play'; song: SongResult; shouldPlay?: boolean }
  | { type: 'initialize' }
  | { type: 'setupUrlExpired' }
  | { type: 'switchQuality'; quality: string; songId?: string | number }
  | { type: 'tryUpgradePartial' };

export const playbackCoordinator = {
  /** 播放指定曲目（换曲主路径；列表层应先处理同曲 toggle） */
  playTrack,

  /** 当前 generation（调试/竞态检查） */
  getCurrentGeneration,

  /** 从持久化恢复播放状态 */
  initializePlayState,

  /** 注册 URL 过期处理 */
  setupUrlExpiredHandler,

  /** 无感换档：后台加载，就绪后接上 */
  seamlessSwitchQuality,

  /** 前缀流 → 完整文件无缝接上 */
  tryUpgradePartialStreamNow,

  /** 统一 command 分发（可选；与直接调方法等价） */
  async dispatch(command: PlaybackCommand): Promise<boolean | void> {
    switch (command.type) {
      case 'play':
        return playTrack(command.song, command.shouldPlay ?? true);
      case 'initialize':
        return initializePlayState();
      case 'setupUrlExpired':
        setupUrlExpiredHandler();
        return;
      case 'switchQuality':
        return seamlessSwitchQuality(command.quality, { songId: command.songId });
      case 'tryUpgradePartial':
        return tryUpgradePartialStreamNow();
      default:
        return;
    }
  }
};
