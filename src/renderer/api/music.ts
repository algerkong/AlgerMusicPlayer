import store from '@/store';
import type { ILyric } from '@/type/lyric';
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
    return { data: { data: [{ ...res.data.data }] } };
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
export const getMusicLrc = async (id: number) => {
  if (isElectron) {
    // 先尝试从缓存获取
    const cachedLyric = await window.api.invoke('get-cached-lyric', id);
    console.log('cachedLyric', cachedLyric);
    if (cachedLyric) {
      return { data: cachedLyric };
    }
  }

  // 如果缓存中没有，则从服务器获取
  const res = await request.get<ILyric>('/lyric', { params: { id } });

  // 缓存完整的响应数据
  if (isElectron && res) {
    await window.api.invoke('cache-lyric', id, res.data);
  }

  return res;
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
