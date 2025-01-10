import store from '@/store';
import { ILyric } from '@/type/lyric';
import { isElectron } from '@/utils';
import request from '@/utils/request';
import requestMusic from '@/utils/request_music';

// 获取音乐音质详情
export const getMusicQualityDetail = (id: number) => {
  return request.get('/song/music/detail', { params: { id } });
};

// 根据音乐Id获取音乐播放URl
export const getMusicUrl = async (id: number) => {
  const res = await request.get('/song/download/url/v1', {
    params: {
      id,
      level: store.state.setData.musicQuality || 'higher'
    }
  });

  if (res.data.data.url) {
    return { data: { data: [{ url: res.data.data.url }] } };
  }

  return await request.get('/song/url/v1', {
    params: {
      id,
      level: store.state.setData.musicQuality || 'higher'
    }
  });
};

// 获取歌曲详情
export const getMusicDetail = (ids: Array<number>) => {
  return request.get('/song/detail', { params: { ids: ids.join(',') } });
};

// 根据音乐Id获取音乐歌词
export const getMusicLrc = (id: number) => {
  return request.get<ILyric>('/lyric', { params: { id } });
};

export const getParsingMusicUrl = (id: number, data: any) => {
  if (isElectron) {
    return window.api.unblockMusic(id, data);
  }
  return requestMusic.get<any>('/music', { params: { id } });
};

// 收藏歌曲
export const likeSong = (id: number, like: boolean = true) => {
  return request.get('/like', { params: { id, like } });
};

// 获取用户喜欢的音乐列表
export const getLikedList = () => {
  return request.get('/likelist');
};
