/** 合法播放模式：0 顺序 / 1 列表循环 / 2 随机。3 为已移除的心动模式。 */
export type PlayMode = 0 | 1 | 2;

/**
 * 将持久化恢复的 playMode 归一为合法值。
 * 旧用户可能仍持有心动模式 3 或其它脏数据。
 */
export function normalizePlayMode(mode: unknown): PlayMode {
  if (mode === 1 || mode === 2) return mode;
  return 0;
}
