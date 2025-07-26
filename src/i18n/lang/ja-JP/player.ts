export default {
  nowPlaying: '再生中',
  playlist: 'プレイリスト',
  lyrics: '歌詞',
  previous: '前へ',
  play: '再生',
  pause: '一時停止',
  next: '次へ',
  volumeUp: '音量を上げる',
  volumeDown: '音量を下げる',
  mute: 'ミュート',
  unmute: 'ミュート解除',
  songNum: '楽曲総数：{num}',
  addCorrection: '{num}秒早める',
  subtractCorrection: '{num}秒遅らせる',
  playFailed: '現在の楽曲の再生に失敗しました。次の曲を再生します',
  playMode: {
    sequence: '順次再生',
    loop: 'リピート再生',
    random: 'ランダム再生'
  },
  fullscreen: {
    enter: 'フルスクリーン',
    exit: 'フルスクリーン終了'
  },
  close: '閉じる',
  modeHint: {
    single: 'リピート再生',
    list: '自動で次の曲を再生'
  },
  lrc: {
    noLrc: '歌詞がありません。お楽しみください'
  },
  reparse: {
    title: '解析音源を選択',
    desc: '音源をクリックして直接解析します。次回この楽曲を再生する際は選択した音源を使用します',
    success: '再解析成功',
    failed: '再解析失敗',
    warning: '音源を選択してください',
    bilibiliNotSupported: 'Bilibili動画は再解析をサポートしていません',
    processing: '解析中...',
    clear: 'カスタム音源をクリア'
  },
  playBar: {
    expand: '歌詞を展開',
    collapse: '歌詞を折りたたみ',
    like: 'いいね',
    lyric: '歌詞',
    noSongPlaying: '再生中の楽曲がありません',
    eq: 'イコライザー',
    playList: 'プレイリスト',
    reparse: '再解析',
    playMode: {
      sequence: '順次再生',
      loop: 'ループ再生',
      random: 'ランダム再生'
    },
    play: '再生開始',
    pause: '再生一時停止',
    prev: '前の曲',
    next: '次の曲',
    volume: '音量',
    favorite: '{name}をお気に入りに追加しました',
    unFavorite: '{name}をお気に入りから削除しました',
    miniPlayBar: 'ミニ再生バー',
    playbackSpeed: '再生速度',
    advancedControls: 'その他の設定'
  },
  eq: {
    title: 'イコライザー',
    reset: 'リセット',
    on: 'オン',
    off: 'オフ',
    bass: '低音',
    midrange: '中音',
    treble: '高音',
    presets: {
      flat: 'フラット',
      pop: 'ポップ',
      rock: 'ロック',
      classical: 'クラシック',
      jazz: 'ジャズ',
      electronic: 'エレクトロニック',
      hiphop: 'ヒップホップ',
      rb: 'R&B',
      metal: 'メタル',
      vocal: 'ボーカル',
      dance: 'ダンス',
      acoustic: 'アコースティック',
      custom: 'カスタム'
    }
  },
  // タイマー機能関連
  sleepTimer: {
    title: 'スリープタイマー',
    cancel: 'タイマーをキャンセル',
    timeMode: '時間で停止',
    songsMode: '楽曲数で停止',
    playlistEnd: 'プレイリスト終了後に停止',
    afterPlaylist: 'プレイリスト終了後に停止',
    activeUntilEnd: 'リスト終了まで再生',
    minutes: '分',
    hours: '時間',
    songs: '曲',
    set: '設定',
    timerSetSuccess: '{minutes}分後に停止するよう設定しました',
    songsSetSuccess: '{songs}曲再生後に停止するよう設定しました',
    playlistEndSetSuccess: 'プレイリスト終了後に停止するよう設定しました',
    timerCancelled: 'スリープタイマーをキャンセルしました',
    timerEnded: 'スリープタイマーが作動しました',
    playbackStopped: '音楽再生を停止しました',
    minutesRemaining: '残り{minutes}分',
    songsRemaining: '残り{count}曲'
  },
  playList: {
    clearAll: 'プレイリストをクリア',
    alreadyEmpty: 'プレイリストは既に空です',
    cleared: 'プレイリストをクリアしました',
    empty: 'プレイリストが空です',
    clearConfirmTitle: 'プレイリストをクリア',
    clearConfirmContent: 'これによりプレイリスト内のすべての楽曲がクリアされ、現在の再生が停止されます。続行しますか？'
  }
};