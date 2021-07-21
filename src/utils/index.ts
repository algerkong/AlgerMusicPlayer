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
