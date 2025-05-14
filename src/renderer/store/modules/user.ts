import { defineStore } from 'pinia';
import { ref } from 'vue';

import { logout } from '@/api/login';
import { getLikedList } from '@/api/music';

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
  const searchValue = ref('');
  const searchType = ref(1);

  // 方法
  const setUser = (userData: UserData) => {
    user.value = userData;
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      await logout();
      user.value = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      // 刷新
      window.location.reload();
    } catch (error) {
      console.error('登出失败:', error);
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
    searchValue,
    searchType,

    // 方法
    setUser,
    handleLogout,
    setSearchValue,
    setSearchType,
    initializeUser
  };
});
