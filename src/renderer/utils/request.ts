import axios, { InternalAxiosRequestConfig } from 'axios';
import { isElectron } from '.';
import store from '@/store';
import { createDiscreteApi } from 'naive-ui'


const { notification } = createDiscreteApi(
  ['notification']
)

let setData: any = null;
const getSetData = ()=>{
  if (window.electron) {
    setData = window.electron.ipcRenderer.sendSync('get-store-value', 'set');
  }
}
getSetData()
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
    getSetData();
    // 只在retryCount未定义时初始化为0
    if (config.retryCount === undefined) {
      config.retryCount = 0;
    }

    // 在请求发送之前做一些处理
    // 在get请求params中添加timestamp
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        timestamp: Date.now(),
      };
      const token = localStorage.getItem('token');
      if (token) {
        config.params.cookie = token + ' os=pc;';
      }else{
        config.params.cookie = 'os=pc;';
      }
    }

    if(isElectron){
      const proxyConfig = setData?.proxyConfig
      if (proxyConfig?.enable && ['http', 'https'].includes(proxyConfig?.protocol)) {
        config.params.proxy =  `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`
      }
      if(setData.enableRealIP && setData.realIP){
        config.params.realIP = setData.realIP
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
    console.log('error',error)  
    const config = error.config as CustomAxiosRequestConfig;

    // 如果没有配置，直接返回错误
    if (!config) {
      return Promise.reject(error);
    }

    // 处理 301 状态码
    if (error.response?.status === 301) {
      // 使用 store mutation 清除用户信息
      store.commit('logout');

      // 如果还可以重试，则重新发起请求
      if (config.retryCount === undefined || config.retryCount < MAX_RETRIES) {
        config.retryCount = (config.retryCount || 1) + 1;
        console.log(`301 状态码，清除登录信息后重试第 ${config.retryCount} 次`);
        notification.error({
          content: '登录状态失效，请重新登录',
          meta: '请重新登录',
          duration: 2500,
          keepAliveOnHover: true
        })

        // 延迟重试
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

        // 重新发起请求
        return request(config);
      }
    }

    // 检查是否还可以重试
    if (config.retryCount !== undefined && config.retryCount < MAX_RETRIES) {
      config.retryCount++;
      console.log(`请求重试第 ${config.retryCount} 次`);

      // 延迟重试
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

      // 重新发起请求
      return request(config);
    }

    console.log(`重试${MAX_RETRIES}次后仍然失败`);
    return Promise.reject(error);
  }
);

export default request;
