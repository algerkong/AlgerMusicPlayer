import request from '@/utils/request';

interface IParams {
  keywords: string;
  type: number;
}
// 搜索内容
export const getSearch = (params: IParams) => {
  return request.get<any>('/cloudsearch', {
    params,
  });
};
