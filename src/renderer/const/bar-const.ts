export const USER_SET_OPTIONS = [
  // {
  //   label: '打卡',
  //   key: 'card',
  // },
  // {
  //   label: '听歌升级',
  //   key: 'card_music',
  // },
  // {
  //   label: '歌曲次数',
  //   key: 'listen',
  // },
  {
    label: '退出登录',
    key: 'logout'
  },
  {
    label: '设置',
    key: 'set'
  }
];

export const SEARCH_TYPES = [
  {
    label: 'search.search.single', // 单曲
    key: 1
  },
  {
    label: 'search.search.album', // 专辑
    key: 10
  },
  {
    label: 'search.search.playlist', // 歌单
    key: 1000
  },
  {
    label: 'search.search.mv', // MV
    key: 1004
  },
  {
    label: 'search.search.bilibili', // B站
    key: 2000
  }
];

export const SEARCH_TYPE = {
  MUSIC: 1, // 单曲
  ALBUM: 10, // 专辑
  ARTIST: 100, // 歌手
  PLAYLIST: 1000, // 歌单
  MV: 1004, // MV
  BILIBILI: 2000 // B站视频
} as const;
