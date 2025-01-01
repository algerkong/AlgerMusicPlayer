import axios, { InternalAxiosRequestConfig } from 'axios';

let setData: any = null;

if (window.electron) {
  setData = window.electron.ipcRenderer.sendSync('get-store-value', 'set');
}

// 扩展请求配置接口
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
}

const baseURL = window.electron ? `http://127.0.0.1:${setData?.musicApiPort}` : import.meta.env.VITE_API;

const request = axios.create({
  baseURL,
  timeout: 5000
});

// 最大重试次数
const MAX_RETRIES = 3;
// 重试延迟（毫秒）
const RETRY_DELAY = 500;

// 请求拦截器
request.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    // 初始化重试次数
    config.retryCount = 0;

    // 在请求发送之前做一些处理
    // 在get请求params中添加timestamp
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        timestamp: Date.now()
      };
      const token = localStorage.getItem('token');
      if (token) {
        config.params.cookie = token;
      }
    }

    return config;
  },
  (error) => {
    // 当请求异常时做一些处理
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config as CustomAxiosRequestConfig;

    // 如果没有配置重试次数，则初始化为0
    if (!config || !config.retryCount) {
      config.retryCount = 0;
    }

    // 检查是否还可以重试
    if (config.retryCount < MAX_RETRIES) {
      config.retryCount++;

      // 延迟重试
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

      // 重新发起请求
      return request(config);
    }

    return Promise.reject(error);
  }
);

export default request;
