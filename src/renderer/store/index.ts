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
    try {
      state.user && localStorage.getItem('token') && (await likeSong(songId, true));
      if (!state.favoriteList.includes(songId)) {
        state.favoriteList = [songId, ...state.favoriteList];
        localStorage.setItem('favoriteList', JSON.stringify(state.favoriteList));
      }
    } catch (error) {
      console.error('收藏歌曲失败:', error);
    }
  },
  async removeFromFavorite(state: State, songId: number) {
    try {
      state.user && localStorage.getItem('token') && (await likeSong(songId, false));
      state.favoriteList = state.favoriteList.filter((id) => id !== songId);
      localStorage.setItem('favoriteList', JSON.stringify(state.favoriteList));
    } catch (error) {
      console.error('取消收藏歌曲失败:', error);
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
    try {
      if (state.user && localStorage.getItem('token')) {
        const res = await getLikedList();
        if (res.data?.ids) {
          state.favoriteList = res.data.ids.reverse();
          localStorage.setItem('favoriteList', JSON.stringify(state.favoriteList));
        }
      } else {
        const localFavoriteList = localStorage.getItem('favoriteList');
        if (localFavoriteList) {
          state.favoriteList = JSON.parse(localFavoriteList);
        }
      }
    } catch (error) {
      console.error('获取收藏列表失败:', error);
    }
  }
};

const store = createStore({
  state,
  mutations,
  actions
});

export default store;
