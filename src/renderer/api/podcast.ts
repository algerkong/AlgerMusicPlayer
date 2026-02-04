import type {
  DjCategoryListResponse,
  DjDetailResponse,
  DjProgramDetailResponse,
  DjProgramResponse,
  DjRadioHotResponse,
  DjRecommendResponse,
  DjSublistResponse,
  DjTodayPerferedResponse,
  DjToplistResponse,
  PersonalizedDjProgramResponse,
  RecentDjResponse
} from '@/types/podcast';
import request from '@/utils/request';

export const subscribeDj = (rid: number, t: 1 | 0) => {
  return request.get('/dj/sub', { params: { rid, t } });
};

export const getDjSublist = () => {
  return request.get<DjSublistResponse>('/dj/sublist');
};

export const getDjDetail = (rid: number) => {
  return request.get<DjDetailResponse>('/dj/detail', { params: { rid } });
};

export const getDjProgram = (rid: number, limit = 30, offset = 0, asc = false) => {
  return request.get<DjProgramResponse>('/dj/program', {
    params: { rid, limit, offset, asc }
  });
};

export const getDjProgramDetail = (id: number) => {
  return request.get<DjProgramDetailResponse>('/dj/program/detail', { params: { id } });
};

export const getDjRecommend = () => {
  return request.get<DjRecommendResponse>('/dj/recommend');
};

export const getDjCategoryList = () => {
  return request.get<DjCategoryListResponse>('/dj/catelist');
};

export const getDjRecommendByType = (type: number) => {
  return request.get<DjRecommendResponse>('/dj/recommend/type', { params: { type } });
};

export const getDjCategoryRecommend = () => {
  return request.get('/dj/category/recommend');
};

export const getDjTodayPerfered = () => {
  return request.get<DjTodayPerferedResponse>('/dj/today/perfered');
};

export const getDjPersonalizeRecommend = (limit = 5) => {
  return request.get<DjTodayPerferedResponse>('/dj/personalize/recommend', { params: { limit } });
};

export const getDjBanner = () => {
  return request.get('/dj/banner');
};

export const getPersonalizedDjProgram = () => {
  return request.get<PersonalizedDjProgramResponse>('/personalized/djprogram');
};

export const getDjToplist = (type: 'new' | 'hot', limit = 100) => {
  return request.get<DjToplistResponse>('/dj/toplist', { params: { type, limit } });
};

export const getDjRadioHot = (cateId: number, limit = 30, offset = 0) => {
  return request.get<DjRadioHotResponse>('/dj/radio/hot', {
    params: { cateId, limit, offset }
  });
};

export const getRecentDj = () => {
  return request.get<RecentDjResponse>('/record/recent/dj');
};

export const getDjComment = (id: number, limit = 20, offset = 0) => {
  return request.get('/comment/dj', { params: { id, limit, offset } });
};
