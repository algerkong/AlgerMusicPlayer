import { getMusicLrc } from '@/api/music'
import { ILyric } from '@/type/lyric'
import { getIsMc } from '@/utils'

interface ILrcData {
  text: string
  trText: string
}

const lrcData = ref<ILyric>()
const newLrcIndex = ref<number>(0)
const lrcArray = ref<Array<ILrcData>>([])
const lrcTimeArray = ref<Array<Number>>([])

const parseTime = (timeString: string) => {
  const [minutes, seconds] = timeString.split(':')
  return parseInt(minutes) * 60 + parseFloat(seconds)
}

const TIME_REGEX = /(\d{2}:\d{2}(\.\d*)?)/g
const LRC_REGEX = /(\[(\d{2}):(\d{2})(\.(\d*))?\])/g

function parseLyricLine(lyricLine: string) {
  // [00:00.00] 作词 : 长友美知惠/
  const timeText = lyricLine.match(TIME_REGEX)?.[0] || ''
  const time = parseTime(timeText)
  const text = lyricLine.replace(LRC_REGEX, '').trim()
  return { time, text }
}

interface ILyricText {
  text: string
  trText: string
}

function parseLyrics(lyricsString: string) {
  const lines = lyricsString.split('\n')
  const lyrics: Array<ILyricText> = []
  const times: number[] = []
  lines.forEach((line) => {
    const { time, text } = parseLyricLine(line)
    times.push(time)
    lyrics.push({ text, trText: '' })
  })
  return { lyrics, times }
}

const loadLrc = async (playMusicId: number): Promise<void> => {
  try {
    const { data } = await getMusicLrc(playMusicId)
    const { lyrics, times } = parseLyrics(data.lrc.lyric)
    lrcTimeArray.value = times
    lrcArray.value = lyrics
  } catch (err) {
    console.error('err', err)
  }
}

// 歌词矫正时间Correction time
const correctionTime = ref(0.4)

// 增加矫正时间
const addCorrectionTime = (time: number) => {
  correctionTime.value += time
}

// 减少矫正时间
const reduceCorrectionTime = (time: number) => {
  correctionTime.value -= time
}

const isCurrentLrc = (index: any, time: number) => {
  const currentTime = Number(lrcTimeArray.value[index])
  const nextTime = Number(lrcTimeArray.value[index + 1])
  const nowTime = time + correctionTime.value
  const isTrue = nowTime > currentTime && nowTime < nextTime
  if (isTrue) {
    newLrcIndex.value = index
  }
  return isTrue
}

const nowTime = ref(0)
const allTime = ref(0)

// 设置当前播放时间
const setAudioTime = (index: any, audio: HTMLAudioElement) => {
  audio.currentTime = lrcTimeArray.value[index] as number
  audio.play()
}

export {
  lrcData,
  lrcArray,
  lrcTimeArray,
  newLrcIndex,
  loadLrc,
  isCurrentLrc,
  addCorrectionTime,
  reduceCorrectionTime,
  setAudioTime,
  nowTime,
  allTime,
}
