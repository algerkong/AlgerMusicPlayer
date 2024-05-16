import request from '@/utils/request';

// /user/detail
export function getUserDetail(uid: number) {
  return request.get('/user/detail', { params: { uid } });
}

// /user/playlist
export function getUserPlaylist(uid: number) {
  return request.get('/user/playlist', { params: { uid } });
}

// 播放历史
// /user/record?uid=32953014&type=1
export function getUserRecord(uid: number, type: number = 0) {
  return request.get('/user/record', { params: { uid, type } });
}
