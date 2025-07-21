import type { IBilibiliPlayUrl, IBilibiliVideoDetail } from '@/types/bilibili';
import { getSetData, isElectron } from '@/utils';
import request from '@/utils/request';

interface ISearchParams {
  keyword: string;
  page?: number;
  pagesize?: number;
  search_type?: string;
}

/**
 * 搜索B站视频
 * @param params 搜索参数
 */
export const searchBilibili = (params: ISearchParams) => {
  console.log('调用B站搜索API，参数:', params);
  return request.get('/bilibili/search', {
    params
  });
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
      url = playUrlData.dash.audio[0].baseUrl;
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
