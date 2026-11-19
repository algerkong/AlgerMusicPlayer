import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkLoginStatus, clearLoginStatus } from '../src/renderer/utils/auth';

function stubLocalStorage(store: Record<string, string>) {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    removeItem: (key: string) => delete store[key],
    setItem: (key: string, value: string) => {
      store[key] = value;
    }
  });
}

const validUser = JSON.stringify({ userId: 12345, nickname: 'tester' });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkLoginStatus 登录态一致性', () => {
  it('扫码登录（loginType=qr）忽略残留的 uidLogin 标志，按需 token 判断', () => {
    stubLocalStorage({
      loginType: 'qr',
      uidLogin: 'true', // 与 qr 矛盾的残留标志
      user: validUser
    });

    const info = checkLoginStatus();
    expect(info.loginType).toBe('qr');
    // qr 登录必须有 token：矛盾标志不应把判定放宽成"UID 登录只需 user"
    expect(info.isLoggedIn).toBe(false);

    stubLocalStorage({
      loginType: 'qr',
      uidLogin: 'true',
      user: validUser,
      token: 'MUSIC_U=xxx'
    });
    expect(checkLoginStatus().isLoggedIn).toBe(true);
  });

  it('loginType=uid 的 UID 登录只需用户数据', () => {
    stubLocalStorage({
      loginType: 'uid',
      uidLogin: 'true',
      user: validUser
    });

    expect(checkLoginStatus().isLoggedIn).toBe(true);
  });

  it('loginType 缺失时 uidLogin 标志作为兜底依据', () => {
    stubLocalStorage({
      uidLogin: 'true',
      user: validUser
    });

    const info = checkLoginStatus();
    expect(info.isLoggedIn).toBe(true);
  });

  it('cookie 登录缺 token 视为未登录', () => {
    stubLocalStorage({
      loginType: 'cookie',
      user: validUser
    });

    expect(checkLoginStatus().isLoggedIn).toBe(false);
  });

  it('user 数据损坏（JSON 解析失败）视为未登录', () => {
    stubLocalStorage({
      loginType: 'qr',
      token: 'MUSIC_U=xxx',
      user: '{broken json'
    });

    expect(checkLoginStatus().isLoggedIn).toBe(false);
  });
});

describe('clearLoginStatus', () => {
  it('清除全部登录相关键', () => {
    const store: Record<string, string> = {
      loginType: 'qr',
      token: 'MUSIC_U=xxx',
      uidLogin: 'true',
      user: validUser
    };
    stubLocalStorage(store);

    clearLoginStatus();

    expect(store.loginType).toBeUndefined();
    expect(store.token).toBeUndefined();
    expect(store.uidLogin).toBeUndefined();
    expect(store.user).toBeUndefined();
  });
});
