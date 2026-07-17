// 下载系统共享类型，主进程与渲染进程均可引用
// 写法对齐 src/shared/appUpdate.ts

export const DOWNLOAD_TASK_STATE = {
  queued: 'queued',
  downloading: 'downloading',
  paused: 'paused',
  /** 直链过期，等待 renderer 重新解析 URL 后再入队 */
  waitingForUrl: 'waitingForUrl',
  completed: 'completed',
  error: 'error',
  cancelled: 'cancelled'
} as const;

export type DownloadTaskState = (typeof DOWNLOAD_TASK_STATE)[keyof typeof DOWNLOAD_TASK_STATE];

export type DownloadSongInfo = {
  /** 汽水雪花 id 必须用 string，Number 会丢精度 */
  id: string | number;
  name: string;
  picUrl: string;
  ar: { name: string }[];
  al: { name: string; picUrl: string };
};

export type DownloadTask = {
  taskId: string;
  url: string;
  filename: string;
  songInfo: DownloadSongInfo;
  type: string;
  state: DownloadTaskState;
  progress: number;
  loaded: number;
  total: number;
  tempFilePath: string;
  finalFilePath: string;
  error?: string;
  createdAt: number;
  batchId?: string;
};

export type DownloadSettings = {
  path: string;
  nameFormat: string;
  separator: string;
  saveLyric: boolean;
  maxConcurrent: number;
};

export type DownloadProgressEvent = {
  taskId: string;
  progress: number;
  loaded: number;
  total: number;
};

export type DownloadStateChangeEvent = {
  taskId: string;
  state: DownloadTaskState;
  task: DownloadTask;
};

export type DownloadBatchCompleteEvent = {
  batchId: string;
  total: number;
  success: number;
  failed: number;
};

export type DownloadRequestUrlEvent = {
  taskId: string;
  songInfo: DownloadSongInfo;
};

export function createDefaultDownloadSettings(): DownloadSettings {
  return {
    path: '',
    nameFormat: '{songName} - {artistName}',
    separator: ' - ',
    saveLyric: false,
    maxConcurrent: 3
  };
}
