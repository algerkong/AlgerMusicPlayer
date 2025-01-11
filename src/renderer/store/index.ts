import { createStore } from 'vuex';

import setData from '@/../main/set.json';
import { getLikedList, likeSong } from '@/api/music';
import { useMusicListHook } from '@/hooks/MusicListHook';
import homeRouter from '@/router/home';
import type { SongResult } from '@/type/music';
import { isElectron } from '@/utils';
import { applyTheme, getCurrentTheme, ThemeType } from '@/utils/theme';

// 默认设置
const defaultSettings = setData;

function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
}

interface State {
  menus: any[];
  play: boolean;
  isPlay: boolean;
  playMusic: SongResult;
  playMusicUrl: string;
  user: any;
  playList: SongResult[];
  playListIndex: number;
  setData: any;
  lyric: any;
  isMobile: boolean;
  searchValue: string;
  searchType: number;
  favoriteList: number[];
  playMode: number;
  theme: ThemeType;
  musicFull: boolean;
  showUpdateModal: boolean;
}

const state: State = {
  menus: homeRouter,
  play: false,
  isPlay: false,
  playMusic: {} as SongResult,
  playMusicUrl: '',
  user: getLocalStorageItem('user', null),
  playList: [],
  playListIndex: 0,
  setData: defaultSettings,
  lyric: {},
  isMobile: false,
  searchValue: '',
  searchType: 1,
  favoriteList: getLocalStorageItem('favoriteList', []),
  playMode: getLocalStorageItem('playMode', 0),
  theme: getCurrentTheme(),
  musicFull: false,
  showUpdateModal: false
};

const { handlePlayMusic, nextPlay, prevPlay } = useMusicListHook();

const mutations = {
  setMenus(state: State, menus: any[]) {
    state.menus = menus;
  },
  async setPlay(state: State, playMusic: SongResult) {
    await handlePlayMusic(state, playMusic);
  },
  setIsPlay(state: State, isPlay: boolean) {
    state.isPlay = isPlay;
  },
  setPlayMusic(state: State, play: boolean) {
    state.play = play;
  },
  setMusicFull(state: State, musicFull: boolean) {
    state.musicFull = musicFull;
  },
  setPlayList(state: State, playList: SongResult[]) {
    state.playListIndex = playList.findIndex((item) => item.id === state.playMusic.id);
    state.playList = playList;
  },
  async nextPlay(state: State) {
    await nextPlay(state);
  },
  async prevPlay(state: State) {
    await prevPlay(state);
  },
  setSetData(state: State, setData: any) {
    state.setData = setData;
    if (isElectron) {
      // (window as any).electron.ipcRenderer.setStoreValue(
      //   'set',
      //   JSON.parse(JSON.stringify(setData))
      // );
      window.electron.ipcRenderer.send(
        'set-store-value',
        'set',
        JSON.parse(JSON.stringify(setData))
      );
    } else {
      localStorage.setItem('appSettings', JSON.stringify(setData));
    }
  },
  async addToFavorite(state: State, songId: number) {
    // 先添加到本地
    if (!state.favoriteList.includes(songId)) {
      state.favoriteList = [songId, ...state.favoriteList];
      localStorage.setItem('favoriteList', JSON.stringify(state.favoriteList));
    }

    // 如果用户已登录，尝试同步到服务器
    if (state.user && localStorage.getItem('token')) {
      try {
        await likeSong(songId, true);
      } catch (error) {
        console.error('同步收藏到服务器失败，但已保存在本地:', error);
      }
    }
  },
  async removeFromFavorite(state: State, songId: number) {
    // 先从本地移除
    state.favoriteList = state.favoriteList.filter((id) => id !== songId);
    localStorage.setItem('favoriteList', JSON.stringify(state.favoriteList));

    // 如果用户已登录，尝试同步到服务器
    if (state.user && localStorage.getItem('token')) {
      try {
        await likeSong(songId, false);
      } catch (error) {
        console.error('同步取消收藏到服务器失败，但已在本地移除:', error);
      }
    }
  },
  togglePlayMode(state: State) {
    state.playMode = (state.playMode + 1) % 3;
    localStorage.setItem('playMode', JSON.stringify(state.playMode));
  },
  toggleTheme(state: State) {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
  },
  setShowUpdateModal(state, value) {
    state.showUpdateModal = value;
  },
  logout(state: State) {
    state.user = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
};

const actions = {
  initializeSettings({ commit }: { commit: any }) {
    if (isElectron) {
      const setData = window.electron.ipcRenderer.sendSync('get-store-value', 'set');
      commit('setSetData', setData || defaultSettings);
    } else {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        commit('setSetData', {
          ...defaultSettings,
          ...JSON.parse(savedSettings)
        });
      } else {
        commit('setSetData', defaultSettings);
      }
    }
  },
  initializeTheme({ state }: { state: State }) {
    applyTheme(state.theme);
  },
  async initializeFavoriteList({ state }: { state: State }) {
    // 先获取本地收藏列表
    const localFavoriteList = localStorage.getItem('favoriteList');
    const localList: number[] = localFavoriteList ? JSON.parse(localFavoriteList) : [];

    // 如果用户已登录，尝试获取服务器收藏列表并合并
    if (state.user && localStorage.getItem('token')) {
      try {
        const res = await getLikedList();
        if (res.data?.ids) {
          // 合并本地和服务器的收藏列表，去重
          const serverList = res.data.ids.reverse();
          const mergedList = Array.from(new Set([...localList, ...serverList]));
          state.favoriteList = mergedList;
        } else {
          state.favoriteList = localList;
        }
      } catch (error) {
        console.error('获取服务器收藏列表失败，使用本地数据:', error);
        state.favoriteList = localList;
      }
    } else {
      state.favoriteList = localList;
    }

    // 更新本地存储
    localStorage.setItem('favoriteList', JSON.stringify(state.favoriteList));
  }
};

const store = createStore({
  state,
  mutations,
  actions
});

export default store;
