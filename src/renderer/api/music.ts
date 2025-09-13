import { musicDB } from '@/hooks/MusicHook';
import { useSettingsStore, useUserStore } from '@/store';
import type { ILyric } from '@/types/lyric';
import type { SongResult } from '@/types/music';
import request from '@/utils/request';

import { MusicParser, type MusicParseResult } from './musicParser';

const { addData, getData, deleteData } = musicDB;

// 获取音乐音质详情
export const getMusicQualityDetail = (id: number) => {
  return request.get('/song/music/detail', { params: { id } });
};

// 根据音乐Id获取音乐播放URl
export const getMusicUrl = async (id: number, isDownloaded: boolean = false) => {
  const userStore = useUserStore();
  const settingStore = useSettingsStore();
  // 判断是否登录
  try {
    if (userStore.user && isDownloaded && userStore.user.vipType !== 0) {
      const url = '/song/download/url/v1';
      const res = await request.get(url, {
        params: {
          id,
          level: settingStore.setData.musicQuality || 'higher',
          encodeType: settingStore.setData.musicQuality == 'lossless' ? 'aac' : 'flac',
          // level为lossless时，encodeType=flac时网易云会返回hires音质，encodeType=aac时网易云会返回lossless音质
          cookie: `${localStorage.getItem('token')} os=pc;`
        }
      });

      if (res.data.data.url) {
        return { data: { data: [{ ...res.data.data }] } };
      }
    }
  } catch (error) {
    console.error('error', error);
  }

  return await request.get('/song/url/v1', {
    params: {
      id,
      level: settingStore.setData.musicQuality || 'higher',
      encodeType: settingStore.setData.musicQuality == 'lossless' ? 'aac' : 'flac'
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

/**
 * 获取解析后的音乐URL
 * @param id 歌曲ID
 * @param data 歌曲数据
 * @returns 解析结果
 */
export const getParsingMusicUrl = async (
  id: number,
  data: SongResult
): Promise<MusicParseResult> => {
  return await MusicParser.parseMusic(id, data);
};

// 收藏歌曲
export const likeSong = (id: number, like: boolean = true) => {
  return request.get('/like', { params: { id, like } });
};

// 将每日推荐中的歌曲标记为不感兴趣，并获取一首新歌
export const dislikeRecommendedSong = (id: number | string) => {
  return request.get('/recommend/songs/dislike', {
    params: { id }
  });
};
// 获取用户喜欢的音乐列表
export const getLikedList = (uid: number) => {
  return request.get('/likelist', {
    params: { uid, noLogin: true }
  });
};

// 创建歌单
export const createPlaylist = (params: { name: string; privacy: number }) => {
  return request.post('/playlist/create', params);
};

// 添加或删除歌单歌曲
export const updatePlaylistTracks = (params: {
  op: 'add' | 'del';
  pid: number;
  tracks: string;
}) => {
  return request.post('/playlist/tracks', params);
};

/**
 * 根据类型获取列表数据
 * @param type 列表类型 album/playlist
 * @param id 列表ID
 */
export function getMusicListByType(type: string, id: string) {
  if (type === 'album') {
    return getAlbumDetail(id);
  } else if (type === 'playlist') {
    return getPlaylistDetail(id);
  }
  return Promise.reject(new Error('未知列表类型'));
}

/**
 * 获取专辑详情
 * @param id 专辑ID
 */
export function getAlbumDetail(id: string) {
  return request({
    url: '/album',
    method: 'get',
    params: {
      id
    }
  });
}

/**
 * 获取歌单详情
 * @param id 歌单ID
 */
export function getPlaylistDetail(id: string) {
  return request({
    url: '/playlist/detail',
    method: 'get',
    params: {
      id
    }
  });
}

export function subscribePlaylist(params: { t: number; id: number }) {
  return request({
    url: '/playlist/subscribe',
    method: 'post',
    params
  });
}
