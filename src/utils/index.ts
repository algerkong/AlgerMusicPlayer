import { computed } from 'vue';

import store from '@/store';

// 设置歌手背景图片
export const setBackgroundImg = (url: String) => {
  return `background-image:url(${url})`;
};
// 设置动画类型
export const setAnimationClass = (type: String) => {
  return `animate__animated ${type}`;
};
// 设置动画延时
export const setAnimationDelay = (index: number = 6, time: number = 50) => {
  return `animation-delay:${index * time}ms`;
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
  { value: 1e4, symbol: '万' },
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
  if (windowData.electron.ipcRenderer.getStoreValue('set').isProxy) {
    return true;
  }
  return false;
};
const ProxyUrl = import.meta.env.VITE_API_PROXY || 'http://110.42.251.190:9856';

export const getMusicProxyUrl = (url: string) => {
  if (!getIsMc()) {
    return url;
  }
  const PUrl = url.split('').join('+');
  return `${ProxyUrl}/mc?url=${PUrl}`;
};

export const getImgUrl = computed(() => (url: string | undefined, size: string = '') => {
  const bdUrl = 'https://image.baidu.com/search/down?url=';
  const imgUrl = `${url}?param=${size}`;
  if (!getIsMc()) {
    return imgUrl;
  }
  return `${bdUrl}${encodeURIComponent(imgUrl)}`;
});

export const isMobile = computed(() => {
  const flag = navigator.userAgent.match(
    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i,
  );

  store.state.isMobile = !!flag;

  // 给html标签 添加mobile
  if (flag) document.documentElement.classList.add('mobile');
  return !!flag;
});
