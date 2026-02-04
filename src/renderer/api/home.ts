import { IData } from '@/types';
import { IAlbumNew } from '@/types/album';
import { IDayRecommend } from '@/types/day_recommend';
import { IRecommendMusic } from '@/types/music';
import { IPlayListSort } from '@/types/playlist';
import { IHotSearch, ISearchKeyword } from '@/types/search';
import { IHotSinger } from '@/types/singer';
import request from '@/utils/request';

interface IHotSingerParams {
  offset: number;
  limit: number;
}

interface IRecommendMusicParams {
  limit: number;
}

// 获取热门歌手
export const getHotSinger = (params: IHotSingerParams) => {
  return request.get<IHotSinger>('/top/artists', { params });
};

// 获取搜索推荐词
export const getSearchKeyword = () => {
  return request.get<ISearchKeyword>('/search/default');
};

// 获取热门搜索
export const getHotSearch = () => {
  return request.get<IHotSearch>('/search/hot/detail');
};

// 获取歌单分类
export const getPlaylistCategory = () => {
  return request.get<IPlayListSort>('/playlist/catlist');
};

// 获取推荐音乐
export const getRecommendMusic = (params: IRecommendMusicParams) => {
  return request.get<IRecommendMusic>('/personalized/newsong', { params });
};

// 获取每日推荐
export const getDayRecommend = () => {
  return request.get<IData<IData<IDayRecommend>>>('/recommend/songs');
};

// 获取最新专辑推荐
export const getNewAlbum = () => {
  return request.get<IAlbumNew>('/album/newest');
};

// 获取轮播图
export const getBanners = (type: number = 0) => {
  return request.get<any>('/banner', { params: { type } });
};

// 获取推荐歌单
export const getPersonalizedPlaylist = (limit: number = 30) => {
  return request.get<any>('/personalized', { params: { limit } });
};

// 获取私人漫游
export const getPersonalFM = () => {
  return request.get<any>('/personal_fm');
};

// 获取独家放送
export const getPrivateContent = () => {
  return request.get<any>('/personalized/privatecontent');
};

// 获取推荐MV
export const getPersonalizedMV = () => {
  return request.get<any>('/personalized/mv');
};

// 获取新碟上架
export const getTopAlbum = (params?: { limit?: number; offset?: number; area?: string }) => {
  return request.get<any>('/top/album', { params });
};

// 获取推荐电台
export const getPersonalizedDJ = () => {
  return request.get<any>('/personalized/djprogram');
};
