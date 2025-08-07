import axios from 'axios';

import type { MusicSourceType } from '@/types/music';

/**
 * GD音乐台解析服务
 */
export interface GDMusicResponse {
  url: string;
  br: number;
  size: number;
  md5: string;
  platform: string;
  gain: number;
}

export interface ParsedMusicResult {
  data: {
    data: GDMusicResponse;
    params: {
      id: number;
      type: string;
    };
  };
}

/**
 * 从GD音乐台解析音乐URL
 * @param id 音乐ID
 * @param data 音乐数据，包含名称和艺术家信息
 * @param quality 音质设置
 * @param timeout 超时时间(毫秒)，默认15000ms
 * @returns 解析后的音乐URL及相关信息
 */
export const parseFromGDMusic = async (
  id: number,
  data: any,
  quality: string = '999',
  timeout: number = 15000
): Promise<ParsedMusicResult | null> => {
  // 创建一个超时Promise
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => {
      reject(new Error('GD音乐台解析超时'));
    }, timeout);
  });

  try {
    // 使用Promise.race竞争主解析流程和超时
    return await Promise.race([
      (async () => {
        // 处理不同数据结构
        if (!data) {
          console.error('GD音乐台解析：歌曲数据为空');
          throw new Error('歌曲数据为空');
        }

        const songName = data.name || '';
        let artistNames = '';

        // 处理不同的艺术家字段结构
        if (data.artists && Array.isArray(data.artists)) {
          artistNames = data.artists.map((artist) => artist.name).join(' ');
        } else if (data.ar && Array.isArray(data.ar)) {
          artistNames = data.ar.map((artist) => artist.name).join(' ');
        } else if (data.artist) {
          artistNames = typeof data.artist === 'string' ? data.artist : '';
        }

        const searchQuery = `${songName} ${artistNames}`.trim();

        if (!searchQuery || searchQuery.length < 2) {
          console.error('GD音乐台解析：搜索查询过短', { name: songName, artists: artistNames });
          throw new Error('搜索查询过短');
        }

        // 所有可用的音乐源 netease、joox、tidal
        const allSources = ['joox', 'tidal', 'netease'] as MusicSourceType[];

        console.log('GD音乐台开始搜索:', searchQuery);

        // 依次尝试所有音源
        for (const source of allSources) {
          try {
            const result = await searchAndGetUrl(source, searchQuery, quality);
            if (result) {
              console.log(`GD音乐台成功通过 ${result.source} 解析音乐!`);
              // 返回符合原API格式的数据
              return {
                data: {
                  data: {
                    url: result.url.replace(/\\/g, ''),
                    br: parseInt(result.br, 10) * 1000 || 320000,
                    size: result.size || 0,
                    md5: '',
                    platform: 'gdmusic',
                    gain: 0
                  },
                  params: {
                    id: parseInt(String(id), 10),
                    type: 'song'
                  }
                }
              };
            }
          } catch (error) {
            console.error(`GD音乐台 ${source} 音源解析失败:`, error);
            // 该音源失败，继续尝试下一个音源
            continue;
          }
        }

        console.log('GD音乐台所有音源均解析失败');
        return null;
      })(),
      timeoutPromise
    ]);
  } catch (error: any) {
    if (error.message === 'GD音乐台解析超时') {
      console.error('GD音乐台解析超时(15秒):', error);
    } else {
      console.error('GD音乐台解析完全失败:', error);
    }
    return null;
  }
};

interface GDMusicUrlResult {
  url: string;
  br: string;
  size: number;
  source: string;
}

const baseUrl = 'https://music-api.gdstudio.xyz/api.php';

/**
 * 在指定音源搜索歌曲并获取URL
 * @param source 音源
 * @param searchQuery 搜索关键词
 * @param quality 音质
 * @returns 音乐URL结果
 */
async function searchAndGetUrl(
  source: MusicSourceType,
  searchQuery: string,
  quality: string
): Promise<GDMusicUrlResult | null> {
  // 1. 搜索歌曲
  const searchUrl = `${baseUrl}?types=search&source=${source}&name=${encodeURIComponent(searchQuery)}&count=1&pages=1`;
  console.log(`GD音乐台尝试音源 ${source} 搜索:`, searchUrl);

  const searchResponse = await axios.get(searchUrl, { timeout: 5000 });

  if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
    const firstResult = searchResponse.data[0];
    if (!firstResult || !firstResult.id) {
      console.log(`GD音乐台 ${source} 搜索结果无效`);
      return null;
    }

    const trackId = firstResult.id;
    const trackSource = firstResult.source || source;

    // 2. 获取歌曲URL
    const songUrl = `${baseUrl}?types=url&source=${trackSource}&id=${trackId}&br=${quality}`;
    console.log(`GD音乐台尝试获取 ${trackSource} 歌曲URL:`, songUrl);

    const songResponse = await axios.get(songUrl, { timeout: 5000 });

    if (songResponse.data && songResponse.data.url) {
      return {
        url: songResponse.data.url,
        br: songResponse.data.br,
        size: songResponse.data.size || 0,
        source: trackSource
      };
    } else {
      console.log(`GD音乐台 ${trackSource} 未返回有效URL`);
      return null;
    }
  } else {
    console.log(`GD音乐台 ${source} 搜索结果为空`);
    return null;
  }
}
