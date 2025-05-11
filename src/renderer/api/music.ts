import { musicDB } from '@/hooks/MusicHook';
import { useSettingsStore, useUserStore } from '@/store';
import type { ILyric } from '@/type/lyric';
import { isElectron } from '@/utils';
import request from '@/utils/request';
import requestMusic from '@/utils/request_music';
import { cloneDeep } from 'lodash';
import { parseFromGDMusic, getQualityMapping } from './gdmusic';

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

export const getParsingMusicUrl = async (id: number, data: any) => {
  const settingStore = useSettingsStore();
  
  // 如果禁用了音乐解析功能，则直接返回空结果
  if (!settingStore.setData.enableMusicUnblock) {
    return Promise.resolve({ data: { code: 404, message: '音乐解析功能已禁用' } });
  }
  
  // 获取音源设置，优先使用歌曲自定义音源
  const songId = String(id);
  const savedSource = localStorage.getItem(`song_source_${songId}`);
  let enabledSources: any[] = [];
  
  // 如果有歌曲自定义音源，使用自定义音源
  if (savedSource) {
    try {
      enabledSources = JSON.parse(savedSource);
      console.log(`使用歌曲 ${id} 自定义音源:`, enabledSources);
    } catch (e) {
      console.error('解析自定义音源失败, 使用全局设置', e);
      enabledSources = settingStore.setData.enabledMusicSources || [];
    }
  } else {
    // 没有自定义音源，使用全局音源设置
    enabledSources = settingStore.setData.enabledMusicSources || [];
  }
  
  // 检查是否选择了GD音乐台解析
  if (enabledSources.includes('gdmusic')) {
    // 获取音质设置并转换为GD音乐台格式
    try {
      const quality = getQualityMapping(settingStore.setData.musicQuality || 'higher');
      
      // 调用封装的GD音乐台解析服务
      const gdResult = await parseFromGDMusic(id, data, quality);
      if (gdResult) {
        return gdResult;
      }
    } catch (error) {
      console.error('GD音乐台解析失败:', error);
    }
      
    console.log('GD音乐台所有音源均解析失败，尝试使用unblockMusic');
  }
  
  // 如果GD音乐台解析失败或者未启用，尝试使用unblockMusic
  if (isElectron) {
    const filteredSources = enabledSources.filter(source => source !== 'gdmusic');
    return window.api.unblockMusic(id, cloneDeep(data), cloneDeep(filteredSources));
  }
  
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
