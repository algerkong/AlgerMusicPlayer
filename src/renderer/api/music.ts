import { cloneDeep } from 'lodash';

import { musicDB } from '@/hooks/MusicHook';
import { useSettingsStore, useUserStore } from '@/store';
import type { ILyric } from '@/types/lyric';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import request from '@/utils/request';
import requestMusic from '@/utils/request_music';

import { searchAndGetBilibiliAudioUrl } from './bilibili';
import { parseFromGDMusic } from './gdmusic';

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
      level: settingStore.setData.musicQuality || 'higher'
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
 * 从Bilibili获取音频URL
 * @param data 歌曲数据
 * @returns 解析结果
 */
const getBilibiliAudio = async (data: SongResult) => {
  const songName = data?.name || '';
  const artistName =
    Array.isArray(data?.ar) && data.ar.length > 0 && data.ar[0]?.name ? data.ar[0].name : '';
  const albumName = data?.al && typeof data.al === 'object' && data.al?.name ? data.al.name : '';

  const searchQuery = [songName, artistName, albumName].filter(Boolean).join(' ').trim();
  console.log('开始搜索bilibili音频:', searchQuery);

  const url = await searchAndGetBilibiliAudioUrl(searchQuery);
  return {
    data: {
      code: 200,
      message: 'success',
      data: { url }
    }
  };
};

/**
 * 从GD音乐台获取音频URL
 * @param id 歌曲ID
 * @param data 歌曲数据
 * @returns 解析结果，失败时返回null
 */
const getGDMusicAudio = async (id: number, data: SongResult) => {
  try {
    const gdResult = await parseFromGDMusic(id, data, '999');
    if (gdResult) {
      return gdResult;
    }
  } catch (error) {
    console.error('GD音乐台解析失败:', error);
  }
  return null;
};

/**
 * 使用unblockMusic解析音频URL
 * @param id 歌曲ID
 * @param data 歌曲数据
 * @param sources 音源列表
 * @returns 解析结果
 */
const getUnblockMusicAudio = (id: number, data: SongResult, sources: any[]) => {
  const filteredSources = sources.filter((source) => source !== 'gdmusic');
  console.log(`使用unblockMusic解析，音源:`, filteredSources);
  return window.api.unblockMusic(id, cloneDeep(data), cloneDeep(filteredSources));
};

/**
 * 获取解析后的音乐URL
 * @param id 歌曲ID
 * @param data 歌曲数据
 * @returns 解析结果
 */
export const getParsingMusicUrl = async (id: number, data: SongResult) => {
  const settingStore = useSettingsStore();

  // 如果禁用了音乐解析功能，则直接返回空结果
  if (!settingStore.setData.enableMusicUnblock) {
    return Promise.resolve({ data: { code: 404, message: '音乐解析功能已禁用' } });
  }

  // 1. 确定使用的音源列表(自定义或全局)
  const songId = String(id);
  const savedSourceStr = localStorage.getItem(`song_source_${songId}`);
  let musicSources: any[] = [];

  try {
    if (savedSourceStr) {
      // 使用自定义音源
      musicSources = JSON.parse(savedSourceStr);
      console.log(`使用歌曲 ${id} 自定义音源:`, musicSources);
    } else {
      // 使用全局音源设置
      musicSources = settingStore.setData.enabledMusicSources || [];
      console.log(`使用全局音源设置:`, musicSources);
      if (isElectron && musicSources.length > 0) {
        return getUnblockMusicAudio(id, data, musicSources);
      }
    }
  } catch (e) {
    console.error('解析音源设置失败，使用全局设置', e);
    musicSources = settingStore.setData.enabledMusicSources || [];
  }

  // 2. 按优先级解析

  // 2.1 Bilibili解析(优先级最高)
  if (musicSources.includes('bilibili')) {
    return await getBilibiliAudio(data);
  }

  // 2.2 GD音乐台解析
  if (musicSources.includes('gdmusic')) {
    const gdResult = await getGDMusicAudio(id, data);
    if (gdResult) return gdResult;
    // GD解析失败，继续下一步
    console.log('GD音乐台解析失败，尝试使用其他音源');
  }
  console.log('musicSources', musicSources);
  // 2.3 使用unblockMusic解析其他音源
  if (isElectron && musicSources.length > 0) {
    return getUnblockMusicAudio(id, data, musicSources);
  }

  // 3. 后备方案：使用API请求
  console.log('无可用音源或不在Electron环境中，使用API请求');
  return requestMusic.get<any>('/music', { params: { id } });
};

// 收藏歌曲
export const likeSong = (id: number, like: boolean = true) => {
  return request.get('/like', { params: { id, like } });
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
