export interface LyricConfig {
  hideCover: boolean;
  centerLyrics: boolean;
  fontSize: number;
  letterSpacing: number;
  fontWeight: number;
  lineHeight: number;
  showTranslation: boolean;
  theme: 'default' | 'light' | 'dark';
  hidePlayBar: boolean;
  translationEngine?: 'none' | 'opencc';
  pureModeEnabled: boolean;
  hideMiniPlayBar: boolean;
  hideLyrics: boolean;
  focusCurrentLyric: boolean; // 聚焦当前歌词：当前行清晰放大，其余行模糊/变淡（Apple Music 风格）
  contentWidth: number; // 内容区域宽度百分比
  // 移动端配置
  mobileLayout: 'default' | 'ios' | 'android';
  mobileCoverStyle: 'record' | 'square' | 'full';
  mobileShowLyricLines: number;
  // 背景自定义功能
  useCustomBackground: boolean; // 是否使用自定义背景
  backgroundMode: 'solid' | 'gradient' | 'image' | 'css'; // 背景模式
  solidColor: string; // 纯色背景颜色值
  gradientColors: {
    colors: string[]; // 渐变颜色数组
    direction: string; // 渐变方向
  };
  backgroundImage?: string; // 图片背景 (Base64 或 URL)
  imageBlur: number; // 图片模糊度 (0-20px)
  imageBrightness: number; // 图片明暗度 (0-200%, 100为正常)
  customCss?: string; // 自定义 CSS 样式
}

export const DEFAULT_LYRIC_CONFIG: LyricConfig = {
  hideCover: false,
  centerLyrics: false,
  fontSize: 22,
  letterSpacing: 0,
  fontWeight: 500,
  lineHeight: 2,
  showTranslation: true,
  theme: 'default',
  hidePlayBar: true,
  hideMiniPlayBar: false,
  pureModeEnabled: false,
  hideLyrics: false,
  focusCurrentLyric: false, // 默认关闭聚焦当前歌词效果
  contentWidth: 75, // 默认100%宽度
  // 移动端默认配置
  mobileLayout: 'ios',
  mobileCoverStyle: 'full',
  mobileShowLyricLines: 3,
  // 翻译引擎: 'none' or 'opencc'
  translationEngine: 'none',
  // 背景自定义功能默认值
  useCustomBackground: false,
  backgroundMode: 'solid',
  solidColor: '#1a1a1a',
  gradientColors: {
    colors: ['#1a1a1a', '#000000'],
    direction: 'to bottom'
  },
  backgroundImage: undefined,
  imageBlur: 0,
  imageBrightness: 100,
  customCss: undefined
};

export interface ILyric {
  sgc: boolean;
  sfy: boolean;
  qfy: boolean;
  lrc: Lrc;
  klyric: Lrc;
  tlyric: Lrc;
  code: number;
}

interface Lrc {
  version: number;
  lyric: string;
}
