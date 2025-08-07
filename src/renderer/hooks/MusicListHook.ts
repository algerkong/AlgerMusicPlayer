import { Howl } from 'howler';
import { cloneDeep } from 'lodash';
import { ref } from 'vue';

import { getMusicLrc, getMusicUrl, getParsingMusicUrl } from '@/api/music';
import { useMusicHistory } from '@/hooks/MusicHistoryHook';
import { audioService } from '@/services/audioService';
import { useSettingsStore } from '@/store';
import type { ILyric, ILyricText, SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';

const musicHistory = useMusicHistory();

// 获取歌曲url
export const getSongUrl = async (id: any, songData: any, isDownloaded: boolean = false) => {
  const settingsStore = useSettingsStore();
  const { unlimitedDownload } = settingsStore.setData;

  const { data } = await getMusicUrl(id, !unlimitedDownload);
  let url = '';
  let songDetail = null;

  try {
    if (data.data[0].freeTrialInfo || !data.data[0].url) {
      const res = await getParsingMusicUrl(id, cloneDeep(songData));
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

const getSongDetail = async (playMusic: SongResult) => {
  playMusic.playLoading = true;
  const playMusicUrl =
    playMusic.playMusicUrl || (await getSongUrl(playMusic.id, cloneDeep(playMusic)));
  const { backgroundColor, primaryColor } =
    playMusic.backgroundColor && playMusic.primaryColor
      ? playMusic
      : await getImageLinearBackground(getImgUrl(playMusic?.picUrl, '30y30'));

  playMusic.playLoading = false;
  return { ...playMusic, playMusicUrl, backgroundColor, primaryColor };
};

// 加载 当前歌曲 歌曲列表数据 下一首mp3预加载 歌词数据
export const useMusicListHook = () => {
  const handlePlayMusic = async (state: any, playMusic: SongResult, isPlay: boolean = true) => {
    const updatedPlayMusic = await getSongDetail(playMusic);
    state.playMusic = updatedPlayMusic;
    state.playMusicUrl = updatedPlayMusic.playMusicUrl;

    // 记录当前设置的播放状态
    state.play = isPlay;

    // 每次设置新歌曲时，立即更新 localStorage
    localStorage.setItem('currentPlayMusic', JSON.stringify(state.playMusic));
    localStorage.setItem('currentPlayMusicUrl', state.playMusicUrl);
    localStorage.setItem('isPlaying', state.play.toString());

    // 设置网页标题
    document.title = `${updatedPlayMusic.name} - ${updatedPlayMusic?.song?.artists?.reduce((prev, curr) => `${prev}${curr.name}/`, '')}`;
    loadLrcAsync(state, updatedPlayMusic.id);
    musicHistory.addMusic(state.playMusic);
    const playListIndex = state.playList.findIndex((item: SongResult) => item.id === playMusic.id);
    state.playListIndex = playListIndex;
    // 请求后续五首歌曲的详情
    fetchSongs(state, playListIndex + 1, playListIndex + 6);
  };

  const preloadingSounds = ref<Howl[]>([]);

  // 用于预加载下一首歌曲的 MP3 数据
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

  const fetchSongs = async (state: any, startIndex: number, endIndex: number) => {
    try {
      const songs = state.playList.slice(
        Math.max(0, startIndex),
        Math.min(endIndex, state.playList.length)
      );

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
        if (song && startIndex + index < state.playList.length) {
          state.playList[startIndex + index] = song;
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

  const nextPlay = async (state: any) => {
    if (state.playList.length === 0) {
      state.play = true;
      return;
    }

    let playListIndex: number;

    if (state.playMode === 2) {
      // 随机播放模式
      do {
        playListIndex = Math.floor(Math.random() * state.playList.length);
      } while (playListIndex === state.playListIndex && state.playList.length > 1);
    } else {
      // 列表循环模式
      playListIndex = (state.playListIndex + 1) % state.playList.length;
    }

    state.playListIndex = playListIndex;
    await handlePlayMusic(state, state.playList[playListIndex]);
  };

  const prevPlay = async (state: any) => {
    if (state.playList.length === 0) {
      state.play = true;
      return;
    }
    const playListIndex = (state.playListIndex - 1 + state.playList.length) % state.playList.length;
    await handlePlayMusic(state, state.playList[playListIndex]);
    await fetchSongs(state, playListIndex - 5, playListIndex);
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

  const loadLrc = async (playMusicId: number): Promise<ILyric> => {
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

  // 异步加载歌词的方法
  const loadLrcAsync = async (state: any, playMusicId: any) => {
    if (state.playMusic.lyric && state.playMusic.lyric.lrcTimeArray.length > 0) {
      return;
    }
    const lyrics = await loadLrc(playMusicId);
    state.playMusic.lyric = lyrics;
  };

  const play = () => {
    audioService.getCurrentSound()?.play();
  };

  const pause = () => {
    audioService.getCurrentSound()?.pause();
  };

  // 在组件卸载时清理预加载的音频
  onUnmounted(() => {
    preloadingSounds.value.forEach((sound) => sound.unload());
    preloadingSounds.value = [];
  });

  return {
    handlePlayMusic,
    nextPlay,
    prevPlay,
    play,
    pause
  };
};
