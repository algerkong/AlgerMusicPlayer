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
  id: number;
  type: number;
  name: string;
  copywriter?: any;
  picUrl: string;
  canDislike: boolean;
  trackNumberUpdateTime?: any;
  song: Song;
  alg: string;
  count?: number;
  playLoading?: boolean;
  ar?: Artist[];
  al?: Album;
  backgroundColor?: string;
  primaryColor?: string;
  playMusicUrl?: string;
  lyric?: ILyric;
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

interface Artist {
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
