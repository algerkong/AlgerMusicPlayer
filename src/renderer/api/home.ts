import { IData } from '@/type';
import { IAlbumNew } from '@/type/album';
import { IDayRecommend } from '@/type/day_recommend';
import { IRecommendMusic } from '@/type/music';
import { IPlayListSort } from '@/type/playlist';
import { IHotSearch, ISearchKeyword } from '@/type/search';
import { IHotSinger } from '@/type/singer';
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
