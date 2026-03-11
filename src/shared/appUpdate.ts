export const APP_UPDATE_STATUS = {
  idle: 'idle',
  checking: 'checking',
  available: 'available',
  notAvailable: 'not-available',
  downloading: 'downloading',
  downloaded: 'downloaded',
  error: 'error'
} as const;

export const APP_UPDATE_RELEASE_URL =
  'https://github.com/algerkong/AlgerMusicPlayer/releases/latest';

export type AppUpdateStatus = (typeof APP_UPDATE_STATUS)[keyof typeof APP_UPDATE_STATUS];

export type AppUpdateState = {
  supported: boolean;
  status: AppUpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string;
  releaseDate: string | null;
  releasePageUrl: string;
  downloadProgress: number;
  downloadedBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
  errorMessage: string | null;
  checkedAt: number | null;
};

export function createDefaultAppUpdateState(currentVersion = ''): AppUpdateState {
  return {
    supported: false,
    status: APP_UPDATE_STATUS.idle,
    currentVersion,
    availableVersion: null,
    releaseNotes: '',
    releaseDate: null,
    releasePageUrl: APP_UPDATE_RELEASE_URL,
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    bytesPerSecond: 0,
    errorMessage: null,
    checkedAt: null
  };
}

export function hasAvailableAppUpdate(state: AppUpdateState): boolean {
  return (
    state.status === APP_UPDATE_STATUS.available ||
    state.status === APP_UPDATE_STATUS.downloading ||
    state.status === APP_UPDATE_STATUS.downloaded
  );
}
