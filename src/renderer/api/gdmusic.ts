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
        let artistList: string[] = [];

        // 处理不同的艺术家字段结构
        if (data.artists && Array.isArray(data.artists)) {
          artistList = data.artists.map((artist) => artist?.name).filter(Boolean);
        } else if (data.ar && Array.isArray(data.ar)) {
          artistList = data.ar.map((artist) => artist?.name).filter(Boolean);
        } else if (data.artist && typeof data.artist === 'string') {
          artistList = [data.artist];
        }

        const artistNames = artistList.join(' ');
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
            const result = await searchAndGetUrl(
              source,
              searchQuery,
              { name: songName, artists: artistList },
              quality
            );
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

type GDSearchItem = {
  id: string | number;
  name?: string;
  artist?: unknown;
  source?: string;
};

type ExpectedSong = {
  name: string;
  artists: string[];
};

const baseUrl = 'https://music-api.gdstudio.xyz/api.php';

/**
 * 归一化文本用于匹配：去掉括号备注（Live/翻唱/伴奏等）、空白与常见标点，转小写
 */
const normalizeText = (text: string): string => {
  const stripped = text
    .toLowerCase()
    .replace(/[（(【[].*?[)）】\]]/g, '')
    .replace(/[\s\-—_·・'"‘’“”!！?？.,，。&＆+]/g, '');
  // 整个歌名都在括号里时退化为仅去标点，避免归一化成空串
  return stripped || text.toLowerCase().replace(/[\s\-—_·・'"‘’“”!！?？.,，。&＆+]/g, '');
};

const getCandidateArtistText = (artist: unknown): string => {
  if (Array.isArray(artist)) {
    return artist
      .map((item) => (typeof item === 'string' ? item : (item as any)?.name || ''))
      .join(' ');
  }
  return typeof artist === 'string' ? artist : '';
};

const isNameMatched = (expectedName: string, candidateName: string): boolean => {
  const expected = normalizeText(expectedName);
  const candidate = normalizeText(candidateName);
  if (!expected || !candidate) return false;
  return expected === candidate || candidate.includes(expected) || expected.includes(candidate);
};

/**
 * 从候选中挑选与原曲匹配的结果。
 * 此前无条件取第一条搜索结果，版权下架歌曲（如周杰伦）会解析出翻唱/同名歌，
 * 即"货不对版"（#704）。校验策略：歌名必须匹配；候选带歌手信息时歌手也必须匹配，
 * 宁可解析失败也不返回错误的歌。
 */
const pickBestCandidate = (
  candidates: GDSearchItem[],
  expected: ExpectedSong
): GDSearchItem | null => {
  let best: GDSearchItem | null = null;
  let bestScore = 0;

  for (const item of candidates) {
    if (!item || !item.id) continue;
    if (!isNameMatched(expected.name, item.name || '')) continue;

    const candidateArtist = normalizeText(getCandidateArtistText(item.artist));
    let score: number;
    if (expected.artists.length === 0) {
      // 原曲无歌手信息，歌名匹配即可
      score = 2;
    } else if (!candidateArtist) {
      // 候选缺少歌手信息：保留为低优先级候选
      score = 1;
    } else {
      const artistMatched = expected.artists.some((name) => {
        const normalized = normalizeText(name);
        return (
          !!normalized &&
          (candidateArtist.includes(normalized) || normalized.includes(candidateArtist))
        );
      });
      // 有歌手信息但对不上 → 拒绝，这正是"货不对版"的来源
      if (!artistMatched) continue;
      score = 3;
    }

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return best;
};

/**
 * 在指定音源搜索歌曲并获取URL
 * @param source 音源
 * @param searchQuery 搜索关键词
 * @param expected 原曲信息（用于校验搜索结果，避免货不对版）
 * @param quality 音质
 * @returns 音乐URL结果
 */
async function searchAndGetUrl(
  source: MusicSourceType,
  searchQuery: string,
  expected: ExpectedSong,
  quality: string
): Promise<GDMusicUrlResult | null> {
  // 1. 搜索歌曲（取前5条做校验，而不是盲取第一条）
  const searchUrl = `${baseUrl}?types=search&source=${source}&name=${encodeURIComponent(searchQuery)}&count=5&pages=1`;
  console.log(`GD音乐台尝试音源 ${source} 搜索:`, searchUrl);

  const searchResponse = await axios.get(searchUrl, { timeout: 5000 });

  if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
    const matchedResult = pickBestCandidate(searchResponse.data as GDSearchItem[], expected);
    if (!matchedResult) {
      console.log(`GD音乐台 ${source} 搜索结果与原曲不匹配，已拒绝（避免货不对版）`);
      return null;
    }

    const trackId = matchedResult.id;
    const trackSource = matchedResult.source || source;

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
