import { IPlayMusicUrl } from "@/type/music";
import request from "@/utils/request";

// 根据音乐Id获取音乐播放URl
export const getMusicUrl = (id: number) => {
  return request.get<IPlayMusicUrl>("/song/url", { params: { id: id } });
};
