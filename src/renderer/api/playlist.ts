import request from '@/utils/request';

/**
 * 歌单导入 - 元数据/文字/链接导入
 * @param params 导入参数
 */
export function importPlaylist(params: {
  local?: string;
  text?: string;
  link?: string;
  importStarPlaylist?: boolean;
  playlistName?: string;
}) {
  return request.post('/playlist/import/name/task/create', params);
}

/**
 * 歌单导入 - 任务状态
 * @param id 任务ID
 */
export function getImportTaskStatus(id: string | number) {
  return request({
    url: '/playlist/import/task/status',
    method: 'get',
    params: { id }
  });
}
