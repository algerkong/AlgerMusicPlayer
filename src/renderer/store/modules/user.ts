import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { msLogout } from '@/api/musicSource';
import type { IUserDetail } from '@/types/user';
import { isElectron } from '@/utils';
import { clearLoginStatus } from '@/utils/auth';

interface UserData {
  /** 兼容旧 UI；汽水雪花可能超出 safe integer，此时以 user_id 为准 */
  userId: number;
  /** 权威用户 id（字符串，可表示雪花） */
  user_id?: string;
  [key: string]: any;
}

function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export const useUserStore = defineStore('user', () => {
  const user = ref<UserData | null>(getLocalStorageItem('user', null));
  const userDetail = ref<IUserDetail | null>(null);
  const recordList = ref<any[]>([]);
  const loginType = ref<'token' | 'cookie' | 'qr' | 'uid' | null>(
    getLocalStorageItem('loginType', null)
  );
  const searchValue = ref('');
  const searchType = ref(1);
  const collectedAlbumIds = ref<Set<number>>(new Set());
  const playList = ref<any[]>([]);
  const albumList = ref<any[]>([]);

  const setUser = (userData: UserData) => {
    user.value = userData;
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const setLoginType = (type: typeof loginType.value) => {
    loginType.value = type;
    if (type) {
      localStorage.setItem('loginType', type);
    } else {
      localStorage.removeItem('loginType');
    }
  };

  const handleLogout = async () => {
    if (isElectron) {
      try {
        await msLogout();
      } catch (error) {
        console.warn('[user] msLogout failed:', error);
      }
    }
    user.value = null;
    loginType.value = null;
    collectedAlbumIds.value.clear();
    playList.value = [];
    albumList.value = [];
    clearLoginStatus();
    window.location.reload();
  };

  const setSearchValue = (value: string) => {
    searchValue.value = value;
  };

  const setSearchType = (type: number) => {
    searchType.value = type;
  };

  const initializePlaylist = async () => {
    playList.value = [];
  };

  const initializeAlbumList = async () => {
    albumList.value = [];
  };

  const initializeCollectedAlbums = async () => {
    collectedAlbumIds.value.clear();
  };

  const addCollectedAlbum = (albumId: number) => {
    collectedAlbumIds.value.add(albumId);
  };

  const removeCollectedAlbum = (albumId: number) => {
    collectedAlbumIds.value.delete(albumId);
  };

  const isAlbumCollected = (albumId: number) => {
    return collectedAlbumIds.value.has(albumId);
  };

  /** 是否会员（VIP 或 SVIP） */
  const isVip = computed(() => {
    if (!user.value) return false;
    const level = String(user.value.vipLevel || '').toLowerCase();
    if (level === 'svip' || level === 'vip') return true;
    return !!(user.value.vipType && user.value.vipType !== 0);
  });

  /** none | vip | svip */
  const vipLevel = computed(() => {
    const level = String(user.value?.vipLevel || '').toLowerCase();
    if (level.includes('svip') || level.includes('super')) return 'svip' as const;
    if (level.includes('vip') || (user.value?.vipType && user.value.vipType !== 0)) {
      return 'vip' as const;
    }
    return 'none' as const;
  });

  /** 展示用：SVIP / VIP / 空 */
  const vipLabel = computed(() => {
    if (vipLevel.value === 'svip') return 'SVIP';
    if (vipLevel.value === 'vip') return 'VIP';
    return '';
  });

  const initializeUser = async () => {
    const savedUser = getLocalStorageItem<UserData | null>('user', null);
    if (savedUser) {
      user.value = savedUser;
    }
    return [];
  };

  return {
    user,
    loginType,
    searchValue,
    searchType,
    collectedAlbumIds,
    playList,
    albumList,
    isVip,
    vipLevel,
    vipLabel,
    setUser,
    setLoginType,
    handleLogout,
    setSearchValue,
    setSearchType,
    initializeUser,
    initializePlaylist,
    initializeAlbumList,
    initializeCollectedAlbums,
    addCollectedAlbum,
    removeCollectedAlbum,
    isAlbumCollected,
    userDetail,
    recordList
  };
});
