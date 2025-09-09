import request from '@/utils/request';
import axios from 'axios';

interface IParams {
  keywords: string;
  type: number;
  limit?: number;
  offset?: number;
}
// 搜索内容
export const getSearch = (params: IParams) => {
  return request.get<any>('/cloudsearch', {
    params
  });
};

/**
 * 搜索建议接口返回的数据结构
 */
interface Suggestion {
  keyword: string;
}

interface KugouSuggestionResponse {
  data: Suggestion[];
}

/**
 * 从酷狗获取搜索建议
 * @param keyword 搜索关键词
 */
export const getSearchSuggestions = async (keyword: string) => {
  console.log('[API] getSearchSuggestions: 开始执行');

  if (!keyword || !keyword.trim()) {
    return Promise.resolve([]);
  }

  console.log(`[API] getSearchSuggestions: 准备请求，关键词: "${keyword}"`);

  try {
    const response = await axios.get<KugouSuggestionResponse>('/kugou/new/app/i/search.php', {
      params: {
        cmd: 302,
        keyword: keyword,
      },
    });

    if (response.data && Array.isArray(response.data.data)) {
      const suggestions = response.data.data.map(item => item.keyword).slice(0, 8);
      console.log('[API] getSearchSuggestions: 成功解析建议:', suggestions);
      return suggestions;
    }

    console.warn('[API] getSearchSuggestions: 响应数据格式不正确，返回空数组。');
    return [];
  } catch (error) {
    console.error('[API] getSearchSuggestions: 请求失败，错误信息:', error);
    return [];
  }
};
