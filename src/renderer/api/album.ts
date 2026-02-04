import request from '@/utils/request';

export const getNewAlbums = (params: { limit: number; offset: number; area: string }) => {
  return request.get<any>('/album/new', { params });
};
