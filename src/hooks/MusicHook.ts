import { getMusicLrc } from '@/api/music';
import { ILyric } from '@/type/lyric';

interface ILrcData {
  text: string;
  trText: string;
}

export const lrcData = ref<ILyric>();
export const newLrcIndex = ref<number>(0);
export const lrcArray = ref<Array<ILrcData>>([]);
export const lrcTimeArray = ref<Array<Number>>([]);

export const parseTime = (timeString: string) => {
  const [minutes, seconds] = timeString.split(':');
  return Number(minutes) * 60 + Number(seconds);
};

const TIME_REGEX = /(\d{2}:\d{2}(\.\d*)?)/g;
const LRC_REGEX = /(\[(\d{2}):(\d{2})(\.(\d*))?\])/g;

function parseLyricLine(lyricLine: string) {
  const timeText = lyricLine.match(TIME_REGEX)?.[0] || '';
  const time = parseTime(timeText);
  const text = lyricLine.replace(LRC_REGEX, '').trim();
  return { time, text };
}

interface ILyricText {
  text: string;
  trText: string;
}

function parseLyrics(lyricsString: string) {
  const lines = lyricsString.split('\n');
  const lyrics: Array<ILyricText> = [];
  const times: number[] = [];
  lines.forEach((line) => {
    const { time, text } = parseLyricLine(line);
    times.push(time);
    lyrics.push({ text, trText: '' });
  });
  return { lyrics, times };
}

export const loadLrc = async (playMusicId: number): Promise<void> => {
  try {
    const { data } = await getMusicLrc(playMusicId);
    const { lyrics, times } = parseLyrics(data.lrc.lyric);
    let tlyric: {
      [key: string]: string;
    } = {};
    if (data.tlyric.lyric) {
      const { lyrics: tLyrics, times: tTimes } = parseLyrics(data.tlyric.lyric);
      tlyric = tLyrics.reduce((acc: any, cur, index) => {
        acc[tTimes[index]] = cur.text;
        return acc;
      }, {});
    }
    if (Object.keys(tlyric).length) {
      lyrics.forEach((item, index) => {
        item.trText = item.text ? tlyric[times[index].toString()] : '';
      });
    }
    lrcTimeArray.value = times;
    lrcArray.value = lyrics;
  } catch (err) {
    console.error('err', err);
  }
};

// 歌词矫正时间Correction time
const correctionTime = ref(0.4);

// 增加矫正时间
export const addCorrectionTime = (time: number) => {
  correctionTime.value += time;
};

// 减少矫正时间
export const reduceCorrectionTime = (time: number) => {
  correctionTime.value -= time;
};

export const isCurrentLrc = (index: any, time: number) => {
  const currentTime = Number(lrcTimeArray.value[index]);
  const nextTime = Number(lrcTimeArray.value[index + 1]);
  const nowTime = time + correctionTime.value;
  const isTrue = nowTime > currentTime && nowTime < nextTime;
  if (isTrue) {
    newLrcIndex.value = index;
  }
  return isTrue;
};

export const nowTime = ref(0);
export const allTime = ref(0);
export const nowIndex = ref(0);

export const getLrcIndex = (time: number) => {
  for (let i = 0; i < lrcTimeArray.value.length; i++) {
    if (isCurrentLrc(i, time)) {
      nowIndex.value = i || nowIndex.value;
      return i;
    }
  }
  return nowIndex.value;
};

// 设置当前播放时间
export const setAudioTime = (index: any, audio: HTMLAudioElement) => {
  audio.currentTime = lrcTimeArray.value[index] as number;
  audio.play();
};

// 计算这个歌词的播放时间
const getLrcTime = (index: any) => {
  return Number(lrcTimeArray.value[index]);
};

// 获取当前播放的歌词
export const getCurrentLrc = () => {
  const index = getLrcIndex(nowTime.value);
  const currentLrc = lrcArray.value[index];
  const nextLrc = lrcArray.value[index + 1];
  return { currentLrc, nextLrc };
};

// 获取一句歌词播放时间是 几秒到几秒
export const getLrcTimeRange = (index: any) => {
  const currentTime = Number(lrcTimeArray.value[index]);
  const nextTime = Number(lrcTimeArray.value[index + 1]);
  return { currentTime, nextTime };
};

export const sendLyricToWin = (isPlay: boolean = true) => {
  try {
    // 设置lyricWinData 获取 当前播放的两句歌词 和歌词时间
    let lyricWinData = null;
    if (lrcArray.value.length > 0) {
      const nowIndex = getLrcIndex(nowTime.value);
      const { currentLrc, nextLrc } = getCurrentLrc();
      const { currentTime, nextTime } = getLrcTimeRange(nowIndex);
      lyricWinData = {
        currentLrc,
        nextLrc,
        currentTime,
        nextTime,
        nowIndex,
        lrcTimeArray: lrcTimeArray.value,
        lrcArray: lrcArray.value,
        nowTime: nowTime.value,
        allTime: allTime.value,
        startCurrentTime: getLrcTime(nowIndex),
        isPlay,
      };

      const windowData = window as any;
      windowData.electronAPI.sendLyric(JSON.stringify(lyricWinData));
    }
  } catch (error) {
    console.error('error', error);
  }
};

export const openLyric = () => {
  const windowData = window as any;
  windowData.electronAPI.openLyric();
  sendLyricToWin();
};
