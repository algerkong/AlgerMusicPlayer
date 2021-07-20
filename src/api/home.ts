import request from "@/utils/request";
import { IHotSinger } from "@/type/singer";
import { ISearchKeyword } from "@/type/search";
import { IPlayListSort } from "@/type/playlist";
import { IRecommendMusic } from "@/type/music";

interface IHotSingerParams {
  offset: number;
  limit: number;
}

interface IRecommendMusicParams {
  limit: number;
}

// 获取热门歌手
export const getHotSinger = (params: IHotSingerParams) => {
  return request.get<IHotSinger>("/top/artists", { params });
};

// 获取搜索推荐词
export const getSearchKeyword = () => {
  return request.get<ISearchKeyword>("/search/default");
};

// 获取歌单分类
export const getPlaylistCategory = () => {
  return request.get<IPlayListSort>("/playlist/catlist");
};

// 获取推荐音乐
export const getRecommendMusic = (params: IRecommendMusicParams) => {
  return request.get<IRecommendMusic>("/personalized/newsong", { params });
};
