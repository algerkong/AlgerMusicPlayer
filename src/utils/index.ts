// 设置歌手背景图片
export const setBackgroundImg = (url: String) => {
  return "background-image:" + "url(" + url + ")";
};
// 设置动画类型
export const setAnimationClass = (type: String) => {
  return "animate__animated " + type;
};
// 设置动画延时
export const setAnimationDelay = (index: number = 6, time: number = 50) => {
  return "animation-delay:" + index * time + "ms";
};

//将秒转换为分钟和秒
export const secondToMinute = (s: number) => {
  let minute: number = Math.floor(s / 60);
  let second: number = Math.floor(s % 60);
  let minuteStr: string =
    minute > 9 ? minute.toString() : "0" + minute.toString();
  let secondStr: string =
    second > 9 ? second.toString() : "0" + second.toString();
  return minuteStr + ":" + secondStr;
};
