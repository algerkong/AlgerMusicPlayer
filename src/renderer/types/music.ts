// 音乐内容来源标记
export type Platform = 'local' | string;

// 默认平台（本地优先；在线音源将接入独立库）
export const DEFAULT_PLATFORMS: Platform[] = ['local'];

export interface IRecommendMusic {
  code: number;
  category: number;
  result: SongResult[];
}
// 逐字歌词单词数据
export interface IWordData {
  text: string;
  startTime: number;
  duration: number;
  space?: boolean;
}

export interface ILyricText {
  text: string;
  trText: string;
  words?: IWordData[];
  hasWordByWord?: boolean;
  startTime?: number;
  duration?: number;
}

export interface ILyric {
  lrcTimeArray: number[];
  lrcArray: ILyricText[];
  // 新增字段标识是否包含逐字歌词
  hasWordByWord?: boolean;
}

/**
 * 播放器兼容 DTO（历史包袱）。
 * 新代码优先：shared/domain Track + PlaybackRuntime；经 trackBridge 互转。
 * 运行态字段（playMusicUrl / lyric / colors 等）不应视为曲目元数据。
 */
export interface SongResult {
  id: string | number;
  name: string;
  picUrl: string;
  playCount?: number;
  song?: any;
  copywriter?: string;
  type?: number;
  canDislike?: boolean;
  program?: any;
  alg?: string;
  ar: Artist[];
  artists?: Artist[];
  al: Album;
  album?: Album;
  /** 翻译名（外语歌曲的中文译名等，来自网易 API） */
  tns?: string[];
  /** 别名 */
  alia?: string[];
  count: number;
  playMusicUrl?: string;
  playLoading?: boolean;
  lyric?: ILyric;
  backgroundColor?: string;
  primaryColor?: string;
  source?: string;
  // 过期时间
  expiredAt?: number;
  // 获取时间
  createdAt?: number;
  // 时长
  duration?: number;
  dt?: number;
  isFirstPlay?: boolean;
  isPodcast?: boolean;
  /** 平台侧 VIP/会员曲（汽水 label_info.only_vip_playable） */
  isVip?: boolean;
  /** 原唱：label_info.is_original === true；undefined 未知 */
  isOriginal?: boolean;
  /** 限免 */
  isLimitedFree?: boolean;
  limitedFreeExpireAt?: number;
  hasPreview?: boolean;
  preview?: { startMs: number; durationMs: number; vid?: string };
  /**
   * 当前解析到的流是否为试听片段（非全曲）。
   * true 时歌词时钟 = 音频进度 + preview.startMs。
   */
  isPreviewStream?: boolean;
  isDigital?: boolean;
  digital?: {
    paymentItemId?: string;
    amount?: number;
    paymentItemType?: number;
    onlineDate?: number;
  };
  genreTags?: string[];
  lyricists?: string[];
  composers?: string[];
}

export interface Song {
  name: string;
  id: number;
  position: number;
  alias: string[];
  status: number;
  fee: number;
  copyrightId: number;
  disc: string;
  no: number;
  artists: Artist[];
  album: Album;
  starred: boolean;
  popularity: number;
  score: number;
  starredNum: number;
  duration: number;
  playedNum: number;
  dayPlays: number;
  hearTime: number;
  ringtone: string;
  crbt?: any;
  audition?: any;
  copyFrom: string;
  commentThreadId: string;
  rtUrl?: any;
  ftype: number;
  rtUrls: any[];
  copyright: number;
  transName?: any;
  sign?: any;
  mark: number;
  originCoverType: number;
  originSongSimpleData?: any;
  single: number;
  noCopyrightRcmd?: any;
  rtype: number;
  rurl?: any;
  mvid: number;
  bMusic: BMusic;
  mp3Url?: any;
  hMusic: BMusic;
  mMusic: BMusic;
  lMusic: BMusic;
  exclusive: boolean;
  privilege: Privilege;
  count?: number;
  playLoading?: boolean;
  picUrl?: string;
  ar: Artist[];
}

interface Privilege {
  id: number;
  fee: number;
  payed: number;
  st: number;
  pl: number;
  dl: number;
  sp: number;
  cp: number;
  subp: number;
  cs: boolean;
  maxbr: number;
  fl: number;
  toast: boolean;
  flag: number;
  preSell: boolean;
  playMaxbr: number;
  downloadMaxbr: number;
  rscl?: any;
  freeTrialPrivilege: FreeTrialPrivilege;
  chargeInfoList: ChargeInfoList[];
}

interface ChargeInfoList {
  rate: number;
  chargeUrl?: any;
  chargeMessage?: any;
  chargeType: number;
}

interface FreeTrialPrivilege {
  resConsumable: boolean;
  userConsumable: boolean;
}

interface BMusic {
  name?: any;
  id: number;
  size: number;
  extension: string;
  sr: number;
  dfsId: number;
  bitrate: number;
  playTime: number;
  volumeDelta: number;
}

interface Album {
  name: string;
  id: number;
  type: string;
  size: number;
  picId: number;
  blurPicUrl: string;
  companyId: number;
  pic: number;
  picUrl: string;
  publishTime: number;
  description: string;
  tags: string;
  company: string;
  briefDesc: string;
  artist: Artist;
  songs: any[];
  alias: string[];
  status: number;
  copyrightId: number;
  commentThreadId: string;
  artists: Artist[];
  subType: string;
  transName?: any;
  onSale: boolean;
  mark: number;
  picId_str: string;
}

export interface Artist {
  name: string;
  id: number;
  picId: number;
  img1v1Id: number;
  briefDesc: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  alias: any[];
  trans: string;
  musicSize: number;
  topicPerson: number;
}

export interface IArtists {
  id: number;
  name: string;
  picUrl: string | null;
  alias: string[];
  albumSize: number;
  picId: number;
  fansGroup: null;
  img1v1Url: string;
  img1v1: number;
  trans: null;
}
