import { cloneDeep } from 'lodash';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { getBilibiliAudioUrl } from '@/api/bilibili';
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

// 提取公共函数：获取B站视频URL

export const getSongUrl = async (
  id: string | number,
  songData: SongResult,
  isDownloaded: boolean = false
) => {
  if (songData.playMusicUrl) {
    return songData.playMusicUrl;
  }

  if (songData.source === 'bilibili' && songData.bilibiliData) {
    console.log('加载B站音频URL');
    if (!songData.playMusicUrl && songData.bilibiliData.bvid && songData.bilibiliData.cid) {
      try {
        songData.playMusicUrl = await getBilibiliAudioUrl(
          songData.bilibiliData.bvid,
          songData.bilibiliData.cid
        );
        return songData.playMusicUrl;
      } catch (error) {
        console.error('重启后获取B站音频URL失败:', error);
        return '';
      }
    }
    return songData.playMusicUrl || '';
  }

  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const { data } = await getMusicUrl(numericId, isDownloaded);
  let url = '';
  let songDetail = null;
  try {
    if (data.data[0].freeTrialInfo || !data.data[0].url) {
      const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
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

export const loadLrc = async (id: string | number): Promise<ILyric> => {
  if (typeof id === 'string' && id.includes('--')) {
    console.log('B站音频，无需加载歌词');
    return {
      lrcTimeArray: [],
      lrcArray: []
    };
  }

  try {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const { data } = await getMusicLrc(numericId);
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

  if (playMusic.source === 'bilibili') {
    console.log('处理B站音频详情');
    const { backgroundColor, primaryColor } =
      playMusic.backgroundColor && playMusic.primaryColor
        ? playMusic
        : await getImageLinearBackground(getImgUrl(playMusic?.picUrl, '30y30'));

    playMusic.playLoading = false;
    return { ...playMusic, backgroundColor, primaryColor } as SongResult;
  }

  const playMusicUrl = playMusic.playMusicUrl || (await getSongUrl(playMusic.id, playMusic));
  const { backgroundColor, primaryColor } =
    playMusic.backgroundColor && playMusic.primaryColor
      ? playMusic
      : await getImageLinearBackground(getImgUrl(playMusic?.picUrl, '30y30'));

  playMusic.playLoading = false;
  return { ...playMusic, playMusicUrl, backgroundColor, primaryColor } as SongResult;
};

const preloadNextSong = (nextSongUrl: string) => {
  try {
    // 清理多余的预加载实例，确保最多只有2个预加载音频
    while (preloadingSounds.value.length >= 2) {
      const oldestSound = preloadingSounds.value.shift();
      if (oldestSound) {
        try {
          oldestSound.stop();
          oldestSound.unload();
        } catch (e) {
          console.error('清理预加载音频实例失败:', e);
        }
      }
    }

    // 检查这个URL是否已经在预加载列表中
    const existingPreload = preloadingSounds.value.find(
      (sound) => (sound as any)._src === nextSongUrl
    );
    if (existingPreload) {
      console.log('该音频已在预加载列表中，跳过:', nextSongUrl);
      return existingPreload;
    }

    const sound = new Howl({
      src: [nextSongUrl],
      html5: true,
      preload: true,
      autoplay: false
    });

    preloadingSounds.value.push(sound);

    sound.on('loaderror', () => {
      console.error('预加载音频失败:', nextSongUrl);
      const index = preloadingSounds.value.indexOf(sound);
      if (index > -1) {
        preloadingSounds.value.splice(index, 1);
      }
      try {
        sound.stop();
        sound.unload();
      } catch (e) {
        console.error('卸载预加载音频失败:', e);
      }
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
          if (!song.playMusicUrl || (song.source === 'netease' && !song.backgroundColor)) {
            return await getSongDetail(song);
          }
          return song;
        } catch (error) {
          console.error('获取歌曲详情失败:', error);
          return song;
        }
      })
    );

    const nextSong = detailedSongs[0];
    if (nextSong && !(nextSong.lyric && nextSong.lyric.lrcTimeArray.length > 0)) {
      try {
        nextSong.lyric = await loadLrc(nextSong.id);
      } catch (error) {
        console.error('加载歌词失败:', error);
      }
    }

    detailedSongs.forEach((song, index) => {
      if (song && startIndex + index < playList.length) {
        playList[startIndex + index] = song;
      }
    });

    if (nextSong && nextSong.playMusicUrl) {
      preloadNextSong(nextSong.playMusicUrl);
    }
  } catch (error) {
    console.error('获取歌曲列表失败:', error);
  }
};

const loadLrcAsync = async (playMusic: SongResult) => {
  if (playMusic.lyric && playMusic.lyric.lrcTimeArray.length > 0) {
    return;
  }
  const lyrics = await loadLrc(playMusic.id);
  playMusic.lyric = lyrics;
};

export const usePlayerStore = defineStore('player', () => {
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

  const currentSong = computed(() => playMusic.value);
  const isPlaying = computed(() => isPlay.value);
  const currentPlayList = computed(() => playList.value);
  const currentPlayListIndex = computed(() => playListIndex.value);

  const handlePlayMusic = async (music: SongResult, isPlay: boolean = true) => {
    // 处理B站视频，确保URL有效
    if (music.source === 'bilibili' && music.bilibiliData) {
      try {
        console.log('处理B站视频，检查URL有效性');
        // 清除之前的URL，强制重新获取
        music.playMusicUrl = undefined;

        // 重新获取B站视频URL
        if (music.bilibiliData.bvid && music.bilibiliData.cid) {
          music.playMusicUrl = await getBilibiliAudioUrl(
            music.bilibiliData.bvid,
            music.bilibiliData.cid
          );
          console.log('获取B站URL成功:', music.playMusicUrl);
        }
      } catch (error) {
        console.error('获取B站音频URL失败:', error);
        throw error; // 向上抛出错误，让调用者处理
      }
    }

    const updatedPlayMusic = await getSongDetail(music);
    playMusic.value = updatedPlayMusic;
    playMusicUrl.value = updatedPlayMusic.playMusicUrl as string;

    play.value = isPlay;

    localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
    localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);
    localStorage.setItem('isPlaying', play.value.toString());

    let title = updatedPlayMusic.name;

    if (updatedPlayMusic.source === 'netease' && updatedPlayMusic?.song?.artists) {
      title += ` - ${updatedPlayMusic.song.artists.reduce(
        (prev: string, curr: any) => `${prev}${curr.name}/`,
        ''
      )}`;
    } else if (updatedPlayMusic.source === 'bilibili' && updatedPlayMusic?.song?.ar?.[0]) {
      title += ` - ${updatedPlayMusic.song.ar[0].name}`;
    }

    document.title = title;

    loadLrcAsync(playMusic.value);

    musicHistory.addMusic(playMusic.value);

    playListIndex.value = playList.value.findIndex(
      (item: SongResult) => item.id === music.id && item.source === music.source
    );

    fetchSongs(playList.value, playListIndex.value + 1, playListIndex.value + 6);
  };

  const setPlay = async (song: SongResult) => {
    try {
      await handlePlayMusic(song);
      localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
      localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);
      return true;
    } catch (error) {
      console.error('设置播放失败:', error);
      return false;
    }
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
      do {
        nowPlayListIndex = Math.floor(Math.random() * playList.value.length);
      } while (nowPlayListIndex === playListIndex.value && playList.value.length > 1);
    } else {
      nowPlayListIndex = (playListIndex.value + 1) % playList.value.length;
    }

    playListIndex.value = nowPlayListIndex;

    // 获取下一首歌曲
    const nextSong = playList.value[playListIndex.value];

    // 如果是B站视频，确保重新获取URL
    if (nextSong.source === 'bilibili' && nextSong.bilibiliData) {
      // 清除之前的URL，确保重新获取
      nextSong.playMusicUrl = undefined;
      console.log('下一首是B站视频，已清除URL强制重新获取');
    }

    await handlePlayMusic(nextSong);
  };

  const prevPlay = async () => {
    if (playList.value.length === 0) {
      play.value = true;
      return;
    }
    const nowPlayListIndex =
      (playListIndex.value - 1 + playList.value.length) % playList.value.length;

    // 获取上一首歌曲
    const prevSong = playList.value[nowPlayListIndex];

    // 如果是B站视频，确保重新获取URL
    if (prevSong.source === 'bilibili' && prevSong.bilibiliData) {
      // 清除之前的URL，确保重新获取
      prevSong.playMusicUrl = undefined;
      console.log('上一首是B站视频，已清除URL强制重新获取');
    }

    await handlePlayMusic(prevSong);
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
        console.log('恢复上次播放的音乐:', savedPlayMusic.name);
        console.log('settingStore.setData', settingStore.setData);
        const isPlaying = settingStore.setData.autoPlay;

        // 如果是B站视频，确保播放URL能够在重启后正确恢复
        if (savedPlayMusic.source === 'bilibili' && savedPlayMusic.bilibiliData) {
          console.log('恢复B站视频播放', savedPlayMusic.bilibiliData);
          // 清除之前可能存在的播放URL，确保重新获取
          savedPlayMusic.playMusicUrl = undefined;
        }

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
    const localFavoriteList = localStorage.getItem('favoriteList');
    const localList: number[] = localFavoriteList ? JSON.parse(localFavoriteList) : [];

    if (userStore.user && userStore.user.userId) {
      try {
        const res = await getLikedList(userStore.user.userId);
        if (res.data?.ids) {
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

    localStorage.setItem('favoriteList', JSON.stringify(favoriteList.value));
  };

  return {
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

    currentSong,
    isPlaying,
    currentPlayList,
    currentPlayListIndex,

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
