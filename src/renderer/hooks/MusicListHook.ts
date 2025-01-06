import { Howl } from 'howler';

import { getMusicLrc, getMusicUrl, getParsingMusicUrl } from '@/api/music';
import { useMusicHistory } from '@/hooks/MusicHistoryHook';
import { audioService } from '@/services/audioService';
import type { ILyric, ILyricText, SongResult } from '@/type/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';
import { cloneDeep } from 'lodash';

const musicHistory = useMusicHistory();

// 获取歌曲url
export const getSongUrl = async (id: number, songData: any) => {
  const { data } = await getMusicUrl(id);
  let url = '';
  try {
    if (data.data[0].freeTrialInfo || !data.data[0].url) {
      const res = await getParsingMusicUrl(id, songData);
      url = res.data.data.url;
    }
  } catch (error) {
    console.error('error', error);
  }
  url = url || data.data[0].url;
  return url;
};

const getSongDetail = async (playMusic: SongResult) => {
  playMusic.playLoading = true;
  const playMusicUrl = await getSongUrl(playMusic.id, cloneDeep(playMusic));
  const { backgroundColor, primaryColor } =
    playMusic.backgroundColor && playMusic.primaryColor
      ? playMusic
      : await getImageLinearBackground(getImgUrl(playMusic?.picUrl, '30y30'));

  playMusic.playLoading = false;
  return { ...playMusic, playMusicUrl, backgroundColor, primaryColor };
};

// 加载 当前歌曲 歌曲列表数据 下一首mp3预加载 歌词数据
export const useMusicListHook = () => {
  const handlePlayMusic = async (state: any, playMusic: SongResult) => {
    const updatedPlayMusic = await getSongDetail(playMusic);
    state.playMusic = updatedPlayMusic;
    state.playMusicUrl = updatedPlayMusic.playMusicUrl;
    state.play = true;
    // 设置网页标题
    document.title = `${updatedPlayMusic.name} - ${updatedPlayMusic?.song?.artists?.reduce((prev, curr) => `${prev}${curr.name}/`, '')}`;
    loadLrcAsync(state, updatedPlayMusic.id);
    musicHistory.addMusic(state.playMusic);
    const playListIndex = state.playList.findIndex((item: SongResult) => item.id === playMusic.id);
    state.playListIndex = playListIndex;
    // 请求后续五首歌曲的详情
    fetchSongs(state, playListIndex + 1, playListIndex + 6);
  };

  // 用于预加载下一首歌曲的 MP3 数据
  const preloadNextSong = (nextSongUrl: string) => {
    const sound = new Howl({
      src: [nextSongUrl],
      html5: true,
      preload: true,
      autoplay: false
    });
    return sound;
  };

  const fetchSongs = async (state: any, startIndex: number, endIndex: number) => {
    const songs = state.playList.slice(
      Math.max(0, startIndex),
      Math.min(endIndex, state.playList.length)
    );

    const detailedSongs = await Promise.all(
      songs.map(async (song: SongResult) => {
        // 如果歌曲详情已经存在，就不重复请求
        if (!song.playMusicUrl) {
          return await getSongDetail(song);
        }
        return song;
      })
    );
    // 加载下一首的歌词
    const nextSong = detailedSongs[0];
    if (!(nextSong.lyric && nextSong.lyric.lrcTimeArray.length > 0)) {
      nextSong.lyric = await loadLrc(nextSong.id);
    }

    // 更新播放列表中的歌曲详情
    detailedSongs.forEach((song, index) => {
      state.playList[startIndex + index] = song;
    });
    preloadNextSong(nextSong.playMusicUrl);
  };

  const nextPlay = async (state: any) => {
    if (state.playList.length === 0) {
      state.play = true;
      return;
    }
    const playListIndex = (state.playListIndex + 1) % state.playList.length;
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

      if (data.tlyric.lyric) {
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
  const loadLrcAsync = async (state: any, playMusicId: number) => {
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

  return {
    handlePlayMusic,
    nextPlay,
    prevPlay,
    play,
    pause
  };
};
