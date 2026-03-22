import request from '@/utils/request';

// 获取歌手详情
export const getArtistDetail = (id) => {
  return request.get('/artist/detail', { params: { id } });
};

// 获取歌手热门歌曲
export const getArtistTopSongs = (params) => {
  return request.get('/artist/songs', {
    params: {
      ...params,
      order: 'hot'
    }
  });
};

// 获取歌手专辑
export const getArtistAlbums = (params) => {
  return request.get('/artist/album', { params });
};

// 获取关注歌手新歌
export const getArtistNewSongs = (limit: number = 20) => {
  return request.get<any>('/artist/new/song', { params: { limit } });
};
