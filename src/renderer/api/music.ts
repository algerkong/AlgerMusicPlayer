import { cloneDeep } from 'lodash';

import { musicDB } from '@/hooks/MusicHook';
import { useSettingsStore, useUserStore } from '@/store';
import type { ILyric } from '@/types/lyric';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';
import request from '@/utils/request';
import requestMusic from '@/utils/request_music';

import { searchAndGetBilibiliAudioUrl } from './bilibili';
import type { ParsedMusicResult } from './gdmusic';
import { parseFromGDMusic } from './gdmusic';
import { parseFromCustomApi } from './parseFromCustomApi';

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
const getGDMusicAudio = async (id: number, data: SongResult): Promise<ParsedMusicResult | null> => {
  // <-- 在这里明确声明返回类型
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
  try {
    if (isElectron) {
      let musicSources: any[] = [];
      let quality: string = 'higher';
      try {
        const settingStore = useSettingsStore();
        const enableMusicUnblock = settingStore?.setData?.enableMusicUnblock;

        // 如果禁用了音乐解析功能，则直接返回空结果
        if (!enableMusicUnblock) {
          return Promise.resolve({ data: { code: 404, message: '音乐解析功能已禁用' } });
        }

        // 1. 确定使用的音源列表(自定义或全局)
        const songId = String(id);
        const savedSourceStr = (() => {
          try {
            return localStorage.getItem(`song_source_${songId}`);
          } catch (e) {
            console.warn('读取本地存储失败，忽略自定义音源', e);
            return null;
          }
        })();

        if (savedSourceStr) {
          try {
            musicSources = JSON.parse(savedSourceStr);
            console.log(`使用歌曲 ${id} 自定义音源:`, musicSources);
          } catch (e) {
            console.error('解析音源设置失败，回退到默认全局设置', e);
            musicSources = settingStore?.setData?.enabledMusicSources || [];
          }
        } else {
          // 使用全局音源设置
          musicSources = settingStore?.setData?.enabledMusicSources || [];
          console.log(`使用全局音源设置:`, musicSources);
        }

        quality = settingStore?.setData?.musicQuality || 'higher';
      } catch (e) {
        console.error('读取设置失败，使用默认配置', e);
        musicSources = [];
        quality = 'higher';
      }

      // 优先级 1: 自定义 API
      try {
        const hasCustom = Array.isArray(musicSources) && musicSources.includes('custom');
        const customEnabled = (() => {
          try {
            const st = useSettingsStore();
            return Boolean(st?.setData?.customApiPlugin);
          } catch {
            return false;
          }
        })();
        if (hasCustom && customEnabled) {
          console.log('尝试使用 自定义API 解析...');
          const customResult = await parseFromCustomApi(id, data, quality);
          if (customResult) {
            return customResult; // 成功则直接返回
          }
          console.log('自定义API解析失败，继续尝试其他音源...');
        }
      } catch (e) {
        console.error('自定义API解析发生异常，继续尝试其他音源', e);
      }

      // 优先级 2: Bilibili
      try {
        if (Array.isArray(musicSources) && musicSources.includes('bilibili')) {
          console.log('尝试使用 Bilibili 解析...');
          const bilibiliResult = await getBilibiliAudio(data);
          if (bilibiliResult?.data?.data?.url) {
            return bilibiliResult;
          }
          console.log('Bilibili解析失败，继续尝试其他音源...');
        }
      } catch (e) {
        console.error('Bilibili解析发生异常，继续尝试其他音源', e);
      }

      // 优先级 3: GD 音乐台
      try {
        if (Array.isArray(musicSources) && musicSources.includes('gdmusic')) {
          console.log('尝试使用 GD音乐台 解析...');
          const gdResult = await getGDMusicAudio(id, data);
          if (gdResult) {
            return gdResult;
          }
          console.log('GD音乐台解析失败，继续尝试其他音源...');
        }
      } catch (e) {
        console.error('GD音乐台解析发生异常，继续尝试其他音源', e);
      }

      // 优先级 4: UnblockMusic (migu, kugou, pyncmd)
      try {
        const unblockSources = (Array.isArray(musicSources) ? musicSources : []).filter(
          (source) => !['custom', 'bilibili', 'gdmusic'].includes(source)
        );
        if (unblockSources.length > 0) {
          console.log('尝试使用 UnblockMusic 解析:', unblockSources);
          // 捕获内部可能的异常
          return await getUnblockMusicAudio(id, data, unblockSources);
        } else {
          console.warn('UnblockMusic API 不可用，跳过此解析方式');
        }
      } catch (e) {
        console.error('UnblockMusic 解析发生异常，继续后备方案', e);
      }
    }
  } catch (e) {
    console.error('getParsingMusicUrl 执行异常，将使用后备方案:', e);
  }

  // 后备方案：使用API请求
  console.log('无可用音源或不在Electron环境中，使用API请求');
  return requestMusic.get<any>('/music', { params: { id } });
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
