export interface IBilibiliSearchResult {
  id: number;
  bvid: string;
  title: string;
  pic: string;
  duration: number | string;
  pubdate: number;
  ctime: number;
  author: string;
  view: number;
  danmaku: number;
  owner: {
    mid: number;
    name: string;
    face: string;
  };
  stat: {
    view: number;
    danmaku: number;
    reply: number;
    favorite: number;
    coin: number;
    share: number;
    like: number;
  };
}

export interface IBilibiliVideoDetail {
  aid: number;
  bvid: string;
  title: string;
  pic: string;
  desc: string;
  duration: number;
  pubdate: number;
  ctime: number;
  owner: {
    mid: number;
    name: string;
    face: string;
  };
  stat: {
    view: number;
    danmaku: number;
    reply: number;
    favorite: number;
    coin: number;
    share: number;
    like: number;
  };
  pages: IBilibiliPage[];
}

export interface IBilibiliPage {
  cid: number;
  page: number;
  part: string;
  duration: number;
  dimension: {
    width: number;
    height: number;
    rotate: number;
  };
}

export interface IBilibiliPlayUrl {
  durl?: {
    order: number;
    length: number;
    size: number;
    ahead: string;
    vhead: string;
    url: string;
    backup_url: string[];
  }[];
  dash?: {
    duration: number;
    minBufferTime: number;
    min_buffer_time: number;
    video: IBilibiliDashItem[];
    audio: IBilibiliDashItem[];
  };
  support_formats: {
    quality: number;
    format: string;
    new_description: string;
    display_desc: string;
  }[];
  accept_quality: number[];
  accept_description: string[];
  quality: number;
  format: string;
  timelength: number;
  high_format: string;
}

export interface IBilibiliDashItem {
  id: number;
  baseUrl: string;
  base_url: string;
  backupUrl: string[];
  backup_url: string[];
  bandwidth: number;
  mimeType: string;
  mime_type: string;
  codecs: string;
  width?: number;
  height?: number;
  frameRate?: string;
  frame_rate?: string;
  startWithSap?: number;
  start_with_sap?: number;
  codecid: number;
}
