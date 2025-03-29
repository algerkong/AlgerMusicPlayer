import { cloneDeep } from 'lodash';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { getLikedList, getMusicLrc, getMusicUrl, getParsingMusicUrl } from '@/api/music';
import { useMusicHistory } from '@/hooks/MusicHistoryHook';
import type { ILyric, ILyricText, SongResult } from '@/type/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';

import { useSettingsStore } from './settings';
import { useUserStore } from './user';

const musicHistory = useMusicHistory();

const preloadingSounds = ref<Howl[]>([]);

function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export const getSongUrl = async (id: number, songData: any, isDownloaded: boolean = false) => {
  const { data } = await getMusicUrl(id, isDownloaded);
  let url = '';
  let songDetail = null;
  try {
    if (data.data[0].freeTrialInfo || !data.data[0].url) {
      const res = await getParsingMusicUrl(id, songData);
      url = res.data.data.url;
      songDetail = res.data.data;
    } else {
      songDetail = data.data[0] as any;
    }
  } catch (error) {
    console.error('error', error);
  }
  if (isDownloaded) {
    return songDetail;
  }
  url = url || data.data[0].url;
  return url;
};
const parseTime = (timeString: string): number => {
  const [minutes, seconds] = timeString.split(':');
  return Number(minutes) * 60 + Number(seconds);
};

const parseLyricLine = (lyricLine: string): { time: number; text: string } => {
  const TIME_REGEX = /(\d{2}:\d{2}(\.\d*)?)/g;
  const LRC_REGEX = /(\[(\d{2}):(\d{2})(\.(\d*))?\])/g;
  const timeText = lyricLine.match(TIME_REGEX)?.[0] || '';
  const time = parseTime(timeText);
  const text = lyricLine.replace(LRC_REGEX, '').trim();
  return { time, text };
};

const parseLyrics = (lyricsString: string): { lyrics: ILyricText[]; times: number[] } => {
  const lines = lyricsString.split('\n');
  const lyrics: ILyricText[] = [];
  const times: number[] = [];
  lines.forEach((line) => {
    const { time, text } = parseLyricLine(line);
    times.push(time);
    lyrics.push({ text, trText: '' });
  });
  return { lyrics, times };
};

export const loadLrc = async (playMusicId: number): Promise<ILyric> => {
  try {
    const { data } = await getMusicLrc(playMusicId);
    const { lyrics, times } = parseLyrics(data.lrc.lyric);
    const tlyric: Record<string, string> = {};

    if (data.tlyric && data.tlyric.lyric) {
      const { lyrics: tLyrics, times: tTimes } = parseLyrics(data.tlyric.lyric);
      tLyrics.forEach((lyric, index) => {
        tlyric[tTimes[index].toString()] = lyric.text;
      });
    }

    lyrics.forEach((item, index) => {
      item.trText = item.text ? tlyric[times[index].toString()] || '' : '';
    });
    return {
      lrcTimeArray: times,
      lrcArray: lyrics
    };
  } catch (err) {
    console.error('Error loading lyrics:', err);
    return {
      lrcTimeArray: [],
      lrcArray: []
    };
  }
};

const getSongDetail = async (playMusic: SongResult) => {
  playMusic.playLoading = true;
  const playMusicUrl =
    playMusic.playMusicUrl || (await getSongUrl(playMusic.id, cloneDeep(playMusic)));
  const { backgroundColor, primaryColor } =
    playMusic.backgroundColor && playMusic.primaryColor
      ? playMusic
      : await getImageLinearBackground(getImgUrl(playMusic?.picUrl, '30y30'));

  playMusic.playLoading = false;
  return { ...playMusic, playMusicUrl, backgroundColor, primaryColor } as SongResult;
};

const preloadNextSong = (nextSongUrl: string) => {
  try {
    // 限制同时预加载的数量
    if (preloadingSounds.value.length >= 2) {
      const oldestSound = preloadingSounds.value.shift();
      if (oldestSound) {
        oldestSound.unload();
      }
    }

    const sound = new Howl({
      src: [nextSongUrl],
      html5: true,
      preload: true,
      autoplay: false
    });

    preloadingSounds.value.push(sound);

    // 添加加载错误处理
    sound.on('loaderror', () => {
      console.error('预加载音频失败:', nextSongUrl);
      const index = preloadingSounds.value.indexOf(sound);
      if (index > -1) {
        preloadingSounds.value.splice(index, 1);
      }
      sound.unload();
    });

    return sound;
  } catch (error) {
    console.error('预加载音频出错:', error);
    return null;
  }
};

const fetchSongs = async (playList: SongResult[], startIndex: number, endIndex: number) => {
  try {
    const songs = playList.slice(Math.max(0, startIndex), Math.min(endIndex, playList.length));

    const detailedSongs = await Promise.all(
      songs.map(async (song: SongResult) => {
        try {
          // 如果歌曲详情已经存在，就不重复请求
          if (!song.playMusicUrl) {
            return await getSongDetail(song);
          }
          return song;
        } catch (error) {
          console.error('获取歌曲详情失败:', error);
          return song;
        }
      })
    );

    // 加载下一首的歌词
    const nextSong = detailedSongs[0];
    if (nextSong && !(nextSong.lyric && nextSong.lyric.lrcTimeArray.length > 0)) {
      try {
        nextSong.lyric = await loadLrc(nextSong.id);
      } catch (error) {
        console.error('加载歌词失败:', error);
      }
    }

    // 更新播放列表中的歌曲详情
    detailedSongs.forEach((song, index) => {
      if (song && startIndex + index < playList.length) {
        playList[startIndex + index] = song;
      }
    });

    // 只预加载下一首歌曲
    if (nextSong && nextSong.playMusicUrl) {
      preloadNextSong(nextSong.playMusicUrl);
    }
  } catch (error) {
    console.error('获取歌曲列表失败:', error);
  }
};

// 异步加载歌词的方法
const loadLrcAsync = async (playMusic: SongResult) => {
  if (playMusic.lyric && playMusic.lyric.lrcTimeArray.length > 0) {
    return;
  }
  const lyrics = await loadLrc(playMusic.id);
  playMusic.lyric = lyrics;
};

export const usePlayerStore = defineStore('player', () => {
  // 状态
  const play = ref(false);
  const isPlay = ref(false);
  const playMusic = ref<SongResult>(getLocalStorageItem('currentPlayMusic', {} as SongResult));
  const playMusicUrl = ref(getLocalStorageItem('currentPlayMusicUrl', ''));
  const playList = ref<SongResult[]>(getLocalStorageItem('playList', []));
  const playListIndex = ref(getLocalStorageItem('playListIndex', 0));
  const playMode = ref(getLocalStorageItem('playMode', 0));
  const musicFull = ref(false);
  const favoriteList = ref<number[]>(getLocalStorageItem('favoriteList', []));
  const savedPlayProgress = ref<number | undefined>();

  // 计算属性
  const currentSong = computed(() => playMusic.value);
  const isPlaying = computed(() => isPlay.value);
  const currentPlayList = computed(() => playList.value);
  const currentPlayListIndex = computed(() => playListIndex.value);

  const handlePlayMusic = async (music: SongResult, isPlay: boolean = true) => {
    const updatedPlayMusic = await getSongDetail(music);
    playMusic.value = updatedPlayMusic;
    playMusicUrl.value = updatedPlayMusic.playMusicUrl as string;

    // 记录当前设置的播放状态
    play.value = isPlay;

    // 每次设置新歌曲时，立即更新 localStorage
    localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
    localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);
    localStorage.setItem('isPlaying', play.value.toString());

    // 设置网页标题
    document.title = `${updatedPlayMusic.name} - ${updatedPlayMusic?.song?.artists?.reduce((prev, curr) => `${prev}${curr.name}/`, '')}`;
    loadLrcAsync(playMusic.value);
    musicHistory.addMusic(playMusic.value);
    playListIndex.value = playList.value.findIndex((item: SongResult) => item.id === music.id);
    // 请求后续五首歌曲的详情
    fetchSongs(playList.value, playListIndex.value + 1, playListIndex.value + 6);
  };

  // 方法
  const setPlay = async (song: SongResult) => {
    await handlePlayMusic(song);
    localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
    localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);
  };

  const setIsPlay = (value: boolean) => {
    isPlay.value = value;
    localStorage.setItem('isPlaying', value.toString());
  };

  const setPlayMusic = async (value: boolean | SongResult) => {
    if (typeof value === 'boolean') {
      play.value = value;
      isPlay.value = value;
      localStorage.setItem('isPlaying', value.toString());
    } else {
      await handlePlayMusic(value);
      play.value = true;
      isPlay.value = true;
      localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
      localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);
    }
  };

  const setMusicFull = (value: boolean) => {
    musicFull.value = value;
  };

  const setPlayList = (list: SongResult[]) => {
    playListIndex.value = list.findIndex((item) => item.id === playMusic.value.id);
    playList.value = list;
    localStorage.setItem('playList', JSON.stringify(list));
    localStorage.setItem('playListIndex', playListIndex.value.toString());
  };

  const addToNextPlay = (song: SongResult) => {
    const list = [...playList.value];
    const currentIndex = playListIndex.value;

    const existingIndex = list.findIndex((item) => item.id === song.id);
    if (existingIndex !== -1) {
      list.splice(existingIndex, 1);
    }

    list.splice(currentIndex + 1, 0, song);
    setPlayList(list);
  };

  const nextPlay = async () => {
    if (playList.value.length === 0) {
      play.value = true;
      return;
    }

    let nowPlayListIndex: number;

    if (playMode.value === 2) {
      // 随机播放模式
      do {
        nowPlayListIndex = Math.floor(Math.random() * playList.value.length);
      } while (nowPlayListIndex === playListIndex.value && playList.value.length > 1);
    } else {
      // 列表循环模式
      nowPlayListIndex = (playListIndex.value + 1) % playList.value.length;
    }

    playListIndex.value = nowPlayListIndex;
    await handlePlayMusic(playList.value[playListIndex.value]);
  };

  const prevPlay = async () => {
    if (playList.value.length === 0) {
      play.value = true;
      return;
    }
    const nowPlayListIndex =
      (playListIndex.value - 1 + playList.value.length) % playList.value.length;
    await handlePlayMusic(playList.value[nowPlayListIndex]);
    await fetchSongs(playList.value, playListIndex.value - 5, nowPlayListIndex);
  };

  const togglePlayMode = () => {
    playMode.value = (playMode.value + 1) % 3;
    localStorage.setItem('playMode', JSON.stringify(playMode.value));
  };

  const addToFavorite = async (id: number) => {
    if (!favoriteList.value.includes(id)) {
      favoriteList.value.push(id);
      localStorage.setItem('favoriteList', JSON.stringify(favoriteList.value));
    }
  };

  const removeFromFavorite = async (id: number) => {
    favoriteList.value = favoriteList.value.filter((item) => item !== id);
    localStorage.setItem('favoriteList', JSON.stringify(favoriteList.value));
  };

  const removeFromPlayList = (id: number) => {
    const index = playList.value.findIndex((item) => item.id === id);
    if (index === -1) return;

    // 如果删除的是当前播放的歌曲，先切换到下一首
    if (id === playMusic.value.id) {
      nextPlay();
    }

    // 从播放列表中移除，使用不可变的方式
    const newPlayList = [...playList.value];
    newPlayList.splice(index, 1);
    setPlayList(newPlayList);
  };

  // 初始化播放状态
  const initializePlayState = async () => {
    const settingStore = useSettingsStore();
    const savedPlayList = getLocalStorageItem('playList', []);
    const savedPlayMusic = getLocalStorageItem<SongResult | null>('currentPlayMusic', null);
    const savedProgress = localStorage.getItem('playProgress');

    if (savedPlayList.length > 0) {
      setPlayList(savedPlayList);
    }

    if (savedPlayMusic && Object.keys(savedPlayMusic).length > 0) {
      try {
        console.log('settingStore.setData', settingStore.setData);
        const isPlaying = settingStore.setData.autoPlay;
        await handlePlayMusic({ ...savedPlayMusic, playMusicUrl: undefined }, isPlaying);

        if (savedProgress) {
          try {
            const progress = JSON.parse(savedProgress);
            if (progress && progress.songId === savedPlayMusic.id) {
              savedPlayProgress.value = progress.progress;
            } else {
              localStorage.removeItem('playProgress');
            }
          } catch (e) {
            console.error('解析保存的播放进度失败', e);
            localStorage.removeItem('playProgress');
          }
        }
      } catch (error) {
        console.error('重新获取音乐链接失败:', error);
        play.value = false;
        isPlay.value = false;
        playMusic.value = {} as SongResult;
        playMusicUrl.value = '';
        localStorage.removeItem('currentPlayMusic');
        localStorage.removeItem('currentPlayMusicUrl');
        localStorage.removeItem('isPlaying');
        localStorage.removeItem('playProgress');
      }
    }
  };

  const initializeFavoriteList = async () => {
    const userStore = useUserStore();
    // 先获取本地收藏列表
    const localFavoriteList = localStorage.getItem('favoriteList');
    const localList: number[] = localFavoriteList ? JSON.parse(localFavoriteList) : [];

    // 如果用户已登录，尝试获取服务器收藏列表并合并
    if (userStore.user && userStore.user.userId) {
      try {
        const res = await getLikedList(userStore.user.userId);
        if (res.data?.ids) {
          // 合并本地和服务器的收藏列表，去重
          const serverList = res.data.ids.reverse();
          const mergedList = Array.from(new Set([...localList, ...serverList]));
          favoriteList.value = mergedList;
        } else {
          favoriteList.value = localList;
        }
      } catch (error) {
        console.error('获取服务器收藏列表失败，使用本地数据:', error);
        favoriteList.value = localList;
      }
    } else {
      favoriteList.value = localList;
    }

    // 更新本地存储
    localStorage.setItem('favoriteList', JSON.stringify(favoriteList.value));
  };

  return {
    // 状态
    play,
    isPlay,
    playMusic,
    playMusicUrl,
    playList,
    playListIndex,
    playMode,
    musicFull,
    savedPlayProgress,
    favoriteList,

    // 计算属性
    currentSong,
    isPlaying,
    currentPlayList,
    currentPlayListIndex,

    // 方法
    setPlay,
    setIsPlay,
    nextPlay,
    prevPlay,
    setPlayMusic,
    setMusicFull,
    setPlayList,
    addToNextPlay,
    togglePlayMode,
    initializePlayState,
    initializeFavoriteList,
    addToFavorite,
    removeFromFavorite,
    removeFromPlayList
  };
});
