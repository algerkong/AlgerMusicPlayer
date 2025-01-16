import { musicDB } from '@/hooks/MusicHook';
import store from '@/store';
import type { ILyric } from '@/type/lyric';
import { isElectron } from '@/utils';
import request from '@/utils/request';
import requestMusic from '@/utils/request_music';

const { addData, getData, deleteData } = musicDB;

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
  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000; // 10天的毫秒数

  try {
    // 尝试获取缓存的歌词
    const cachedLyric = await getData('music_lyric', id);
    if (cachedLyric?.createTime && Date.now() - cachedLyric.createTime < TEN_DAYS_MS) {
      return { ...cachedLyric };
    }

    // 获取新的歌词数据
    const res = await request.get<ILyric>('/lyric', { params: { id } });

    // 只有在成功获取新数据后才删除旧缓存并添加新缓存
    if (res?.data) {
      if (cachedLyric) {
        await deleteData('music_lyric', id);
      }
      addData('music_lyric', { id, data: res.data, createTime: Date.now() });
    }

    return res;
  } catch (error) {
    console.error('获取歌词失败:', error);
    throw error; // 向上抛出错误，让调用者处理
  }
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
