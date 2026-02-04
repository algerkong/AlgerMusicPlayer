import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { logout } from '@/api/login';
import { getLikedList } from '@/api/music';
import { getUserAlbumSublist, getUserPlaylist } from '@/api/user';
import type { IUserDetail } from '@/types/user';
import { clearLoginStatus } from '@/utils/auth';

interface UserData {
  userId: number;
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
  // 状态
  const user = ref<UserData | null>(getLocalStorageItem('user', null));
  const userDetail = ref<IUserDetail | null>(null);
  const recordList = ref<any[]>([]);
  const loginType = ref<'token' | 'cookie' | 'qr' | 'uid' | null>(
    getLocalStorageItem('loginType', null)
  );
  const searchValue = ref('');
  const searchType = ref(1);
  // 收藏的专辑 ID 列表
  const collectedAlbumIds = ref<Set<number>>(new Set());
  // 用户的歌单列表
  const playList = ref<any[]>([]);
  // 用户的专辑列表
  const albumList = ref<any[]>([]);

  // 方法
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
    try {
      await logout();
      user.value = null;
      loginType.value = null;
      collectedAlbumIds.value.clear();
      playList.value = [];
      albumList.value = [];
      clearLoginStatus();
      // 刷新
      window.location.reload();
    } catch (error) {
      console.error('登出失败:', error);
      // 即使API调用失败，也要清除本地状态
      user.value = null;
      loginType.value = null;
      collectedAlbumIds.value.clear();
      playList.value = [];
      albumList.value = [];
      clearLoginStatus();
      window.location.reload();
    }
  };

  const setSearchValue = (value: string) => {
    searchValue.value = value;
  };

  const setSearchType = (type: number) => {
    searchType.value = type;
  };

  // 初始化歌单列表
  const initializePlaylist = async () => {
    if (!user.value) {
      playList.value = [];
      return;
    }

    try {
      const { data } = await getUserPlaylist(user.value.userId, 1000, 0);
      playList.value = data?.playlist || [];
      console.log(`已加载 ${playList.value.length} 个歌单`);
    } catch (error) {
      console.error('获取歌单列表失败:', error);
      playList.value = [];
    }
  };

  // 初始化专辑列表
  const initializeAlbumList = async () => {
    if (!user.value || !localStorage.getItem('token')) {
      albumList.value = [];
      return;
    }

    try {
      const { data } = await getUserAlbumSublist({ limit: 1000, offset: 0 });
      albumList.value = data?.data || [];
      console.log(`已加载 ${albumList.value.length} 个收藏专辑`);
    } catch (error) {
      console.error('获取专辑列表失败:', error);
      albumList.value = [];
    }
  };

  // 初始化收藏的专辑ID列表
  const initializeCollectedAlbums = async () => {
    if (!user.value || !localStorage.getItem('token')) {
      collectedAlbumIds.value.clear();
      return;
    }

    try {
      const { data } = await getUserAlbumSublist({ limit: 1000, offset: 0 });
      const albumIds = (data?.data || []).map((album: any) => album.id);
      collectedAlbumIds.value = new Set(albumIds);
      console.log(`已加载 ${albumIds.length} 个收藏专辑ID`);
    } catch (error) {
      console.error('获取收藏专辑列表失败:', error);
      collectedAlbumIds.value.clear();
    }
  };

  // 添加收藏专辑
  const addCollectedAlbum = (albumId: number) => {
    collectedAlbumIds.value.add(albumId);
  };

  // 移除收藏专辑
  const removeCollectedAlbum = (albumId: number) => {
    collectedAlbumIds.value.delete(albumId);
  };

  // 检查专辑是否已收藏
  const isAlbumCollected = (albumId: number) => {
    return collectedAlbumIds.value.has(albumId);
  };

  // 判断用户是否为VIP
  const isVip = computed(() => {
    if (!user.value) return false;
    // vipType: 0 非VIP, 11 VIP
    return user.value.vipType && user.value.vipType !== 0;
  });

  // 初始化
  const initializeUser = async () => {
    const savedUser = getLocalStorageItem<UserData | null>('user', null);
    if (savedUser) {
      user.value = savedUser;
      // 如果用户已登录，获取收藏列表
      if (localStorage.getItem('token')) {
        try {
          // 并行加载歌单、专辑和收藏ID列表
          await Promise.all([
            initializePlaylist(),
            initializeAlbumList(),
            initializeCollectedAlbums()
          ]);

          const { data } = await getLikedList(savedUser.userId);
          return data?.ids || [];
        } catch (error) {
          console.error('获取收藏列表失败:', error);
          return [];
        }
      }
    }
    return [];
  };

  return {
    // 状态
    user,
    loginType,
    searchValue,
    searchType,
    collectedAlbumIds,
    playList,
    albumList,
    isVip,

    // 方法
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
