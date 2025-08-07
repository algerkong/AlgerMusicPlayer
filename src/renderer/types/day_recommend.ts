export interface IDayRecommend {
  dailySongs: DailySong[];
  orderSongs: any[];
  recommendReasons: RecommendReason[];
  mvResourceInfos: null;
}

interface RecommendReason {
  songId: number;
  reason: string;
  reasonId: string;
  targetUrl: null;
}

interface DailySong {
  name: string;
  id: number;
  pst: number;
  t: number;
  ar: Ar[];
  alia: string[];
  pop: number;
  st: number;
  rt: null | string;
  fee: number;
  v: number;
  crbt: null;
  cf: string;
  al: Al;
  dt: number;
  h: H;
  m: H;
  l: H;
  sq: H | null;
  hr: H | null;
  a: null;
  cd: string;
  no: number;
  rtUrl: null;
  ftype: number;
  rtUrls: any[];
  djId: number;
  copyright: number;
  s_id: number;
  mark: number;
  originCoverType: number;
  originSongSimpleData: OriginSongSimpleDatum | null;
  tagPicList: null;
  resourceState: boolean;
  version: number;
  songJumpInfo: null;
  entertainmentTags: null;
  single: number;
  noCopyrightRcmd: null;
  rtype: number;
  rurl: null;
  mst: number;
  cp: number;
  mv: number;
  publishTime: number;
  reason: null | string;
  videoInfo: VideoInfo;
  recommendReason: null | string;
  privilege: Privilege;
  alg: string;
  tns?: string[];
  s_ctrp?: string;
}

interface Privilege {
  id: number;
  fee: number;
  payed: number;
  realPayed: number;
  st: number;
  pl: number;
  dl: number;
  sp: number;
  cp: number;
  subp: number;
  cs: boolean;
  maxbr: number;
  fl: number;
  pc: null;
  toast: boolean;
  flag: number;
  paidBigBang: boolean;
  preSell: boolean;
  playMaxbr: number;
  downloadMaxbr: number;
  maxBrLevel: string;
  playMaxBrLevel: string;
  downloadMaxBrLevel: string;
  plLevel: string;
  dlLevel: string;
  flLevel: string;
  rscl: null;
  freeTrialPrivilege: FreeTrialPrivilege;
  rightSource: number;
  chargeInfoList: ChargeInfoList[];
}

interface ChargeInfoList {
  rate: number;
  chargeUrl: null;
  chargeMessage: null;
  chargeType: number;
}

interface FreeTrialPrivilege {
  resConsumable: boolean;
  userConsumable: boolean;
  listenType: number;
  cannotListenReason: number;
  playReason: null;
}

interface VideoInfo {
  moreThanOne: boolean;
  video: Video | null;
}

interface Video {
  vid: string;
  type: number;
  title: string;
  playTime: number;
  coverUrl: string;
  publishTime: number;
  artists: null;
  alias: null;
}

interface OriginSongSimpleDatum {
  songId: number;
  name: string;
  artists: Artist[];
  albumMeta: Artist;
}

interface Artist {
  id: number;
  name: string;
}

interface H {
  br: number;
  fid: number;
  size: number;
  vd: number;
  sr: number;
}

interface Al {
  id: number;
  name: string;
  picUrl: string;
  tns: string[];
  pic_str?: string;
  pic: number;
}

interface Ar {
  id: number;
  name: string;
  tns: any[];
  alias: any[];
}
