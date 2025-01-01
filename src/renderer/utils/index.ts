import { computed } from 'vue';
import axios from 'axios';
import config from '../../../package.json';

import store from '@/store';

// 设置歌手背景图片
export const setBackgroundImg = (url: String) => {
  return `background-image:url(${url})`;
};
// 设置动画类型
export const setAnimationClass = (type: String) => {
  if (store.state.setData && store.state.setData.noAnimate) {
    return '';
  }
  const speed = store.state.setData?.animationSpeed || 1;

  let speedClass = '';
  if (speed <= 0.3) speedClass = 'animate__slower';
  else if (speed <= 0.8) speedClass = 'animate__slow';
  else if (speed >= 2.5) speedClass = 'animate__faster';
  else if (speed >= 1.5) speedClass = 'animate__fast';

  return `animate__animated ${type}${speedClass ? ` ${speedClass}` : ''}`;
};
// 设置动画延时
export const setAnimationDelay = (index: number = 6, time: number = 50) => {
  const speed = store.state.setData?.animationSpeed || 1;
  return `animation-delay:${(index * time) / (speed * 2)}ms`;
};

// 将秒转换为分钟和秒
export const secondToMinute = (s: number) => {
  if (!s) {
    return '00:00';
  }
  const minute: number = Math.floor(s / 60);
  const second: number = Math.floor(s % 60);
  const minuteStr: string = minute > 9 ? minute.toString() : `0${minute.toString()}`;
  const secondStr: string = second > 9 ? second.toString() : `0${second.toString()}`;
  return `${minuteStr}:${secondStr}`;
};

// 格式化数字 千,万, 百万, 千万,亿
const units = [
  { value: 1e8, symbol: '亿' },
  { value: 1e4, symbol: '万' }
];

export const formatNumber = (num: string | number) => {
  num = Number(num);
  for (let i = 0; i < units.length; i++) {
    if (num >= units[i].value) {
      return `${(num / units[i].value).toFixed(1)}${units[i].symbol}`;
    }
  }
  return num.toString();
};

const windowData = window as any;
export const getIsMc = () => {
  if (!windowData.electron) {
    return false;
  }
  const setData = window.electron.ipcRenderer.sendSync('get-store-value', 'set');
  if (setData.isProxy) {
    return true;
  }
  return false;
};
const ProxyUrl = import.meta.env.VITE_API_PROXY;

export const getMusicProxyUrl = (url: string) => {
  if (!getIsMc()) {
    return url;
  }
  const PUrl = url.split('').join('+');
  return `${ProxyUrl}/mc?url=${PUrl}`;
};

export const getImgUrl = (url: string | undefined, size: string = '') => {
  const bdUrl = 'https://image.baidu.com/search/down?url=';
  const imgUrl = `${url}?param=${size}`;
  if (!getIsMc()) {
    return imgUrl;
  }
  return `${bdUrl}${encodeURIComponent(imgUrl)}`;
};

export const isMobile = computed(() => {
  const flag = navigator.userAgent.match(
    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
  );

  store.state.isMobile = !!flag;

  // 给html标签 添加mobile
  if (flag) document.documentElement.classList.add('mobile');
  return !!flag;
});

export const isElectron = (window as any).electron !== undefined;