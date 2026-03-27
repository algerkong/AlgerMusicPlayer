// Shared types for download system, importable by both main and renderer
// Follows precedent: src/shared/appUpdate.ts

export const DOWNLOAD_TASK_STATE = {
  queued: 'queued',
  downloading: 'downloading',
  paused: 'paused',
  completed: 'completed',
  error: 'error',
  cancelled: 'cancelled'
} as const;

export type DownloadTaskState = (typeof DOWNLOAD_TASK_STATE)[keyof typeof DOWNLOAD_TASK_STATE];

export type DownloadSongInfo = {
  id: number;
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
