import { IList } from '@/types/list';
import type { IListDetail } from '@/types/listDetail';
import request from '@/utils/request';

interface IListByTagParams {
  tag: string;
  before: number;
  limit: number;
}

interface IListByCatParams {
  cat: string;
  offset: number;
  limit: number;
}

// 根据tag 获取歌单列表
export function getListByTag(params: IListByTagParams) {
  return request.get<IList>('/top/playlist/highquality', { params });
}

// 根据cat 获取歌单列表
export function getListByCat(params: IListByCatParams) {
  return request.get('/top/playlist', {
    params
  });
}

// 获取推荐歌单
export function getRecommendList(limit: number = 30) {
  return request.get('/personalized', { params: { limit } });
}

// 获取歌单详情
export function getListDetail(id: number | string) {
  return request.get<IListDetail>('/playlist/detail', { params: { id } });
}

// 获取专辑内容
export function getAlbum(id: number | string) {
  return request.get('/album', { params: { id } });
}

// 获取排行榜列表
export function getToplist() {
  return request.get('/toplist');
}
