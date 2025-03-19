import axios, { InternalAxiosRequestConfig } from 'axios';

import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';

import { isElectron } from '.';

let setData: any = null;
const getSetData = () => {
  if (window.electron) {
    setData = window.electron.ipcRenderer.sendSync('get-store-value', 'set');
  } else {
    const settingsStore = useSettingsStore();
    setData = settingsStore.setData;
  }
  return setData;
};

// 扩展请求配置接口
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
}

const baseURL = window.electron
  ? `http://127.0.0.1:${setData?.musicApiPort}`
  : import.meta.env.VITE_API;

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
    getSetData();
    config.baseURL = window.electron
      ? `http://127.0.0.1:${setData?.musicApiPort}`
      : import.meta.env.VITE_API;
    // 只在retryCount未定义时初始化为0
    if (config.retryCount === undefined) {
      config.retryCount = 0;
    }

    // 在请求发送之前做一些处理
    // 在get请求params中添加timestamp
    config.params = {
      ...config.params,
      timestamp: Date.now()
    };
    const token = localStorage.getItem('token');
    if (token) {
      config.params.cookie = config.params.cookie !== undefined ? config.params.cookie : token;
    }
    if (isElectron) {
      const proxyConfig = setData?.proxyConfig;
      if (proxyConfig?.enable && ['http', 'https'].includes(proxyConfig?.protocol)) {
        config.params.proxy = `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`;
      }
      if (setData.enableRealIP && setData.realIP) {
        config.params.realIP = setData.realIP;
      }
    }

    return config;
  },
  (error) => {
    // 当请求异常时做一些处理
    return Promise.reject(error);
  }
);

const NO_RETRY_URLS = ['暂时没有'];

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error('error', error);
    const config = error.config as CustomAxiosRequestConfig;

    // 如果没有配置，直接返回错误
    if (!config) {
      return Promise.reject(error);
    }

    // 处理 301 状态码
    if (error.response?.status === 301 && config.params.noLogin !== true) {
      // 使用 store mutation 清除用户信息
      const userStore = useUserStore();
      userStore.handleLogout();
      console.log(`301 状态码，清除登录信息后重试第 ${config.retryCount} 次`);
      config.retryCount = 3;
    }

    // 检查是否还可以重试
    if (
      config.retryCount !== undefined &&
      config.retryCount < MAX_RETRIES &&
      !NO_RETRY_URLS.includes(config.url as string)
    ) {
      config.retryCount++;
      console.error(`请求重试第 ${config.retryCount} 次`);

      // 延迟重试
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

      // 重新发起请求
      return request(config);
    }

    console.error(`重试${MAX_RETRIES}次后仍然失败`);
    return Promise.reject(error);
  }
);

export default request;
