import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserStore } from '@/store/modules/user';

vi.hoisted(() => {
  (globalThis as any).window = { location: { href: 'http://localhost/' } };
});

vi.mock('@/api/login', () => ({ logout: vi.fn() }));
vi.mock('@/api/music', () => ({ getLikedList: vi.fn() }));
vi.mock('@/api/user', () => ({ getUserAlbumSublist: vi.fn(), getUserPlaylist: vi.fn() }));

const entries = new Map<string, string>();

beforeEach(() => {
  entries.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key)
  });
  setActivePinia(createPinia());
});

const loginAs = (loginType: 'cookie' | 'qr' | 'token' | 'uid') => {
  entries.set('user', JSON.stringify({ userId: 123, nickname: 'tester' }));
  entries.set('loginType', JSON.stringify(loginType));
};

describe('心动模式入口的登录态门槛 (#774)', () => {
  it('allows cookie and QR login, both of which store a real cookie', () => {
    for (const type of ['cookie', 'qr', 'token'] as const) {
      loginAs(type);
      expect(useUserStore().hasRealAuth).toBe(true);
    }
  });

  it('rejects uid login, which has no cookie to sign requests with', () => {
    loginAs('uid');
    expect(useUserStore().hasRealAuth).toBe(false);
  });

  it('rejects logged-out sessions', () => {
    expect(useUserStore().hasRealAuth).toBe(false);
  });

  it('tracks login type changes reactively', () => {
    loginAs('qr');
    const user = useUserStore();
    expect(user.hasRealAuth).toBe(true);

    user.setLoginType('uid');
    expect(user.hasRealAuth).toBe(false);
  });
});
