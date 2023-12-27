// 设置歌手背景图片
export const setBackgroundImg = (url: String) => {
  return 'background-image:' + 'url(' + url + ')'
}
// 设置动画类型
export const setAnimationClass = (type: String) => {
  return 'animate__animated ' + type
}
// 设置动画延时
export const setAnimationDelay = (index: number = 6, time: number = 50) => {
  return 'animation-delay:' + index * time + 'ms'
}

//将秒转换为分钟和秒
export const secondToMinute = (s: number) => {
  if (!s) {
    return '00:00'
  }
  let minute: number = Math.floor(s / 60)
  let second: number = Math.floor(s % 60)
  let minuteStr: string =
    minute > 9 ? minute.toString() : '0' + minute.toString()
  let secondStr: string =
    second > 9 ? second.toString() : '0' + second.toString()
  return minuteStr + ':' + secondStr
}

// 格式化数字 千,万, 百万, 千万,亿
export const formatNumber = (num: any) => {
  num = num * 1
  if (num < 10000) {
    return num
  }
  if (num < 100000000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return (num / 100000000).toFixed(1) + '亿'
}

export const getIsMc = () => {
  return false
}
const ProxyUrl =
  import.meta.env.VITE_API_PROXY + '' || 'http://110.42.251.190:9856'

export const getMusicProxyUrl = (url: string) => {
  if (!getIsMc()) {
    return url
  }
  const PUrl = url.split('').join('+')
  return `${ProxyUrl}/mc?url=${PUrl}`
}

export const getImgUrl = computed(() => (url: string, size: string = '') => {
  const bdUrl = 'https://image.baidu.com/search/down?url='
  const imgUrl = encodeURIComponent(`${url}?param=${size}`)
  return `${bdUrl}${imgUrl}`
})
