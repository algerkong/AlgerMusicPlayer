import { createStore } from 'vuex';

import { useMusicListHook } from '@/hooks/MusicListHook';
import homeRouter from '@/router/home';
import type { SongResult } from '@/type/music';
import { applyTheme, getCurrentTheme, ThemeType } from '@/utils/theme';
import { isElectron } from '@/utils';

// 默认设置
const defaultSettings = {
  isProxy: false,
  noAnimate: false,
  animationSpeed: 1,
  author: 'Alger',
  authorUrl: 'https://github.com/algerkong'
};

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
      window.electron.ipcRenderer.send('set-store-value', 'set', JSON.parse(JSON.stringify(setData)));
    } else {
      localStorage.setItem('appSettings', JSON.stringify(setData));
    }
  },
  addToFavorite(state: State, songId: number) {
    if (!state.favoriteList.includes(songId)) {
      state.favoriteList = [songId, ...state.favoriteList];
      localStorage.setItem('favoriteList', JSON.stringify(state.favoriteList));
    }
  },
  removeFromFavorite(state: State, songId: number) {
    state.favoriteList = state.favoriteList.filter((id) => id !== songId);
    localStorage.setItem('favoriteList', JSON.stringify(state.favoriteList));
  },
  togglePlayMode(state: State) {
    state.playMode = (state.playMode + 1) % 3;
    localStorage.setItem('playMode', JSON.stringify(state.playMode));
  },
  toggleTheme(state: State) {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
  },
  SET_SHOW_UPDATE_MODAL(state, value) {
    state.showUpdateModal = value
  }
};

const actions = {
  initializeSettings({ commit }: { commit: any }) {
    if (isElectron) {
      // const setData = (window as any).electron.ipcRenderer.getStoreValue('set');
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
  }
};

const store = createStore({
  state,
  mutations,
  actions
});

export default store;
