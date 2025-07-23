export default {
  nowPlaying: '正在播放',
  playlist: '播放列表',
  lyrics: '歌词',
  previous: '上一个',
  play: '播放',
  pause: '暂停',
  next: '下一个',
  volumeUp: '音量增加',
  volumeDown: '音量减少',
  mute: '静音',
  unmute: '取消静音',
  songNum: '歌曲总数：{num}',
  addCorrection: '提前 {num} 秒',
  subtractCorrection: '延迟 {num} 秒',
  playFailed: '当前歌曲播放失败，播放下一首',
  playMode: {
    sequence: '顺序播放',
    loop: '单曲循环',
    random: '随机播放'
  },
  fullscreen: {
    enter: '全屏',
    exit: '退出全屏'
  },
  close: '关闭',
  modeHint: {
    single: '单曲循环',
    list: '自动播放下一个'
  },
  lrc: {
    noLrc: '暂无歌词, 请欣赏'
  },
  reparse: {
    title: '选择解析音源',
    desc: '点击音源直接进行解析，下次播放此歌曲时将使用所选音源',
    success: '重新解析成功',
    failed: '重新解析失败',
    warning: '请选择一个音源',
    bilibiliNotSupported: 'B站视频不支持重新解析',
    processing: '解析中...',
    clear: '清除自定义音源'
  },
  playBar: {
    expand: '展开歌词',
    collapse: '收起歌词',
    like: '喜欢',
    lyric: '歌词',
    noSongPlaying: '没有正在播放的歌曲',
    eq: '均衡器',
    playList: '播放列表',
    reparse: '重新解析',
    playMode: {
      sequence: '顺序播放',
      loop: '循环播放',
      random: '随机播放'
    },
    play: '开始播放',
    pause: '暂停播放',
    prev: '上一首',
    next: '下一首',
    volume: '音量',
    favorite: '已收藏{name}',
    unFavorite: '已取消收藏{name}',
    miniPlayBar: '迷你播放栏',
    playbackSpeed: '播放速度',
    advancedControls: '更多设置s'
  },
  eq: {
    title: '均衡器',
    reset: '重置',
    on: '开启',
    off: '关闭',
    bass: '低音',
    midrange: '中音',
    treble: '高音',
    presets: {
      flat: '平坦',
      pop: '流行',
      rock: '摇滚',
      classical: '古典',
      jazz: '爵士',
      electronic: '电子',
      hiphop: '嘻哈',
      rb: 'R&B',
      metal: '金属',
      vocal: '人声',
      dance: '舞曲',
      acoustic: '原声',
      custom: '自定义'
    }
  },
  // 定时关闭功能相关
  sleepTimer: {
    title: '定时关闭',
    cancel: '取消定时',
    timeMode: '按时间关闭',
    songsMode: '按歌曲数关闭',
    playlistEnd: '播放完列表后关闭',
    afterPlaylist: '播放完列表后关闭',
    activeUntilEnd: '播放至列表结束',
    minutes: '分钟',
    hours: '小时',
    songs: '首歌',
    set: '设置',
    timerSetSuccess: '已设置{minutes}分钟后关闭',
    songsSetSuccess: '已设置播放{songs}首歌后关闭',
    playlistEndSetSuccess: '已设置播放完列表后关闭',
    timerCancelled: '已取消定时关闭',
    timerEnded: '定时关闭已触发',
    playbackStopped: '音乐播放已停止',
    minutesRemaining: '剩余{minutes}分钟',
    songsRemaining: '剩余{count}首歌'
  },
  playList: {
    clearAll: '清空播放列表',
    alreadyEmpty: '播放列表已经为空',
    cleared: '已清空播放列表',
    empty: '播放列表为空',
    clearConfirmTitle: '清空播放列表',
    clearConfirmContent: '这将清空所有播放列表中的歌曲并停止当前播放。是否继续？'
  }
};
