import axios from 'axios';

// API地址配置数组
const apiUrls = [
  import.meta.env.VITE_API_MUSIC,        // 0: 主API
  import.meta.env.VITE_API_MUSIC_BACKUP  // 1: 备用API
];

/**
 * 创建音乐请求实例
 * @param apiIndex API索引，默认0（主API）
 * @returns axios实例
 */
const requestMusic = (apiIndex: number = 0) => {
  // 边界检查
  if (apiIndex < 0 || apiIndex >= apiUrls.length) {
    console.warn(`无效的API索引: ${apiIndex}，使用默认API`);
    apiIndex = 0;
  }

  const baseURL = apiUrls[apiIndex];
  
  // 检查API地址是否存在
  if (!baseURL) {
    throw new Error(`API索引 ${apiIndex} 对应的地址未配置`);
  }

  const instance = axios.create({
    baseURL,
    timeout: 10000
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

/**
 * 获取可用API数量
 */
export const getApiCount = () => apiUrls.filter(url => url).length;

/**
 * 获取API地址
 */
export const getApiUrl = (index: number) => apiUrls[index];

export default requestMusic;
