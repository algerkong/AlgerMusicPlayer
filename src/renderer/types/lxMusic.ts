/**
 * 落雪音乐 (LX Music) 自定义源类型定义
 *
 * 参考文档: https://lxmusic.toside.cn/desktop/custom-source
 */

/**
 * 脚本元信息（从注释头解析）
 */
export type LxScriptInfo = {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  rawScript: string;
};

/**
 * 支持的音质类型
 */
export type LxQuality = '128k' | '320k' | 'flac' | 'flac24bit';

/**
 * 支持的音源 key
 */
export type LxSourceKey = 'kw' | 'kg' | 'tx' | 'wy' | 'mg' | 'local';

/**
 * 音源配置
 */
export type LxSourceConfig = {
  name: string;
  type: 'music';
  actions: ('musicUrl' | 'lyric' | 'pic')[];
  qualitys: LxQuality[];
};

/**
 * 初始化事件数据
 */
export type LxInitedData = {
  openDevTools?: boolean;
  sources: Partial<Record<LxSourceKey, LxSourceConfig>>;
};

/**
 * 请求事件数据
 */
export type LxRequestData = {
  source: LxSourceKey;
  action: 'musicUrl' | 'lyric' | 'pic';
  info: {
    type: LxQuality | null;
    musicInfo: LxMusicInfo;
  };
};

/**
 * 落雪音乐信息格式
 * 需要从 SongResult 转换而来
 */
export type LxMusicInfo = {
  songmid: string | number;
  name: string;
  singer: string;
  album?: string;
  albumId?: string | number;
  source?: string;
  interval?: string;
  img?: string;
  types?: { type: LxQuality; size?: string }[];
};

/**
 * 歌词返回格式
 */
export type LxLyricResult = {
  lyric: string;
  tlyric?: string | null;
  rlyric?: string | null;
  lxlyric?: string | null;
};

/**
 * 存储在 settings 中的单个落雪音源配置
 */
export type LxMusicScriptConfig = {
  id: string; // 唯一标识
  name: string; // 用户自定义名称，可编辑
  script: string; // 脚本内容
  info: LxScriptInfo; // 解析的脚本元信息
  sources: LxSourceKey[];
  enabled: boolean; // 是否启用
  createdAt: number; // 创建时间戳
};

/**
 * 存储在 settings 中的落雪音源列表
 */
export type LxMusicApiList = {
  apis: LxMusicScriptConfig[];
  activeId: string | null; // 当前激活的音源 ID
};

/**
 * globalThis.lx API 的事件名称
 */
export const LX_EVENT_NAMES = {
  inited: 'inited',
  request: 'request',
  updateAlert: 'updateAlert'
} as const;

/**
 * 落雪音源 key 到平台名称的映射
 */
export const LX_SOURCE_NAMES: Record<LxSourceKey, string> = {
  kw: 'kw',
  kg: 'kg',
  tx: 'tx',
  wy: 'wy',
  mg: 'mg',
  local: 'local'
};

/**
 * 本项目音质到落雪音质的映射
 */
export const QUALITY_TO_LX: Record<string, LxQuality> = {
  standard: '128k',
  higher: '320k',
  exhigh: '320k',
  lossless: 'flac',
  hires: 'flac24bit',
  jyeffect: 'flac',
  sky: 'flac',
  dolby: 'flac',
  jymaster: 'flac24bit'
};
