import type { IBilibiliPage, IBilibiliPlayUrl, IBilibiliVideoDetail } from '@/types/bilibili';
import type { SongResult } from '@/types/music';
import { getSetData, isElectron } from '@/utils';
import request from '@/utils/request';

interface ISearchParams {
  keyword: string;
  page?: number;
  pagesize?: number;
  search_type?: string;
}

/**
 * 搜索B站视频（带自动重试）
 * 最多重试10次，每次间隔100ms
 * @param params 搜索参数
 */
export const searchBilibili = async (params: ISearchParams): Promise<any> => {
  console.log('调用B站搜索API，参数:', params);
  const maxRetries = 10;
  const delayMs = 100;
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await request.get('/bilibili/search', { params });
      console.log('B站搜索API响应:', response);
      const hasTitle = Boolean(response?.data?.data?.result?.length);
      if (response?.status === 200 && hasTitle) {
        return response;
      }

      lastError = new Error(
        `搜索结果不符合成功条件(缺少 data.title ) (attempt ${attempt}/${maxRetries})`
      );
      console.warn('B站搜索API响应不符合要求，将重试。调试信息：', {
        status: response?.status,
        hasData: Boolean(response?.data),
        hasInnerData: Boolean(response?.data?.data),
        title: response?.data?.data?.title
      });
    } catch (error) {
      lastError = error;
      console.warn(`B站搜索API错误[第${attempt}次]，将重试:`, error);
    }

    if (attempt === maxRetries) {
      console.error('B站搜索API重试达到上限，仍然失败');
      if (lastError instanceof Error) throw lastError;
      throw new Error('B站搜索失败且达到最大重试次数');
    }

    await delay(delayMs);
  }
  // 理论上不会到达这里，添加以满足TS控制流分析
  throw new Error('B站搜索在重试后未返回有效结果');
};

interface IBilibiliResponse<T> {
  code: number;
  message: string;
  ttl: number;
  data: T;
}

/**
 * 获取B站视频详情
 * @param bvid B站视频BV号
 * @returns 视频详情响应
 */
export const getBilibiliVideoDetail = (
  bvid: string
): Promise<IBilibiliResponse<IBilibiliVideoDetail>> => {
  console.log('调用B站视频详情API，bvid:', bvid);
  return new Promise((resolve, reject) => {
    request
      .get('/bilibili/video/detail', {
        params: { bvid }
      })
      .then((response) => {
        console.log('B站视频详情API响应:', response.status);

        // 检查响应状态和数据格式
        if (response.status === 200 && response.data && response.data.data) {
          console.log('B站视频详情API成功，标题:', response.data.data.title);
          resolve(response.data);
        } else {
          console.error('B站视频详情API响应格式不正确:', response.data);
          reject(new Error('获取视频详情响应格式不正确'));
        }
      })
      .catch((error) => {
        console.error('B站视频详情API错误:', error);
        reject(error);
      });
  });
};

/**
 * 获取B站视频播放地址
 * @param bvid B站视频BV号
 * @param cid 视频分P的id
 * @param qn 视频质量，默认为0
 * @param fnval 视频格式标志，默认为80
 * @param fnver 视频格式版本，默认为0
 * @param fourk 是否允许4K视频，默认为1
 * @returns 视频播放地址响应
 */
export const getBilibiliPlayUrl = (
  bvid: string,
  cid: number,
  qn: number = 0,
  fnval: number = 80,
  fnver: number = 0,
  fourk: number = 1
): Promise<IBilibiliResponse<IBilibiliPlayUrl>> => {
  console.log('调用B站视频播放地址API，bvid:', bvid, 'cid:', cid);
  return new Promise((resolve, reject) => {
    request
      .get('/bilibili/playurl', {
        params: {
          bvid,
          cid,
          qn,
          fnval,
          fnver,
          fourk
        }
      })
      .then((response) => {
        console.log('B站视频播放地址API响应:', response.status);

        // 检查响应状态和数据格式
        if (response.status === 200 && response.data && response.data.data) {
          if (response.data.data.dash?.audio?.length > 0) {
            console.log(
              'B站视频播放地址API成功，获取到',
              response.data.data.dash.audio.length,
              '个音频地址'
            );
          } else if (response.data.data.durl?.length > 0) {
            console.log(
              'B站视频播放地址API成功，获取到',
              response.data.data.durl.length,
              '个播放地址'
            );
          }
          resolve(response.data);
        } else {
          console.error('B站视频播放地址API响应格式不正确:', response.data);
          reject(new Error('获取视频播放地址响应格式不正确'));
        }
      })
      .catch((error) => {
        console.error('B站视频播放地址API错误:', error);
        reject(error);
      });
  });
};

export const getBilibiliProxyUrl = (url: string) => {
  const setData = getSetData();
  const baseURL = isElectron
    ? `http://127.0.0.1:${setData?.musicApiPort}`
    : import.meta.env.VITE_API;
  const AUrl = url.startsWith('http') ? url : `https:${url}`;
  return `${baseURL}/bilibili/stream-proxy?url=${encodeURIComponent(AUrl)}`;
};

export const getBilibiliAudioUrl = async (bvid: string, cid: number): Promise<string> => {
  console.log('获取B站音频URL', { bvid, cid });
  try {
    const res = await getBilibiliPlayUrl(bvid, cid);
    const playUrlData = res.data;
    let url = '';

    if (playUrlData.dash && playUrlData.dash.audio && playUrlData.dash.audio.length > 0) {
      url = playUrlData.dash.audio[playUrlData.dash.audio.length - 1].baseUrl;
    } else if (playUrlData.durl && playUrlData.durl.length > 0) {
      url = playUrlData.durl[0].url;
    } else {
      throw new Error('未找到可用的音频地址');
    }

    return getBilibiliProxyUrl(url);
  } catch (error) {
    console.error('获取B站音频URL失败:', error);
    throw error;
  }
};

// 根据音乐名称搜索并直接返回音频URL
export const searchAndGetBilibiliAudioUrl = async (keyword: string): Promise<string> => {
  try {
    // 搜索B站视频，取第一页第一个结果
    const res = await searchBilibili({ keyword, page: 1, pagesize: 1 });
    if (!res) {
      throw new Error('B站搜索返回为空');
    }
    const result = res.data?.data?.result;
    if (!result || result.length === 0) {
      throw new Error('未找到相关B站视频');
    }
    const first = result[0];
    const bvid = first.bvid;
    // 需要获取视频详情以获得cid
    const detailRes = await getBilibiliVideoDetail(bvid);
    const pages = detailRes.data.pages;
    if (!pages || pages.length === 0) {
      throw new Error('未找到视频分P信息');
    }
    const cid = pages[0].cid;
    // 获取音频URL
    return await getBilibiliAudioUrl(bvid, cid);
  } catch (error) {
    console.error('根据名称搜索B站音频URL失败:', error);
    throw error;
  }
};

/**
 * 解析B站ID格式
 * @param biliId B站ID，可能是字符串格式（bvid--pid--cid）
 * @returns 解析后的对象 {bvid, pid, cid} 或 null
 */
export const parseBilibiliId = (
  biliId: string | number
): { bvid: string; pid: string; cid: number } | null => {
  const strBiliId = String(biliId);

  if (strBiliId.includes('--')) {
    const [bvid, pid, cid] = strBiliId.split('--');
    if (!bvid || !pid || !cid) {
      console.warn(`B站ID格式错误: ${strBiliId}, 正确格式应为 bvid--pid--cid`);
      return null;
    }
    return { bvid, pid, cid: Number(cid) };
  }

  return null;
};

/**
 * 创建默认的Artist对象
 * @param name 艺术家名称
 * @param id 艺术家ID
 * @returns Artist对象
 */
const createDefaultArtist = (name: string, id: number = 0) => ({
  name,
  id,
  picId: 0,
  img1v1Id: 0,
  briefDesc: '',
  img1v1Url: '',
  albumSize: 0,
  alias: [],
  trans: '',
  musicSize: 0,
  topicPerson: 0,
  picUrl: ''
});

/**
 * 创建默认的Album对象
 * @param name 专辑名称
 * @param picUrl 专辑图片URL
 * @param artistName 艺术家名称
 * @param artistId 艺术家ID
 * @returns Album对象
 */
const createDefaultAlbum = (
  name: string,
  picUrl: string,
  artistName: string,
  artistId: number = 0
) => ({
  name,
  picUrl,
  id: 0,
  type: '',
  size: 0,
  picId: 0,
  blurPicUrl: '',
  companyId: 0,
  pic: 0,
  publishTime: 0,
  description: '',
  tags: '',
  company: '',
  briefDesc: '',
  artist: createDefaultArtist(artistName, artistId),
  songs: [],
  alias: [],
  status: 0,
  copyrightId: 0,
  commentThreadId: '',
  artists: [],
  subType: '',
  transName: null,
  onSale: false,
  mark: 0,
  picId_str: ''
});

/**
 * 创建基础的B站SongResult对象
 * @param config 配置对象
 * @returns SongResult对象
 */
const createBaseBilibiliSong = (config: {
  id: string | number;
  name: string;
  picUrl: string;
  artistName: string;
  artistId?: number;
  albumName: string;
  bilibiliData?: { bvid: string; cid: number };
  playMusicUrl?: string;
  duration?: number;
}): SongResult => {
  const {
    id,
    name,
    picUrl,
    artistName,
    artistId = 0,
    albumName,
    bilibiliData,
    playMusicUrl,
    duration
  } = config;

  const baseResult: SongResult = {
    id,
    name,
    picUrl,
    ar: [createDefaultArtist(artistName, artistId)],
    al: createDefaultAlbum(albumName, picUrl, artistName, artistId),
    count: 0,
    source: 'bilibili' as const
  };

  if (bilibiliData) {
    baseResult.bilibiliData = bilibiliData;
  }

  if (playMusicUrl) {
    baseResult.playMusicUrl = playMusicUrl;
  }

  if (duration !== undefined) {
    baseResult.duration = duration;
  }

  return baseResult as SongResult;
};

/**
 * 从B站视频详情和分P信息创建SongResult对象
 * @param videoDetail B站视频详情
 * @param page 分P信息
 * @param bvid B站视频ID
 * @returns SongResult对象
 */
export const createSongFromBilibiliVideo = (
  videoDetail: IBilibiliVideoDetail,
  page: IBilibiliPage,
  bvid: string
): SongResult => {
  const pageName = page.part || '';
  const title = `${pageName} - ${videoDetail.title}`;
  const songId = `${bvid}--${page.page}--${page.cid}`;
  const picUrl = getBilibiliProxyUrl(videoDetail.pic);

  return createBaseBilibiliSong({
    id: songId,
    name: title,
    picUrl,
    artistName: videoDetail.owner.name,
    artistId: videoDetail.owner.mid,
    albumName: videoDetail.title,
    bilibiliData: {
      bvid,
      cid: page.cid
    }
  });
};

/**
 * 创建简化的SongResult对象（用于搜索结果直接播放）
 * @param item 搜索结果项
 * @param audioUrl 音频URL
 * @returns SongResult对象
 */
export const createSimpleBilibiliSong = (item: any, audioUrl: string): SongResult => {
  const duration = typeof item.duration === 'string' ? 0 : item.duration * 1000; // 转换为毫秒

  return createBaseBilibiliSong({
    id: item.id,
    name: item.title,
    picUrl: item.pic,
    artistName: item.author,
    albumName: item.title,
    playMusicUrl: audioUrl,
    duration
  });
};

/**
 * 批量处理B站视频，从ID列表获取SongResult列表
 * @param bilibiliIds B站ID列表
 * @returns SongResult列表
 */
export const processBilibiliVideos = async (
  bilibiliIds: (string | number)[]
): Promise<SongResult[]> => {
  const bilibiliSongs: SongResult[] = [];

  for (const biliId of bilibiliIds) {
    const parsedId = parseBilibiliId(biliId);
    if (!parsedId) continue;

    try {
      const res = await getBilibiliVideoDetail(parsedId.bvid);
      const videoDetail = res.data;

      // 找到对应的分P
      const page = videoDetail.pages.find((p) => p.cid === parsedId.cid);
      if (!page) {
        console.warn(`未找到对应的分P: cid=${parsedId.cid}`);
        continue;
      }

      const songData = createSongFromBilibiliVideo(videoDetail, page, parsedId.bvid);
      bilibiliSongs.push(songData);
    } catch (error) {
      console.error(`获取B站视频详情失败 (${biliId}):`, error);
    }
  }

  return bilibiliSongs;
};
