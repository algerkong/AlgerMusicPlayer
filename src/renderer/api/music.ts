import { ILyric } from '@/type/lyric';
import { IPlayMusicUrl } from '@/type/music';
import { isElectron } from '@/utils';
import request from '@/utils/request';
import requestMusic from '@/utils/request_music';
// 根据音乐Id获取音乐播放URl
export const getMusicUrl = (id: number) => {
  return request.get<IPlayMusicUrl>('/song/url', { params: { id } });
};

// 获取歌曲详情
export const getMusicDetail = (ids: Array<number>) => {
  return request.get('/song/detail', { params: { ids: ids.join(',') } });
};

// 根据音乐Id获取音乐歌词
export const getMusicLrc = (id: number) => {
  return request.get<ILyric>('/lyric', { params: { id } });
};

export const getParsingMusicUrl = (id: number) => {
  if (isElectron) {
    return window.api.unblockMusic(id);
  }
  return requestMusic.get<any>('/music', { params: { id } });
};
