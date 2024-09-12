import { createStore } from 'vuex';

import { getMusicUrl, getParsingMusicUrl } from '@/api/music';
import { useMusicHistory } from '@/hooks/MusicHistoryHook';
import homeRouter from '@/router/home';
import type { Song } from '@/type/music';
import { getMusicProxyUrl } from '@/utils';

interface State {
  menus: any[];
  play: boolean;
  isPlay: boolean;
  playMusic: Song;
  playMusicUrl: string;
  user: any;
  playList: Song[];
  playListIndex: number;
  setData: any;
  lyric: any;
  isMobile: boolean;
  searchValue: string;
  searchType: number;
}

const state: State = {
  menus: homeRouter,
  play: false,
  isPlay: false,
  playMusic: {} as Song,
  playMusicUrl: '',
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') as string) : null,
  playList: [],
  playListIndex: 0,
  setData: null,
  lyric: {},
  isMobile: false,
  searchValue: '',
  searchType: 1,
};

const windowData = window as any;

const musicHistory = useMusicHistory();

const mutations = {
  setMenus(state: State, menus: any[]) {
    state.menus = menus;
  },
  async setPlay(state: State, playMusic: Song) {
    state.playMusic = { ...playMusic, playLoading: true };
    state.playMusicUrl = await getSongUrl(playMusic.id);
    state.play = true;
    musicHistory.addMusic(playMusic);
    state.playMusic.playLoading = false;
  },
  setIsPlay(state: State, isPlay: boolean) {
    state.isPlay = isPlay;
  },
  setPlayMusic(state: State, play: boolean) {
    state.play = play;
  },
  setPlayList(state: State, playList: Song[]) {
    state.playListIndex = playList.findIndex((item) => item.id === state.playMusic.id);
    state.playList = playList;
  },
  async nextPlay(state: State) {
    if (state.playList.length === 0) {
      state.play = true;
      return;
    }
    state.playListIndex = (state.playListIndex + 1) % state.playList.length;
    await updatePlayMusic(state);
  },
  async prevPlay(state: State) {
    if (state.playList.length === 0) {
      state.play = true;
      return;
    }
    state.playListIndex = (state.playListIndex - 1 + state.playList.length) % state.playList.length;
    await updatePlayMusic(state);
  },
  async setSetData(state: State, setData: any) {
    state.setData = setData;
    windowData.electron.ipcRenderer.setStoreValue('set', JSON.parse(JSON.stringify(setData)));
  },
};

const getSongUrl = async (id: number) => {
  const { data } = await getMusicUrl(id);
  let url = '';
  try {
    if (data.data[0].freeTrialInfo || !data.data[0].url) {
      const res = await getParsingMusicUrl(id);
      url = res.data.data.url;
    }
  } catch (error) {
    console.error('error', error);
  }
  url = url || data.data[0].url;
  return getMusicProxyUrl(url);
};

const updatePlayMusic = async (state: State) => {
  state.playMusic = state.playList[state.playListIndex];
  state.playMusicUrl = await getSongUrl(state.playMusic.id);
  state.play = true;
  musicHistory.addMusic(state.playMusic);
};

const store = createStore({
  state,
  mutations,
});

export default store;
