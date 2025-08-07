import { defineStore } from 'pinia';
import { ref } from 'vue';

import { logout } from '@/api/login';
import { getLikedList } from '@/api/music';
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
  const loginType = ref<'token' | 'cookie' | 'qr' | 'uid' | null>(
    getLocalStorageItem('loginType', null)
  );
  const searchValue = ref('');
  const searchType = ref(1);

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
      clearLoginStatus();
      // 刷新
      window.location.reload();
    } catch (error) {
      console.error('登出失败:', error);
      // 即使API调用失败，也要清除本地状态
      user.value = null;
      loginType.value = null;
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

  // 初始化
  const initializeUser = async () => {
    const savedUser = getLocalStorageItem<UserData | null>('user', null);
    if (savedUser) {
      user.value = savedUser;
      // 如果用户已登录，获取收藏列表
      if (localStorage.getItem('token')) {
        try {
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

    // 方法
    setUser,
    setLoginType,
    handleLogout,
    setSearchValue,
    setSearchType,
    initializeUser
  };
});
