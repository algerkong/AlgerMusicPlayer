import { createStore } from 'vuex';

import setData from '@/../main/set.json';
import { getLikedList, likeSong } from '@/api/music';
import { useMusicListHook } from '@/hooks/MusicListHook';
import homeRouter from '@/router/home';
import { audioService } from '@/services/audioService';
import type { SongResult } from '@/type/music';
import { isElectron } from '@/utils';
import { applyTheme, getCurrentTheme, ThemeType } from '@/utils/theme';

// 默认设置
const defaultSettings = setData;

function isValidUrl(urlString: string): boolean {
  try {
    return Boolean(new URL(urlString));
  } catch (e) {
    return false;
  }
}

function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    // 尝试解析 JSON
    const parsedItem = JSON.parse(item);

    // 对于音乐 URL，检查是否是有效的 URL 格式或本地文件路径
    if (key === 'currentPlayMusicUrl' && typeof parsedItem === 'string') {
      if (!parsedItem.startsWith('local://') && !isValidUrl(parsedItem)) {
        console.warn(`Invalid URL in localStorage for key ${key}, using default value`);
        localStorage.removeItem(key);
        return defaultValue;
      }
    }

    // 对于播放列表，检查是否是数组且每个项都有必要的字段
    if (key === 'playList') {
      if (!Array.isArray(parsedItem)) {
        console.warn(`Invalid playList format in localStorage, using default value`);
        localStorage.removeItem(key);
        return defaultValue;
      }
      // 检查每个歌曲对象是否有必要的字段
      const isValid = parsedItem.every((item) => item && typeof item === 'object' && 'id' in item);
      if (!isValid) {
        console.warn(`Invalid song objects in playList, using default value`);
        localStorage.removeItem(key);
        return defaultValue;
      }
    }

    // 对于当前播放音乐，检查是否是对象且包含必要的字段
    if (key === 'currentPlayMusic') {
      if (!parsedItem || typeof parsedItem !== 'object' || !('id' in parsedItem)) {
        console.warn(`Invalid currentPlayMusic format in localStorage, using default value`);
        localStorage.removeItem(key);
        return defaultValue;
      }
    }

    return parsedItem;
  } catch (error) {
    console.warn(`Error parsing localStorage item for key ${key}:`, error);
    // 如果解析失败，删除可能损坏的数据
    localStorage.removeItem(key);
    return defaultValue;
  }
}

export interface State {
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
  showArtistDrawer: boolean;
  currentArtistId: number | null;
  systemFonts: { label: string; value: string }[];
}

const state: State = {
  menus: homeRouter,
  play: false,
  isPlay: false,
  playMusic: getLocalStorageItem('currentPlayMusic', {} as SongResult),
  playMusicUrl: getLocalStorageItem('currentPlayMusicUrl', ''),
  user: getLocalStorageItem('user', null),
  playList: getLocalStorageItem('playList', []),
  playListIndex: getLocalStorageItem('playListIndex', 0),
  setData: defaultSettings,
  lyric: {},
  isMobile: false,
  searchValue: '',
  searchType: 1,
  favoriteList: getLocalStorageItem('favoriteList', []),
  playMode: getLocalStorageItem('playMode', 0),
  theme: getCurrentTheme(),
  musicFull: false,
  showUpdateModal: false,
  showArtistDrawer: false,
  currentArtistId: null,
  systemFonts: [{ label: '系统默认', value: 'system-ui' }]
};

const { handlePlayMusic, nextPlay, prevPlay } = useMusicListHook();

const mutations = {
  setMenus(state: State, menus: any[]) {
    state.menus = menus;
  },
  async setPlay(state: State, playMusic: SongResult) {
    await handlePlayMusic(state, playMusic);
    localStorage.setItem('currentPlayMusic', JSON.stringify(state.playMusic));
    localStorage.setItem('currentPlayMusicUrl', state.playMusicUrl);
  },
  setIsPlay(state: State, isPlay: boolean) {
    state.isPlay = isPlay;
    localStorage.setItem('isPlaying', isPlay.toString());
  },
  async setPlayMusic(state: State, play: boolean) {
    state.play = play;
    localStorage.setItem('isPlaying', play.toString());
  },
  setMusicFull(state: State, musicFull: boolean) {
    state.musicFull = musicFull;
  },
  setPlayList(state: State, playList: SongResult[]) {
    state.playListIndex = playList.findIndex((item) => item.id === state.playMusic.id);
    state.playList = playList;
    localStorage.setItem('playList', JSON.stringify(playList));
    localStorage.setItem('playListIndex', state.playListIndex.toString());
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
  },
  setShowArtistDrawer(state, show: boolean) {
    state.showArtistDrawer = show;
    if (!show) {
      state.currentArtistId = null;
    }
  },
  setCurrentArtistId(state, id: number) {
    state.currentArtistId = id;
  },
  setSystemFonts(state, fonts: string[]) {
    state.systemFonts = [
      { label: '系统默认', value: 'system-ui' },
      ...fonts.map((font) => ({
        label: font,
        value: font
      }))
    ];
  }
};

const actions = {
  initializeSettings({ commit }: { commit: any }) {
    if (isElectron) {
      const setData = window.electron.ipcRenderer.sendSync('get-store-value', 'set');
      commit('setSetData', {
        ...defaultSettings,
        ...setData
      });
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
  },
  showArtist({ commit }, id: number) {
    commit('setCurrentArtistId', id);
  },
  async initializeSystemFonts({ commit, state }) {
    // 如果已经有字体列表（不只是默认字体），则不重复获取
    if (state.systemFonts.length > 1) return;

    try {
      const fonts = await window.api.invoke('get-system-fonts');
      commit('setSystemFonts', fonts);
    } catch (error) {
      console.error('获取系统字体失败:', error);
    }
  },
  async initializePlayState({ state, commit }: { state: State; commit: any }) {
    const savedPlayList = getLocalStorageItem('playList', []);
    const savedPlayMusic = getLocalStorageItem('currentPlayMusic', null);

    if (savedPlayList.length > 0) {
      commit('setPlayList', savedPlayList);
    }

    if (savedPlayMusic && Object.keys(savedPlayMusic).length > 0) {
      // 不直接使用保存的 URL，而是重新获取
      try {
        // 使用 handlePlayMusic 来重新获取音乐 URL

        // 根据自动播放设置决定是否恢复播放状态
        const shouldAutoPlay = state.setData.autoPlay;
        if (shouldAutoPlay) {
          await handlePlayMusic(state, savedPlayMusic);
        }
        state.play = shouldAutoPlay;
        state.isPlay = true;
      } catch (error) {
        console.error('重新获取音乐链接失败:', error);
        // 清除无效的播放状态
        state.play = false;
        state.isPlay = false;
        state.playMusic = {} as SongResult;
        state.playMusicUrl = '';
        localStorage.removeItem('currentPlayMusic');
        localStorage.removeItem('currentPlayMusicUrl');
        localStorage.removeItem('isPlaying');
      }
    }
  }
};

const store = createStore({
  state,
  mutations,
  actions
});

export default store;
