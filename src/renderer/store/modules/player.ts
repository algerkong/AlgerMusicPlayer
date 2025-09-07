import { useThrottleFn } from '@vueuse/core';
import { cloneDeep } from 'lodash';
import { createDiscreteApi } from 'naive-ui';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import i18n from '@/../i18n/renderer';
import { getBilibiliAudioUrl } from '@/api/bilibili';
import { getLikedList, getMusicLrc, getMusicUrl, getParsingMusicUrl, likeSong } from '@/api/music';
import { useMusicHistory } from '@/hooks/MusicHistoryHook';
import { audioService } from '@/services/audioService';
import type { ILyric, ILyricText, SongResult } from '@/types/music';
import { type Platform } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';

import { useSettingsStore } from './settings';
import { useUserStore } from './user';

const musicHistory = useMusicHistory();
const { message } = createDiscreteApi(['message']);

const preloadingSounds = ref<Howl[]>([]);

function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// 比较B站视频ID的辅助函数
export const isBilibiliIdMatch = (id1: string | number, id2: string | number): boolean => {
  const str1 = String(id1);
  const str2 = String(id2);

  // 如果两个ID都不包含--分隔符，直接比较
  if (!str1.includes('--') && !str2.includes('--')) {
    return str1 === str2;
  }

  // 处理B站视频ID
  if (str1.includes('--') || str2.includes('--')) {
    // 尝试从ID中提取bvid和cid
    const extractBvIdAndCid = (str: string) => {
      if (!str.includes('--')) return { bvid: '', cid: '' };
      const parts = str.split('--');
      if (parts.length >= 3) {
        // bvid--pid--cid格式
        return { bvid: parts[0], cid: parts[2] };
      } else if (parts.length === 2) {
        // 旧格式或其他格式
        return { bvid: '', cid: parts[1] };
      }
      return { bvid: '', cid: '' };
    };

    const { bvid: bvid1, cid: cid1 } = extractBvIdAndCid(str1);
    const { bvid: bvid2, cid: cid2 } = extractBvIdAndCid(str2);

    // 如果两个ID都有bvid，比较bvid和cid
    if (bvid1 && bvid2) {
      return bvid1 === bvid2 && cid1 === cid2;
    }

    // 其他情况，只比较cid部分
    if (cid1 && cid2) {
      return cid1 === cid2;
    }
  }

  // 默认情况，直接比较完整ID
  return str1 === str2;
};

// 提取公共函数：获取B站视频URL

export const getSongUrl = async (
    id: string | number,
    songData: SongResult,
    isDownloaded: boolean = false
) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const settingsStore = useSettingsStore();
  const { message } = createDiscreteApi(['message']); // 引入 message API 用于提示

  try {
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


    // ==================== 自定义API最优先 ====================
    // 检查用户是否在全局设置中启用了 'custom' 音源
    const globalSources = settingsStore.setData.enabledMusicSources || [];
    const useCustomApiGlobally = globalSources.includes('custom');

    // 检查歌曲是否有专属的 'custom' 音源设置
    const songId = String(id);
    const savedSourceStr = localStorage.getItem(`song_source_${songId}`);
    let useCustomApiForSong = false;
    if (savedSourceStr) {
      try {
        const songSources = JSON.parse(savedSourceStr);
        useCustomApiForSong = songSources.includes('custom');
      } catch (e) { /* ignore parsing error */ }
    }

    // 如果全局或歌曲专属设置中启用了自定义API，则最优先尝试
    if ( (useCustomApiGlobally || useCustomApiForSong) && settingsStore.setData.customApiPlugin) {
      console.log(`优先级 1: 尝试使用自定义API解析歌曲 ${id}...`);
      try {
        // 直接从 api 目录导入 parseFromCustomApi 函数
        const { parseFromCustomApi } = await import('@/api/parseFromCustomApi');
        const customResult = await parseFromCustomApi(numericId, cloneDeep(songData), settingsStore.setData.musicQuality || 'higher');

        if (customResult && customResult.data && customResult.data.data && customResult.data.data.url) {
          console.log('自定义API解析成功！');
          if (isDownloaded) return customResult.data.data as any;
          return customResult.data.data.url;
        } else {
          // 自定义API失败，给出提示，然后继续走默认流程
          console.log('自定义API解析失败，将使用默认降级流程...');
          message.warning('自定义API解析失败，正在尝试使用内置音源...'); // 给用户一个提示
        }
      } catch (error) {
        console.error('调用自定义API时发生错误:', error);
        message.error('自定义API请求出错，正在尝试使用内置音源...');
      }
    }
    // 如果自定义API失败或未启用，则执行【原有】的解析流程
    // 如果有自定义音源设置，直接使用getParsingMusicUrl获取URL
    if (savedSourceStr && songData.source !== 'bilibili') {
      try {
        console.log(`使用自定义音源解析歌曲 ID: ${songId}`);
        const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
        console.log('res', res);
        if (res && res.data && res.data.data && res.data.data.url) {
          return res.data.data.url;
        }
        // 如果自定义音源解析失败，继续使用正常的获取流程
        console.warn('自定义音源解析失败，使用默认音源');
      } catch (error) {
        console.error('error', error);
        console.error('自定义音源解析出错:', error);
      }
    }

    // 正常获取URL流程
    const { data } = await getMusicUrl(numericId, isDownloaded);
    if (data && data.data && data.data[0]) {
      const songDetail = data.data[0];
      const hasNoUrl = !songDetail.url;
      const isTrial = !!songDetail.freeTrialInfo;

      if (hasNoUrl || isTrial) {
        console.log(`官方URL无效 (无URL: ${hasNoUrl}, 试听: ${isTrial})，进入内置备用解析...`);
        const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
        if (isDownloaded) return res?.data?.data as any;
        return res?.data?.data?.url || null;
      }

      console.log('官方API解析成功！');
      if (isDownloaded) return songDetail as any;
      return songDetail.url;
    }

    console.log('官方API返回数据结构异常，进入内置备用解析...');
    const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
    if (isDownloaded) return res?.data?.data as any;
    return res?.data?.data?.url || null;

  } catch (error) {
    console.error('官方API请求失败，进入内置备用解析流程:', error);
    const res = await getParsingMusicUrl(numericId, cloneDeep(songData));
    if (isDownloaded) return res?.data?.data as any;
    return res?.data?.data?.url || null;
  }
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
  // playMusic.playLoading 在 handlePlayMusic 中已设置，这里不再设置

  if (playMusic.source === 'bilibili') {
    console.log('处理B站音频详情');
    try {
      // 如果需要获取URL
      if (!playMusic.playMusicUrl && playMusic.bilibiliData) {
        playMusic.playMusicUrl = await getBilibiliAudioUrl(
          playMusic.bilibiliData.bvid,
          playMusic.bilibiliData.cid
        );
      }

      playMusic.playLoading = false;
      return { ...playMusic } as SongResult;
    } catch (error) {
      console.error('获取B站音频详情失败:', error);
      playMusic.playLoading = false;
      throw error;
    }
  }

  if (playMusic.expiredAt && playMusic.expiredAt < Date.now()) {
    console.info(`歌曲已过期，重新获取: ${playMusic.name}`);
    playMusic.playMusicUrl = undefined;
  }

  try {
    const playMusicUrl = playMusic.playMusicUrl || (await getSongUrl(playMusic.id, playMusic));
    playMusic.createdAt = Date.now();
    // 半小时后过期
    playMusic.expiredAt = playMusic.createdAt + 1800000;
    const { backgroundColor, primaryColor } =
      playMusic.backgroundColor && playMusic.primaryColor
        ? playMusic
        : await getImageLinearBackground(getImgUrl(playMusic?.picUrl, '30y30'));

    playMusic.playLoading = false;
    return { ...playMusic, playMusicUrl, backgroundColor, primaryColor } as SongResult;
  } catch (error) {
    console.error('获取音频URL失败:', error);
    playMusic.playLoading = false;
    throw error;
  }
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

// 定时关闭类型
export enum SleepTimerType {
  NONE = 'none', // 没有定时
  TIME = 'time', // 按时间定时
  SONGS = 'songs', // 按歌曲数定时
  PLAYLIST_END = 'end' // 播放列表播放完毕定时
}

// 定时关闭信息
export interface SleepTimerInfo {
  type: SleepTimerType;
  value: number; // 对于TIME类型，值以分钟为单位；对于SONGS类型，值为歌曲数量
  endTime?: number; // 何时结束（仅TIME类型）
  startSongIndex?: number; // 开始时的歌曲索引（对于SONGS类型）
  remainingSongs?: number; // 剩余歌曲数（对于SONGS类型）
}

export const usePlayerStore = defineStore('player', () => {
  const play = ref(false);
  const isPlay = ref(false);
  const playMusic = ref<SongResult>(getLocalStorageItem('currentPlayMusic', {} as SongResult));
  const playMusicUrl = ref(getLocalStorageItem('currentPlayMusicUrl', ''));
  const playList = ref<SongResult[]>(getLocalStorageItem('playList', []));
  const playListIndex = ref(getLocalStorageItem('playListIndex', 0));
  const playMode = ref(getLocalStorageItem('playMode', 0));
  const musicFull = ref(false);
  const favoriteList = ref<Array<number | string>>(getLocalStorageItem('favoriteList', []));
  const dislikeList = ref<Array<number | string>>(getLocalStorageItem('dislikeList', []));
  const showSleepTimer = ref(false); // 定时弹窗
  // 添加播放列表抽屉状态
  const playListDrawerVisible = ref(false);

  // 定时关闭相关状态
  const sleepTimer = ref<SleepTimerInfo>(
    getLocalStorageItem('sleepTimer', {
      type: SleepTimerType.NONE,
      value: 0
    })
  );

  // 播放速度状态
  const playbackRate = ref(parseFloat(getLocalStorageItem('playbackRate', '1.0')));

  // 音量状态管理
  const volume = ref(parseFloat(getLocalStorageItem('volume', '1')));

  // 原始播放列表 - 保存切换到随机模式前的顺序
  const originalPlayList = ref<SongResult[]>(getLocalStorageItem('originalPlayList', []));

  // 通用洗牌函数 - Fisher-Yates 算法
  const performShuffle = (list: SongResult[], currentSong?: SongResult): SongResult[] => {
    if (list.length <= 1) return [...list];
    
    const result: SongResult[] = [];
    const remainingSongs = [...list];
    
    // 如果指定了当前歌曲，先把它放在第一位
    if (currentSong && currentSong.id) {
      const currentSongIndex = remainingSongs.findIndex(song => song.id === currentSong.id);
      if (currentSongIndex !== -1) {
        // 把当前歌曲放在第一位
        result.push(remainingSongs.splice(currentSongIndex, 1)[0]);
      }
    }
    
    // 对剩余歌曲进行洗牌
    if (remainingSongs.length > 0) {
      // Fisher-Yates 洗牌算法
      for (let i = remainingSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
      }
      
      // 把洗牌后的歌曲添加到结果中
      result.push(...remainingSongs);
    }
    
    return result;
  };

  // 应用随机播放到当前播放列表
  const shufflePlayList = () => {
    if (playList.value.length <= 1) return;
    
    // 保存原始播放列表（如果还没保存）
    if (originalPlayList.value.length === 0) {
      originalPlayList.value = [...playList.value];
      localStorage.setItem('originalPlayList', JSON.stringify(originalPlayList.value));
    }
    
    const currentSong = playList.value[playListIndex.value];
    const shuffledList = performShuffle(playList.value, currentSong);
    
    // 更新播放列表和索引
    playList.value = shuffledList;
    playListIndex.value = 0;
    localStorage.setItem('playList', JSON.stringify(shuffledList));
    localStorage.setItem('playListIndex', '0');
  };

  // 恢复原始播放列表顺序
  const restoreOriginalOrder = () => {
    if (originalPlayList.value.length === 0) return;
    
    const currentSong = playMusic.value;
    const originalIndex = originalPlayList.value.findIndex(song => song.id === currentSong.id);
    
    playList.value = [...originalPlayList.value];
    playListIndex.value = Math.max(0, originalIndex);
    
    localStorage.setItem('playList', JSON.stringify(playList.value));
    localStorage.setItem('playListIndex', playListIndex.value.toString());
    
    // 清空原始播放列表
    originalPlayList.value = [];
    localStorage.removeItem('originalPlayList');
  };

  // 智能预加载下一首歌曲
  const preloadNextSongs = (currentIndex: number) => {
    if (playList.value.length <= 1) return;
    
    // 计算下一首歌曲的索引
    let nextIndex: number;
    
    if (playMode.value === 0) {
      // 顺序播放模式：下一首，如果是最后一首则不预加载
      if (currentIndex >= playList.value.length - 1) {
        return; // 顺序播放模式下最后一首不预加载
      }
      nextIndex = currentIndex + 1;
    } else {
      // 循环播放模式和随机播放模式：都是循环的
      nextIndex = (currentIndex + 1) % playList.value.length;
    }
    
    // 预加载下一首和下下首
    const endIndex = Math.min(nextIndex + 2, playList.value.length);
    
    // 如果需要循环到开头，分两次预加载
    if (nextIndex < playList.value.length) {
      fetchSongs(playList.value, nextIndex, endIndex);
      
      // 如果是循环模式且接近列表末尾，也预加载列表开头的歌曲
      if ((playMode.value === 1 || playMode.value === 2) && 
          nextIndex + 1 >= playList.value.length && 
          playList.value.length > 2) {
        // 预加载列表开头的第一首
        setTimeout(() => {
          fetchSongs(playList.value, 0, 1);
        }, 1000);
      }
    }
  };

  // 清空播放列表
  const clearPlayAll = async () => {
    audioService.pause();
    setTimeout(() => {
      playMusic.value = {} as SongResult;
      playMusicUrl.value = '';
      playList.value = [];
      playListIndex.value = 0;
      originalPlayList.value = [];
      localStorage.removeItem('currentPlayMusic');
      localStorage.removeItem('currentPlayMusicUrl');
      localStorage.removeItem('playList');
      localStorage.removeItem('playListIndex');
      localStorage.removeItem('originalPlayList');
    }, 500);
  };

  const timerInterval = ref<number | null>(null);

  // 当前定时关闭状态
  const currentSleepTimer = computed(() => sleepTimer.value);

  // 判断是否有活跃的定时关闭
  const hasSleepTimerActive = computed(() => sleepTimer.value.type !== SleepTimerType.NONE);

  // 获取剩余时间（用于UI显示）
  const sleepTimerRemainingTime = computed(() => {
    if (sleepTimer.value.type === SleepTimerType.TIME && sleepTimer.value.endTime) {
      const remaining = Math.max(0, sleepTimer.value.endTime - Date.now());
      return Math.ceil(remaining / 60000); // 转换为分钟并向上取整
    }
    return 0;
  });

  // 获取剩余歌曲数（用于UI显示）
  const sleepTimerRemainingSongs = computed(() => {
    if (sleepTimer.value.type === SleepTimerType.SONGS) {
      return sleepTimer.value.remainingSongs || 0;
    }
    return 0;
  });

  const currentSong = computed(() => playMusic.value);
  const isPlaying = computed(() => isPlay.value);
  const currentPlayList = computed(() => playList.value);
  const currentPlayListIndex = computed(() => playListIndex.value);

  const handlePlayMusic = async (music: SongResult, isPlay: boolean = true) => {
    const currentSound = audioService.getCurrentSound();
    if (currentSound) {
      console.log('主动停止并卸载当前音频实例');
      currentSound.stop();
      currentSound.unload();
    }
    // 先切换歌曲数据，更新播放状态
    // 加载歌词
    await loadLrcAsync(music);
    const originalMusic = { ...music };
    // 获取背景色
    const { backgroundColor, primaryColor } =
      music.backgroundColor && music.primaryColor
        ? music
        : await getImageLinearBackground(getImgUrl(music?.picUrl, '30y30'));
    music.backgroundColor = backgroundColor;
    music.primaryColor = primaryColor;
    music.playLoading = true; // 设置加载状态
    playMusic.value = music;

    // 更新播放相关状态
    play.value = isPlay;

    // 更新标题
    let title = music.name;
    if (music.source === 'netease' && music?.song?.artists) {
      title += ` - ${music.song.artists.reduce(
        (prev: string, curr: any) => `${prev}${curr.name}/`,
        ''
      )}`;
    } else if (music.source === 'bilibili' && music?.song?.ar?.[0]) {
      title += ` - ${music.song.ar[0].name}`;
    }
    document.title = 'AlgerMusic - ' + title;

    try {
      // 添加到历史记录
      musicHistory.addMusic(music);

      // 查找歌曲在播放列表中的索引
      const songIndex = playList.value.findIndex(
        (item: SongResult) => item.id === music.id && item.source === music.source
      );

      // 只有在 songIndex 有效，并且与当前 playListIndex 不同时才更新
      if (songIndex !== -1 && songIndex !== playListIndex.value) {
        console.log('歌曲索引不匹配，更新为:', songIndex);
        playListIndex.value = songIndex;
      }

      // 获取歌曲详情，包括URL
      const updatedPlayMusic = await getSongDetail(originalMusic);
      playMusic.value = updatedPlayMusic;
      playMusicUrl.value = updatedPlayMusic.playMusicUrl as string;
      music.playMusicUrl = updatedPlayMusic.playMusicUrl as string;

      // 保存到本地存储
      localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
      localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);
      localStorage.setItem('isPlaying', play.value.toString());

      // 预加载下一首歌曲
      if (songIndex !== -1) {
        setTimeout(() => {
          // 使用最新的 playListIndex 而不是 songIndex，确保预加载索引正确
          preloadNextSongs(playListIndex.value);
        }, 3000);
      } else {
        console.warn('当前歌曲未在播放列表中找到');
      }

      // 使用标记防止循环调用
      let playInProgress = false;

      // 直接调用 playAudio 方法播放音频
      try {
        if (playInProgress) {
          console.warn('播放操作正在进行中，避免重复调用');
          return true;
        }

        playInProgress = true;
        const result = await playAudio();

        playInProgress = false;
        return !!result;
      } catch (error) {
        console.error('自动播放音频失败:', error);
        playInProgress = false;
        return false;
      }
    } catch (error) {
      console.error('处理播放音乐失败:', error);
      message.error(i18n.global.t('player.playFailed'));
      // 出现错误时，更新加载状态
      if (playMusic.value) {
        playMusic.value.playLoading = false;
      }
      return false;
    }
  };

  // 添加用户意图跟踪变量
  const userPlayIntent = ref(true);

  let checkPlayTime: NodeJS.Timeout | null = null;

  // 添加独立的播放状态检测函数
  const checkPlaybackState = (song: SongResult, timeout: number = 4000) => {
    if (checkPlayTime) {
      clearTimeout(checkPlayTime);
    }
    const sound = audioService.getCurrentSound();
    if (!sound) return;

    // 使用audioService的事件系统监听播放状态
    // 添加一次性播放事件监听器
    const onPlayHandler = () => {
      // 播放事件触发，表示成功播放
      console.log('播放事件触发，歌曲成功开始播放');
      audioService.off('play', onPlayHandler);
      audioService.off('playerror', onPlayErrorHandler);
    };

    // 添加一次性播放错误事件监听器
    const onPlayErrorHandler = async () => {
      console.log('播放错误事件触发，尝试重新获取URL');
      audioService.off('play', onPlayHandler);
      audioService.off('playerror', onPlayErrorHandler);

      // 只有用户仍然希望播放时才重试
      if (userPlayIntent.value && play.value) {
        // 重置URL并重新播放
        playMusic.value.playMusicUrl = undefined;
        // 保持播放状态，但强制重新获取URL
        const refreshedSong = { ...song, isFirstPlay: true };
        await handlePlayMusic(refreshedSong, true);
      }
    };

    // 注册事件监听器
    audioService.on('play', onPlayHandler);
    audioService.on('playerror', onPlayErrorHandler);

    // 额外的安全检查：如果指定时间后仍未播放也未触发错误，且用户仍希望播放
    checkPlayTime = setTimeout(() => {
      // 使用更准确的方法检查是否真正在播放
      if (!audioService.isActuallyPlaying() && userPlayIntent.value && play.value) {
        console.log(`${timeout}ms后歌曲未真正播放且用户仍希望播放，尝试重新获取URL`);
        // 移除事件监听器
        audioService.off('play', onPlayHandler);
        audioService.off('playerror', onPlayErrorHandler);

        // 重置URL并重新播放
        playMusic.value.playMusicUrl = undefined;
        // 保持播放状态，强制重新获取URL
        (async () => {
          const refreshedSong = { ...song, isFirstPlay: true };
          await handlePlayMusic(refreshedSong, true);
        })();
      }
    }, timeout);
  };

  const setPlay = async (song: SongResult) => {
    try {
      // 检查URL是否已过期
      if (song.expiredAt && song.expiredAt < Date.now()) {
        console.info(`歌曲URL已过期，重新获取: ${song.name}`);
        song.playMusicUrl = undefined;
        // 重置过期时间，以便重新获取
        song.expiredAt = undefined;
      }

      // 如果是当前正在播放的音乐，则切换播放/暂停状态
      if (
        playMusic.value.id === song.id &&
        playMusic.value.playMusicUrl === song.playMusicUrl &&
        !song.isFirstPlay
      ) {
        if (play.value) {
          setPlayMusic(false);
          audioService.getCurrentSound()?.pause();
          // 设置用户意图为暂停
          userPlayIntent.value = false;
        } else {
          setPlayMusic(true);
          // 设置用户意图为播放
          userPlayIntent.value = true;
          const sound = audioService.getCurrentSound();
          if (sound) {
            sound.play();
            // 使用独立的播放状态检测函数
            checkPlaybackState(playMusic.value);
          }
        }
        return;
      }

      if (song.isFirstPlay) {
        song.isFirstPlay = false;
      }
      // 直接调用 handlePlayMusic，它会处理索引更新和播放逻辑
      const success = await handlePlayMusic(song);

      // 记录到本地存储，保持一致性
      localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
      localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);
      if (success) {
        isPlay.value = true;
      }
      return success;
    } catch (error) {
      console.error('设置播放失败:', error);
      return false;
    }
  };

  const setIsPlay = (value: boolean) => {
    isPlay.value = value;
    play.value = value;
    localStorage.setItem('isPlaying', value.toString());
    // 通知主进程播放状态变化
    window.electron?.ipcRenderer.send('update-play-state', value);
  };

  const setPlayMusic = async (value: boolean | SongResult) => {
    if (typeof value === 'boolean') {
      setIsPlay(value);
      // 记录用户的播放意图
      userPlayIntent.value = value;
    } else {
      await handlePlayMusic(value);
      play.value = true;
      isPlay.value = true;
      // 设置为播放意图
      userPlayIntent.value = true;
      localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
      localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);
    }
  };

  const setMusicFull = (value: boolean) => {
    musicFull.value = value;
  };

  const setPlayList = (list: SongResult[], keepIndex: boolean = false) => {
    if (list.length === 0) {
      playList.value = [];
      playListIndex.value = 0;
      originalPlayList.value = [];
      localStorage.setItem('playList', JSON.stringify([]));
      localStorage.setItem('playListIndex', '0');
      localStorage.removeItem('originalPlayList');
      return;
    }

    // 根据当前播放模式处理新的播放列表
    if (playMode.value === 2) {
      // 随机模式：保存原始顺序并洗牌
      console.log('随机模式下设置新播放列表，保存原始顺序并洗牌');
      
      // 保存原始播放列表
      originalPlayList.value = [...list];
      localStorage.setItem('originalPlayList', JSON.stringify(originalPlayList.value));
      
      // 洗牌新列表，优先保持当前歌曲在第一位
      const currentSong = playMusic.value;
      const shuffledList = performShuffle(list, currentSong);
      
      // 计算新的播放索引
      if (currentSong && currentSong.id) {
        const currentSongIndex = shuffledList.findIndex(song => song.id === currentSong.id);
        playListIndex.value = currentSongIndex !== -1 ? 0 : (keepIndex ? playListIndex.value : 0);
      } else {
        playListIndex.value = keepIndex ? playListIndex.value : 0;
      }
      
      playList.value = shuffledList;
    } else {
      // 顺序模式和循环模式：直接设置播放列表
      console.log('顺序/循环模式下设置新播放列表');
      
      // 清除原始播放列表状态（如果有的话）
      if (originalPlayList.value.length > 0) {
        originalPlayList.value = [];
        localStorage.removeItem('originalPlayList');
      }
      
      // 计算播放索引
      if (!keepIndex) {
        playListIndex.value = list.findIndex((item) => item.id === playMusic.value.id);
      }
      
      playList.value = list;
    }
    
    // 保存到 localStorage
    localStorage.setItem('playList', JSON.stringify(playList.value));
    localStorage.setItem('playListIndex', playListIndex.value.toString());
  };

  const addToNextPlay = (song: SongResult) => {
    const list = [...playList.value];
    const currentIndex = playListIndex.value;

    // 如果歌曲已在播放列表中，先移除它
    const existingIndex = list.findIndex((item) => item.id === song.id);
    if (existingIndex !== -1) {
      list.splice(existingIndex, 1);
      // 如果移除的歌曲在当前歌曲之前，需要调整当前索引
      if (existingIndex <= currentIndex) {
        playListIndex.value = Math.max(0, playListIndex.value - 1);
      }
    }

    // 插入到当前播放歌曲的下一个位置
    const insertIndex = playListIndex.value + 1;
    list.splice(insertIndex, 0, song);
    
    // 更新播放列表
    setPlayList(list, true); // 保持当前索引不变
  };

  // 睡眠定时器功能
  const setSleepTimerByTime = (minutes: number) => {
    // 清除现有定时器
    clearSleepTimer();

    if (minutes <= 0) {
      return;
    }

    const endTime = Date.now() + minutes * 60 * 1000;

    sleepTimer.value = {
      type: SleepTimerType.TIME,
      value: minutes,
      endTime
    };

    // 保存到本地存储
    localStorage.setItem('sleepTimer', JSON.stringify(sleepTimer.value));

    // 设置定时器检查
    timerInterval.value = window.setInterval(() => {
      checkSleepTimer();
    }, 1000) as unknown as number; // 每秒检查一次

    console.log(`设置定时关闭: ${minutes}分钟后`);
    return true;
  };

  // 睡眠定时器功能
  const setSleepTimerBySongs = (songs: number) => {
    // 清除现有定时器
    clearSleepTimer();

    if (songs <= 0) {
      return;
    }

    sleepTimer.value = {
      type: SleepTimerType.SONGS,
      value: songs,
      startSongIndex: playListIndex.value,
      remainingSongs: songs
    };

    // 保存到本地存储
    localStorage.setItem('sleepTimer', JSON.stringify(sleepTimer.value));

    console.log(`设置定时关闭: 再播放${songs}首歌后`);
    return true;
  };

  // 睡眠定时器功能
  const setSleepTimerAtPlaylistEnd = () => {
    // 清除现有定时器
    clearSleepTimer();

    sleepTimer.value = {
      type: SleepTimerType.PLAYLIST_END,
      value: 0
    };

    // 保存到本地存储
    localStorage.setItem('sleepTimer', JSON.stringify(sleepTimer.value));

    console.log('设置定时关闭: 播放列表结束时');
    return true;
  };

  // 取消定时关闭
  const clearSleepTimer = () => {
    if (timerInterval.value) {
      window.clearInterval(timerInterval.value);
      timerInterval.value = null;
    }

    sleepTimer.value = {
      type: SleepTimerType.NONE,
      value: 0
    };

    // 保存到本地存储
    localStorage.setItem('sleepTimer', JSON.stringify(sleepTimer.value));

    console.log('取消定时关闭');
    return true;
  };

  // 检查定时关闭是否应该触发
  const checkSleepTimer = () => {
    if (sleepTimer.value.type === SleepTimerType.NONE) {
      return;
    }

    if (sleepTimer.value.type === SleepTimerType.TIME && sleepTimer.value.endTime) {
      if (Date.now() >= sleepTimer.value.endTime) {
        // 时间到，停止播放
        stopPlayback();
      }
    } else if (sleepTimer.value.type === SleepTimerType.PLAYLIST_END) {
      // 播放列表结束定时由nextPlay方法处理
    }
  };

  // 停止播放并清除定时器
  const stopPlayback = () => {
    console.log('定时器触发：停止播放');

    if (isPlaying.value) {
      setIsPlay(false);
      audioService.pause();
    }

    // 如果使用Electron，发送通知
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('show-notification', {
        title: i18n.global.t('player.sleepTimer.timerEnded'),
        body: i18n.global.t('player.sleepTimer.playbackStopped')
      });
    }

    // 清除定时器
    clearSleepTimer();
  };

  // 监听歌曲变化，处理按歌曲数定时和播放列表结束定时
  const handleSongChange = () => {
    console.log('歌曲已切换，检查定时器状态:', sleepTimer.value);

    // 处理按歌曲数定时
    if (
      sleepTimer.value.type === SleepTimerType.SONGS &&
      sleepTimer.value.remainingSongs !== undefined
    ) {
      sleepTimer.value.remainingSongs--;
      console.log(`剩余歌曲数: ${sleepTimer.value.remainingSongs}`);

      // 保存到本地存储
      localStorage.setItem('sleepTimer', JSON.stringify(sleepTimer.value));

      if (sleepTimer.value.remainingSongs <= 0) {
        // 歌曲数到达，停止播放
        console.log('已播放完设定的歌曲数，停止播放');
        stopPlayback();
        setTimeout(() => {
          stopPlayback();
        }, 1000);
      }
    }

    // 处理播放列表结束定时
    if (sleepTimer.value.type === SleepTimerType.PLAYLIST_END) {
      // 检查是否到达播放列表末尾
      const isLastSong = playListIndex.value === playList.value.length - 1;

      // 如果是列表最后一首歌且不是循环模式，则设置为在这首歌结束后停止
      if (isLastSong && playMode.value !== 1) {
        // 1 是循环模式
        console.log('已到达播放列表末尾，将在当前歌曲结束后停止播放');
        // 转换为按歌曲数定时，剩余1首
        sleepTimer.value = {
          type: SleepTimerType.SONGS,
          value: 1,
          remainingSongs: 1
        };
        // 保存到本地存储
        localStorage.setItem('sleepTimer', JSON.stringify(sleepTimer.value));
      }
    }
  };

  const _nextPlay = async () => {
    try {
      if (playList.value.length === 0) {
        play.value = true;
        return;
      }

      // 检查是否是播放列表的最后一首且设置了播放列表结束定时
      if (
        playMode.value === 0 &&
        playListIndex.value === playList.value.length - 1 &&
        sleepTimer.value.type === SleepTimerType.PLAYLIST_END
      ) {
        // 已是最后一首且为顺序播放模式，触发停止
        stopPlayback();
        return;
      }

      // 保存当前索引，用于错误恢复
      const currentIndex = playListIndex.value;
      
      // 计算下一首歌曲的索引（所有播放模式都使用顺序播放，因为随机模式下列表已经是随机的）
      const nowPlayListIndex = (playListIndex.value + 1) % playList.value.length;
      
      // 获取下一首歌曲
      const nextSong = { ...playList.value[nowPlayListIndex] };
      
      // 更新当前播放索引
      playListIndex.value = nowPlayListIndex;

      // 尝试播放
      const success = await handlePlayMusic(nextSong, true);

      if (success) {
        handleSongChange();
      } else {
        console.error('播放下一首失败');
        playListIndex.value = currentIndex;
        setIsPlay(false);
        message.error(i18n.global.t('player.playFailed'));
      }
    } catch (error) {
      console.error('切换下一首出错:', error);
    }
  };

  // 节流
  const nextPlay = useThrottleFn(_nextPlay, 500);

  const _prevPlay = async () => {
    try {
      if (playList.value.length === 0) {
        play.value = true;
        return;
      }

      // 保存当前索引，用于错误恢复
      const currentIndex = playListIndex.value;
      const nowPlayListIndex =
        (playListIndex.value - 1 + playList.value.length) % playList.value.length;

      // 获取上一首歌曲
      const prevSong = { ...playList.value[nowPlayListIndex] };

      // 重要：首先更新当前播放索引
      playListIndex.value = nowPlayListIndex;

      // 尝试播放
      let success = false;
      let retryCount = 0;
      const maxRetries = 2;

      // 尝试播放，最多尝试maxRetries次
      while (!success && retryCount < maxRetries) {
        success = await handlePlayMusic(prevSong);

        if (!success) {
          retryCount++;
          console.error(`播放上一首失败，尝试 ${retryCount}/${maxRetries}`);

          // 最后一次尝试失败
          if (retryCount >= maxRetries) {
            console.error('多次尝试播放失败，将从播放列表中移除此歌曲');
            // 从播放列表中移除失败的歌曲
            const newPlayList = [...playList.value];
            newPlayList.splice(nowPlayListIndex, 1);

            if (newPlayList.length > 0) {
              // 更新播放列表，但保持当前索引不变
              const keepCurrentIndexPosition = true;
              setPlayList(newPlayList, keepCurrentIndexPosition);

              // 恢复到原始索引或继续尝试上一首
              if (newPlayList.length === 1) {
                // 只剩一首歌，直接播放它
                playListIndex.value = 0;
              } else {
                // 尝试上上一首
                const newPrevIndex =
                  (playListIndex.value - 1 + newPlayList.length) % newPlayList.length;
                playListIndex.value = newPrevIndex;
              }

              // 延迟一点时间再尝试，避免可能的无限循环
              setTimeout(() => {
                prevPlay(); // 递归调用，尝试再上一首
              }, 300);
              return;
            } else {
              // 播放列表为空，停止尝试
              console.error('播放列表为空，停止尝试');
              break;
            }
          }
        }
      }

      if (!success) {
        console.error('所有尝试都失败，无法播放上一首歌曲');
        // 如果尝试了所有可能的歌曲仍然失败，恢复到原始索引
        playListIndex.value = currentIndex;
        setIsPlay(false); // 停止播放
        message.error(i18n.global.t('player.playFailed'));
      }
    } catch (error) {
      console.error('切换上一首出错:', error);
    }
  };

  // 节流
  const prevPlay = useThrottleFn(_prevPlay, 500);

  const togglePlayMode = () => {
    const newMode = (playMode.value + 1) % 3;
    const wasRandom = playMode.value === 2;
    const isRandom = newMode === 2;
    
    playMode.value = newMode;
    localStorage.setItem('playMode', JSON.stringify(playMode.value));
    
    // 当切换到随机模式时，直接洗牌播放列表
    if (isRandom && !wasRandom && playList.value.length > 0) {
      shufflePlayList();
      console.log('切换到随机模式，洗牌播放列表');
    }
    
    // 当从随机模式切换出去时，恢复原始顺序
    if (!isRandom && wasRandom) {
      restoreOriginalOrder();
      console.log('切换出随机模式，恢复原始顺序');
    }
  };

  const addToFavorite = async (id: number | string) => {
    // 检查是否已存在相同的ID或内容相同的B站视频
    const isAlreadyInList = favoriteList.value.some((existingId) =>
      typeof id === 'string' && id.includes('--')
        ? isBilibiliIdMatch(existingId, id)
        : existingId === id
    );

    if (!isAlreadyInList) {
      favoriteList.value.push(id);
      localStorage.setItem('favoriteList', JSON.stringify(favoriteList.value));
      typeof id === 'number' && useUserStore().user && likeSong(id, true);
    }
  };

  const removeFromFavorite = async (id: number | string) => {
    // 对于B站视频，需要根据bvid和cid来匹配
    if (typeof id === 'string' && id.includes('--')) {
      favoriteList.value = favoriteList.value.filter(
        (existingId) => !isBilibiliIdMatch(existingId, id)
      );
    } else {
      favoriteList.value = favoriteList.value.filter((existingId) => existingId !== id);
      useUserStore().user && likeSong(Number(id), false);
    }
    localStorage.setItem('favoriteList', JSON.stringify(favoriteList.value));
  };

  const addToDislikeList = (id: number | string) => {
    dislikeList.value.push(id);
    localStorage.setItem('dislikeList', JSON.stringify(dislikeList.value));
  };

  const removeFromDislikeList = (id: number | string) => {
    dislikeList.value = dislikeList.value.filter((existingId) => existingId !== id);
    localStorage.setItem('dislikeList', JSON.stringify(dislikeList.value));
  };

  const removeFromPlayList = (id: number | string) => {
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

  // 设置播放速度
  const setPlaybackRate = (rate: number) => {
    playbackRate.value = rate;
    audioService.setPlaybackRate(rate);
    // 保存到本地存储
    localStorage.setItem('playbackRate', rate.toString());
  };

  // 初始化播放状态
  const initializePlayState = async () => {
    const settingStore = useSettingsStore();
    const savedPlayList = getLocalStorageItem('playList', []);
    const savedPlayMusic = getLocalStorageItem<SongResult | null>('currentPlayMusic', null);

    if (savedPlayList.length > 0) {
      setPlayList(savedPlayList);
      
      // 重启后恢复随机播放状态
      if (playMode.value === 2) {
        // 如果当前是随机模式但没有保存的原始播放列表，说明需要重新洗牌
        if (originalPlayList.value.length === 0) {
          console.log('重启后恢复随机播放模式，重新洗牌播放列表');
          shufflePlayList();
        } else {
          console.log('重启后恢复随机播放模式，播放列表已是洗牌状态');
        }
      }
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

        await handlePlayMusic(
          { ...savedPlayMusic, isFirstPlay: true, playMusicUrl: undefined },
          isPlaying
        );
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

    setTimeout(() => {
      audioService.setPlaybackRate(playbackRate.value);
    }, 2000);
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

  // 修改 playAudio 函数中的错误处理逻辑，避免在操作锁问题时频繁尝试播放
  const playAudio = async () => {
    if (!playMusicUrl.value || !playMusic.value) return null;

    try {
      // 保存当前播放状态
      const shouldPlay = play.value;
      console.log('播放音频，当前播放状态:', shouldPlay ? '播放' : '暂停');

      // 检查是否有保存的进度
      let initialPosition = 0;
      const savedProgress = JSON.parse(localStorage.getItem('playProgress') || '{}');
      if (savedProgress.songId === playMusic.value.id) {
        initialPosition = savedProgress.progress;
      }

      // 对于B站视频，检查URL是否有效
      if (
        playMusic.value.source === 'bilibili' &&
        (!playMusicUrl.value || playMusicUrl.value === 'undefined')
      ) {
        console.log('B站视频URL无效，尝试重新获取');

        // 需要重新获取B站视频URL
        if (playMusic.value.bilibiliData) {
          try {
            const proxyUrl = await getBilibiliAudioUrl(
              playMusic.value.bilibiliData.bvid,
              playMusic.value.bilibiliData.cid
            );

            // 设置URL到播放器状态
            (playMusic.value as any).playMusicUrl = proxyUrl;
            playMusicUrl.value = proxyUrl;
          } catch (error) {
            console.error('获取B站音频URL失败:', error);
            message.error(i18n.global.t('player.playFailed'));
            return null;
          }
        }
      }

      // 播放新音频，传递是否应该播放的状态
      console.log('调用audioService.play，播放状态:', shouldPlay);
      const newSound = await audioService.play(
        playMusicUrl.value,
        playMusic.value,
        shouldPlay,
        initialPosition || 0
      );

      // 添加播放状态检测（仅当需要播放时）
      if (shouldPlay) {
        checkPlaybackState(playMusic.value);
      }

      // 发布音频就绪事件
      window.dispatchEvent(
        new CustomEvent('audio-ready', { detail: { sound: newSound, shouldPlay } })
      );

      // 确保状态与 localStorage 同步
      localStorage.setItem('currentPlayMusic', JSON.stringify(playMusic.value));
      localStorage.setItem('currentPlayMusicUrl', playMusicUrl.value);

      return newSound;
    } catch (error) {
      console.error('播放音频失败:', error);
      setPlayMusic(false);

      // 检查错误是否是由于操作锁引起的
      const errorMsg = error instanceof Error ? error.message : String(error);

      // 操作锁错误处理
      if (errorMsg.includes('操作锁激活')) {
        console.log('由于操作锁正在使用，将在1000ms后重试');

        // 强制重置操作锁并延迟再试
        try {
          // 尝试强制重置音频服务的操作锁
          audioService.forceResetOperationLock();
          console.log('已强制重置操作锁');
        } catch (e) {
          console.error('重置操作锁失败:', e);
        }

        // 延迟较长时间，确保锁已完全释放
        setTimeout(() => {
          // 如果用户仍希望播放
          if (userPlayIntent.value && play.value) {
            // 直接重试当前歌曲，而不是切换到下一首
            playAudio().catch((e) => {
              console.error('重试播放失败，切换到下一首:', e);

              // 只有再次失败才切换到下一首
              if (playList.value.length > 1) {
                nextPlay();
              }
            });
          }
        }, 1000);
      } else {
        // 其他错误，切换到下一首
        console.log('播放失败，切换到下一首');
        setTimeout(() => {
          nextPlay();
        }, 300);
      }

      message.error(i18n.global.t('player.playFailed'));
      return null;
    }
  };

  // 使用指定的音源重新解析当前播放的歌曲
  const reparseCurrentSong = async (sourcePlatform: Platform) => {
    try {
      const currentSong = playMusic.value;
      if (!currentSong || !currentSong.id) {
        console.warn('没有有效的播放对象');
        return false;
      }

      // B站视频不支持重新解析
      if (currentSong.source === 'bilibili') {
        console.warn('B站视频不支持重新解析');
        return false;
      }

      // 保存用户选择的音源（作为数组传递，确保unblockMusic可以使用）
      const songId = String(currentSong.id);
      localStorage.setItem(`song_source_${songId}`, JSON.stringify([sourcePlatform]));

      // 停止当前播放
      const currentSound = audioService.getCurrentSound();
      if (currentSound) {
        currentSound.pause();
      }

      // 重新获取歌曲URL
      const numericId =
        typeof currentSong.id === 'string' ? parseInt(currentSong.id, 10) : currentSong.id;

      console.log(`使用音源 ${sourcePlatform} 重新解析歌曲 ${numericId}`);

      // 克隆一份歌曲数据，防止修改原始数据
      const songData = cloneDeep(currentSong);

      const res = await getParsingMusicUrl(numericId, songData);
      if (res && res.data && res.data.data && res.data.data.url) {
        // 更新URL
        const newUrl = res.data.data.url;
        console.log(`解析成功，获取新URL: ${newUrl.substring(0, 50)}...`);

        // 使用新URL更新播放
        const updatedMusic = {
          ...currentSong,
          playMusicUrl: newUrl,
          expiredAt: Date.now() + 1800000 // 半小时后过期
        };

        // 更新播放器状态并开始播放
        await setPlay(updatedMusic);
        setPlayMusic(true);

        return true;
      } else {
        console.warn(`使用音源 ${sourcePlatform} 解析失败`);
        return false;
      }
    } catch (error) {
      console.error('重新解析失败:', error);
      return false;
    }
  };

  // 设置播放列表抽屉显示状态
  const setPlayListDrawerVisible = (value: boolean) => {
    playListDrawerVisible.value = value;
  };

  // 播放
  const handlePause = async () => {
    try {
      const currentSound = audioService.getCurrentSound();
      if (currentSound) {
        currentSound.pause();
      }
      setPlayMusic(false);
      // 明确设置用户意图为暂停
      userPlayIntent.value = false;
    } catch (error) {
      console.error('暂停播放失败:', error);
    }
  };

  // 音量管理方法
  const setVolume = (newVolume: number) => {
    // 确保音量值在0-1范围内
    const normalizedVolume = Math.max(0, Math.min(1, newVolume));
    volume.value = normalizedVolume;

    // 保存到localStorage
    localStorage.setItem('volume', normalizedVolume.toString());

    // 应用到音频服务
    audioService.setVolume(normalizedVolume);
  };

  const getVolume = () => {
    return volume.value;
  };

  const increaseVolume = (step: number = 0.1) => {
    const newVolume = Math.min(1, volume.value + step);
    setVolume(newVolume);
    return newVolume;
  };

  const decreaseVolume = (step: number = 0.1) => {
    const newVolume = Math.max(0, volume.value - step);
    setVolume(newVolume);
    return newVolume;
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
    favoriteList,
    dislikeList,
    playListDrawerVisible,

    // 定时关闭相关
    sleepTimer,
    showSleepTimer,
    currentSleepTimer,
    hasSleepTimerActive,
    sleepTimerRemainingTime,
    sleepTimerRemainingSongs,
    setSleepTimerByTime,
    setSleepTimerBySongs,
    setSleepTimerAtPlaylistEnd,
    clearSleepTimer,

    currentSong,
    isPlaying,
    currentPlayList,
    currentPlayListIndex,

    clearPlayAll,
    setPlay,
    setIsPlay,
    nextPlay: nextPlay as unknown as typeof _nextPlay,
    prevPlay: prevPlay as unknown as typeof _prevPlay,
    setPlayMusic,
    setMusicFull,
    setPlayList,
    addToNextPlay,
    togglePlayMode,
    initializePlayState,
    initializeFavoriteList,
    addToFavorite,
    removeFromFavorite,
    removeFromPlayList,
    addToDislikeList,
    removeFromDislikeList,
    playAudio,
    reparseCurrentSong,
    setPlayListDrawerVisible,
    handlePause,
    playbackRate,
    setPlaybackRate,

    // 音量管理
    volume,
    setVolume,
    getVolume,
    increaseVolume,
    decreaseVolume,

    // 原始播放列表和洗牌相关
    originalPlayList,
    shufflePlayList,
    restoreOriginalOrder,
    preloadNextSongs
  };
});
