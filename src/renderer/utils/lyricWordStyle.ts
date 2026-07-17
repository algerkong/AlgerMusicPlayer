/**
 * 逐字高亮：当前行所有词始终同一绘制路径（background-clip 渐变），
 * 已唱=100%、在唱=进度、未唱=0%。切词时不切换 solid color / fill，避免闪一下。
 */

export type WordTiming = {
  startTime: number;
  duration: number;
};

export type WordStyleColors = {
  primary: string;
  active: string;
};

export function wordProgress(currentTimeMs: number, word: WordTiming): number {
  const start = Number(word.startTime) || 0;
  const dur = Math.max(40, Number(word.duration) || 40);
  if (currentTimeMs <= start) return 0;
  if (currentTimeMs >= start + dur) return 1;
  return (currentTimeMs - start) / dur;
}

/** 当前行词样式：永远 clip 渐变，不用 color + WebkitTextFillColor 两套路径 */
export function getActiveLineWordStyle(
  currentTimeMs: number,
  word: WordTiming,
  colors: WordStyleColors
): Record<string, string> {
  const p = wordProgress(currentTimeMs, word);
  // 已唱完：整词 active；未开始：整词 primary；进行中：连续进度
  // 硬边界（不用 soft edge 跨色带），避免字中间出现脏边；关键是「不换绘制模式」
  const pct = Math.max(0, Math.min(100, p * 100));

  return {
    backgroundImage: `linear-gradient(to right, ${colors.active} 0%, ${colors.active} ${pct}%, ${colors.primary} ${pct}%, ${colors.primary} 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    // 始终 transparent，切词时属性集合不变，只改 gradient 百分比
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    transition: 'none',
    textShadow: 'none'
  };
}

/** 非当前行：也用同一 clip 路径画成「全 primary」，行切换时不闪 */
export function getInactiveLineWordStyle(colors: WordStyleColors): Record<string, string> {
  return {
    backgroundImage: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    transition: 'none',
    textShadow: 'none'
  };
}
