import { createStore } from 'vuex';

import { useMusicListHook } from '@/hooks/MusicListHook';
import homeRouter from '@/router/home';
import type { SongResult } from '@/type/music';

// 默认设置
const defaultSettings = {
  isProxy: false,
  noAnimate: false,
  animationSpeed: 1,
  author: 'Alger',
  authorUrl: 'https://github.com/algerkong',
};

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
}

const state: State = {
  menus: homeRouter,
  play: false,
  isPlay: false,
  playMusic: {} as SongResult,
  playMusicUrl: '',
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') as string) : null,
  playList: [],
  playListIndex: 0,
  setData: defaultSettings,
  lyric: {},
  isMobile: false,
  searchValue: '',
  searchType: 1,
  favoriteList: localStorage.getItem('favoriteList') ? JSON.parse(localStorage.getItem('favoriteList') || '[]') : [],
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
    const isElectron = (window as any).electronAPI !== undefined;
    if (isElectron) {
      (window as any).electron.ipcRenderer.setStoreValue('set', JSON.parse(JSON.stringify(setData)));
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
};

const actions = {
  initializeSettings({ commit }: { commit: any }) {
    const isElectron = (window as any).electronAPI !== undefined;

    if (isElectron) {
      const setData = (window as any).electron.ipcRenderer.getStoreValue('set');
      commit('setSetData', setData || defaultSettings);
    } else {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        commit('setSetData', {
          ...defaultSettings,
          ...JSON.parse(savedSettings),
        });
      } else {
        commit('setSetData', defaultSettings);
      }
    }
  },
};

const store = createStore({
  state,
  mutations,
  actions,
});

export default store;
