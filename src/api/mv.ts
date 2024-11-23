import { IData } from '@/type';
import { IMvItem, IMvUrlData } from '@/type/mv';
import request from '@/utils/request';

// 获取 mv 排行
export const getTopMv = (limit = 30, offset = 0) => {
  return request({
    url: '/mv/all',
    method: 'get',
    params: {
      limit,
      offset,
    },
  });
};

// 获取 mv 数据
export const getMvDetail = (mvid: string) => {
  return request.get('/mv/detail', {
    params: {
      mvid,
    },
  });
};

// 获取 mv 地址
export const getMvUrl = (id: Number) => {
  return request.get<IData<IMvUrlData>>('/mv/url', {
    params: {
      id,
    },
  });
};
