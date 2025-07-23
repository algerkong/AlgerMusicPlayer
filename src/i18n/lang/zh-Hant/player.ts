export default {
  nowPlaying: '正在播放',
  playlist: '播放清單',
  lyrics: '歌詞',
  previous: '上一個',
  play: '播放',
  pause: '暫停',
  next: '下一個',
  volumeUp: '音量增加',
  volumeDown: '音量減少',
  mute: '靜音',
  unmute: '取消靜音',
  songNum: '歌曲總數：{num}',
  addCorrection: '提前 {num} 秒',
  subtractCorrection: '延遲 {num} 秒',
  playFailed: '目前歌曲播放失敗，播放下一首',
  playMode: {
    sequence: '順序播放',
    loop: '單曲循環',
    random: '隨機播放'
  },
  fullscreen: {
    enter: '全螢幕',
    exit: '退出全螢幕'
  },
  close: '關閉',
  modeHint: {
    single: '單曲循環',
    list: '自動播放下一個'
  },
  lrc: {
    noLrc: '暫無歌詞, 請欣賞'
  },
  reparse: {
    title: '選擇解析音源',
    desc: '點擊音源直接進行解析，下次播放此歌曲時將使用所選音源',
    success: '重新解析成功',
    failed: '重新解析失敗',
    warning: '請選擇一個音源',
    bilibiliNotSupported: 'B站影片不支援重新解析',
    processing: '解析中...',
    clear: '清除自訂音源'
  },
  playBar: {
    expand: '展開歌詞',
    collapse: '收合歌詞',
    like: '喜歡',
    lyric: '歌詞',
    noSongPlaying: '沒有正在播放的歌曲',
    eq: '等化器',
    playList: '播放清單',
    reparse: '重新解析',
    playMode: {
      sequence: '順序播放',
      loop: '循環播放',
      random: '隨機播放'
    },
    play: '開始播放',
    pause: '暫停播放',
    prev: '上一首',
    next: '下一首',
    volume: '音量',
    favorite: '已收藏{name}',
    unFavorite: '已取消收藏{name}',
    miniPlayBar: '迷你播放列',
    playbackSpeed: '播放速度',
    advancedControls: '更多設定s'
  },
  eq: {
    title: '等化器',
    reset: '重設',
    on: '開啟',
    off: '關閉',
    bass: '低音',
    midrange: '中音',
    treble: '高音',
    presets: {
      flat: '平坦',
      pop: '流行',
      rock: '搖滾',
      classical: '古典',
      jazz: '爵士',
      electronic: '電子',
      hiphop: '嘻哈',
      rb: 'R&B',
      metal: '金屬',
      vocal: '人聲',
      dance: '舞曲',
      acoustic: '原聲',
      custom: '自訂'
    }
  },
  // 定時關閉功能相關
  sleepTimer: {
    title: '定時關閉',
    cancel: '取消定時',
    timeMode: '按時間關閉',
    songsMode: '按歌曲數關閉',
    playlistEnd: '播放完清單後關閉',
    afterPlaylist: '播放完清單後關閉',
    activeUntilEnd: '播放至清單結束',
    minutes: '分鐘',
    hours: '小時',
    songs: '首歌',
    set: '設定',
    timerSetSuccess: '已設定{minutes}分鐘後關閉',
    songsSetSuccess: '已設定播放{songs}首歌後關閉',
    playlistEndSetSuccess: '已設定播放完清單後關閉',
    timerCancelled: '已取消定時關閉',
    timerEnded: '定時關閉已觸發',
    playbackStopped: '音樂播放已停止',
    minutesRemaining: '剩餘{minutes}分鐘',
    songsRemaining: '剩餘{count}首歌'
  },
  playList: {
    clearAll: '清空播放清單',
    alreadyEmpty: '播放清單已經為空',
    cleared: '已清空播放清單',
    empty: '播放清單為空',
    clearConfirmTitle: '清空播放清單',
    clearConfirmContent: '這將清空所有播放清單中的歌曲並停止目前播放。是否繼續？'
  }
};
