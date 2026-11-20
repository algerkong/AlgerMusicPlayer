export type WebdavConfig = {
  /** WebDAV 目录地址，如 https://dav.jianguoyun.com/dav/ */
  url: string;
  username: string;
  password: string;
};

export type WebdavErrorKind = 'invalidUrl' | 'auth' | 'http' | 'network';

export type WebdavResult<T> =
  { ok: true; data: T } | { ok: false; error: WebdavErrorKind; status?: number };

export const createDefaultWebdavConfig = (): WebdavConfig => ({
  url: '',
  username: '',
  password: ''
});
