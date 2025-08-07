// 音乐平台类型
export type Platform = 'qq' | 'migu' | 'kugou' | 'pyncmd' | 'joox' | 'bilibili' | 'gdmusic';

// 默认平台列表
export const DEFAULT_PLATFORMS: Platform[] = ['migu', 'kugou', 'pyncmd', 'bilibili'];

export interface IRecommendMusic {
  code: number;
  category: number;
  result: SongResult[];
}
export interface ILyricText {
  text: string;
  trText: string;
}
export interface ILyric {
  lrcTimeArray: number[];
  lrcArray: ILyricText[];
}

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
  count: number;
  playMusicUrl?: string;
  playLoading?: boolean;
  lyric?: ILyric;
  backgroundColor?: string;
  primaryColor?: string;
  bilibiliData?: {
    bvid: string;
    cid: number;
  };
  source?: 'netease' | 'bilibili';
  // 过期时间
  expiredAt?: number;
  // 获取时间
  createdAt?: number;
  // 时长
  duration?: number;
  dt?: number;
  isFirstPlay?: boolean;
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

export interface IPlayMusicUrl {
  data: Datum[];
  code: number;
}

interface Datum {
  id: number;
  url: string;
  br: number;
  size: number;
  md5: string;
  code: number;
  expi: number;
  type: string;
  gain: number;
  fee: number;
  uf?: any;
  payed: number;
  flag: number;
  canExtend: boolean;
  freeTrialInfo?: any;
  level: string;
  encodeType: string;
  freeTrialPrivilege: FreeTrialPrivilege;
  freeTimeTrialPrivilege: FreeTimeTrialPrivilege;
  urlSource: number;
}

interface FreeTimeTrialPrivilege {
  resConsumable: boolean;
  userConsumable: boolean;
  type: number;
  remainTime: number;
}

interface FreeTrialPrivilege {
  resConsumable: boolean;
  userConsumable: boolean;
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

// 音乐源类型定义
export type MusicSourceType =
  | 'tencent'
  | 'kugou'
  | 'migu'
  | 'netease'
  | 'joox'
  | 'ytmusic'
  | 'spotify'
  | 'qobuz'
  | 'deezer'
  | 'gdmusic';

// 更多音乐相关的类型可以在这里定义
