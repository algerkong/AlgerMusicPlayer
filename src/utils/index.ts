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

export const cookie = {
  /**
   * @name: 设置cookie值
   * @param:  cname   string  cookie名称
   * @param:  cvalue  any cookie值
   * @param:  exdays  number  cookie保存天数
   */
  setCookie(cname: string, cvalue: any, exdays = 720) {
    var d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
  },
  /**
   * @name: 获取cookie值
   */
  getCookie(cname: string) {
    var name = cname + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == " ") c = c.substring(1);
      if (c.indexOf(name) != -1) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  },
  /**
   * @name: 清除cookie值
   * @param:  cname   string  cookie名称
   */
  clearCookie(cname: string) {
    var d = new Date();
    d.setTime(-1);
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=''; " + expires;
  },
};
