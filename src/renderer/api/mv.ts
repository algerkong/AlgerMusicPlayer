import { IData } from '@/types';
import { IMvUrlData } from '@/types/mv';
import request from '@/utils/request';

interface MvParams {
  limit?: number;
  offset?: number;
  area?: string;
}

// 获取 mv 排行
export const getTopMv = (params: MvParams) => {
  return request({
    url: '/mv/all',
    method: 'get',
    params
  });
};

// 获取所有mv
export const getAllMv = (params: MvParams) => {
  return request({
    url: '/mv/all',
    method: 'get',
    params
  });
};

// 获取 mv 数据
export const getMvDetail = (mvid: string) => {
  return request.get('/mv/detail', {
    params: {
      mvid
    }
  });
};

// 获取 mv 地址
export const getMvUrl = (id: Number) => {
  return request.get<IData<IMvUrlData>>('/mv/url', {
    params: {
      id
    }
  });
};
