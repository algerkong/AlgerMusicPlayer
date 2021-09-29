import request from "@/utils/request";
import { IList, IRecommendList } from "@/type/list";
import type { IListDetail } from "@/type/listDetail";

interface IListByTagParams {
  tag: string;
  before: number;
  limit: number;
}

// 根据tag 获取歌单列表
export function getListByTag(params: IListByTagParams) {
  return request.get<IList>("/top/playlist/highquality", { params: params });
}

// 获取推荐歌单
export function getRecommendList(limit: number = 30) {
  return request.get<IRecommendList>("/personalized", { params: { limit } });
}

// 获取歌单详情
export function getListDetail(id: number | string) {
  return request.get<IListDetail>("/playlist/detail", { params: { id } });
}
