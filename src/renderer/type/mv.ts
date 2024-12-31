export interface IMvItem {
  id: number;
  cover: string;
  name: string;
  playCount: number;
  briefDesc?: any;
  desc?: any;
  artistName: string;
  artistId: number;
  duration: number;
  mark: number;
  mv: IMvData;
  lastRank: number;
  score: number;
  subed: boolean;
  artists: Artist[];
  transNames?: string[];
  alias?: string[];
}

export interface IMvData {
  authId: number;
  status: number;
  id: number;
  title: string;
  subTitle: string;
  appTitle: string;
  aliaName: string;
  transName: string;
  pic4v3: number;
  pic16v9: number;
  caption: number;
  captionLanguage: string;
  style?: any;
  mottos: string;
  oneword?: any;
  appword: string;
  stars?: any;
  desc: string;
  area: string;
  type: string;
  subType: string;
  neteaseonly: number;
  upban: number;
  topWeeks: string;
  publishTime: string;
  online: number;
  score: number;
  plays: number;
  monthplays: number;
  weekplays: number;
  dayplays: number;
  fee: number;
  artists: Artist[];
  videos: Video[];
}

interface Video {
  tagSign: TagSign;
  tag: string;
  url: string;
  duration: number;
  size: number;
  width: number;
  height: number;
  container: string;
  md5: string;
  check: boolean;
}

interface TagSign {
  br: number;
  type: string;
  tagSign: string;
  resolution: number;
  mvtype: string;
}

interface Artist {
  id: number;
  name: string;
}

// {
//   "id": 14686812,
//   "url": "http://vodkgeyttp8.vod.126.net/cloudmusic/e18b/core/aa57/6f56150a35613ef77fc70b253bea4977.mp4?wsSecret=84a301277e05143de1dd912d2a4dbb0d&wsTime=1703668700",
//   "r": 1080,
//   "size": 215391070,
//   "md5": "",
//   "code": 200,
//   "expi": 3600,
//   "fee": 0,
//   "mvFee": 0,
//   "st": 0,
//   "promotionVo": null,
//   "msg": ""
// }

export interface IMvUrlData {
  id: number;
  url: string;
  r: number;
  size: number;
  md5: string;
  code: number;
  expi: number;
  fee: number;
  mvFee: number;
  st: number;
  promotionVo: null | any;
  msg: string;
}
