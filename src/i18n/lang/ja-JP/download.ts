export default {
  title: 'ダウンロード管理',
  localMusic: 'ローカル音楽',
  count: '合計{count}曲',
  clearAll: '記録をクリア',
  settings: '設定',
  tabs: {
    downloading: 'ダウンロード中',
    downloaded: 'ダウンロード済み'
  },
  empty: {
    noTasks: 'ダウンロードタスクがありません',
    noDownloaded: 'ダウンロード済みの楽曲がありません',
    noDownloadedHint: '好きな曲をダウンロードしましょう'
  },
  progress: {
    total: '全体の進行状況: {progress}%'
  },
  status: {
    downloading: 'ダウンロード中',
    completed: '完了',
    failed: '失敗',
    unknown: '不明',
    queued: 'キュー中',
    paused: '一時停止',
    cancelled: 'キャンセル済み'
  },
  action: {
    pause: '一時停止',
    resume: '再開',
    cancel: 'キャンセル',
    cancelAll: 'すべてキャンセル',
    retrying: 'URL再取得中...'
  },
  batch: {
    complete: 'ダウンロード完了：{success}/{total}曲成功',
    allComplete: '全てのダウンロードが完了'
  },
  artist: {
    unknown: '不明なアーティスト'
  },
  delete: {
    title: '削除確認',
    message: '楽曲「{filename}」を削除しますか？この操作は元に戻せません。',
    confirm: '削除確認',
    cancel: 'キャンセル',
    success: '削除成功',
    failed: '削除失敗',
    fileNotFound: 'ファイルが存在しないか移動されました。記録から削除しました',
    recordRemoved: 'ファイルの削除に失敗しましたが、記録から削除しました'
  },
  clear: {
    title: 'ダウンロード記録をクリア',
    message:
      'すべてのダウンロード記録をクリアしますか？この操作はダウンロード済みの音楽ファイルを削除しませんが、すべての記録をクリアします。',
    confirm: 'クリア確認',
    cancel: 'キャンセル',
    success: 'ダウンロード記録をクリアしました',
    failed: 'ダウンロード記録のクリアに失敗しました'
  },
  save: {
    title: '設定を保存',
    message: '現在のダウンロード設定が保存されていません。変更を保存しますか？',
    confirm: '保存',
    cancel: 'キャンセル',
    discard: '破棄',
    saveSuccess: 'ダウンロード設定を保存しました'
  },
  message: {
    downloadComplete: '{filename}のダウンロードが完了しました',
    downloadFailed: '{filename}のダウンロードに失敗しました: {error}'
  },
  loading: '読み込み中...',
  playStarted: '再生開始: {name}',
  playFailed: '再生失敗: {name}',
  path: {
    copy: 'パスをコピー',
    copied: 'パスをクリップボードにコピーしました',
    copyFailed: 'パスのコピーに失敗しました'
  },
  settingsPanel: {
    title: 'ダウンロード設定',
    path: 'ダウンロード場所',
    pathDesc: '音楽ファイルのダウンロード保存場所を設定',
    pathPlaceholder: 'ダウンロードパスを選択してください',
    noPathSelected: 'まずダウンロードパスを選択してください',
    select: 'フォルダを選択',
    open: 'フォルダを開く',
    saveLyric: '歌詞ファイルを個別に保存',
    saveLyricDesc: '楽曲ダウンロード時に .lrc 歌詞ファイルも一緒に保存します',
    fileFormat: 'ファイル名形式',
    fileFormatDesc: '音楽ダウンロード時のファイル命名形式を設定',
    customFormat: 'カスタム形式',
    separator: '区切り文字',
    separators: {
      dash: 'スペース-スペース',
      underscore: 'アンダースコア',
      space: 'スペース'
    },
    dragToArrange: 'ドラッグで並び替えまたは矢印ボタンで順序を調整：',
    formatVariables: '使用可能な変数',
    preview: 'プレビュー効果：',
    concurrency: '最大同時ダウンロード数',
    concurrencyDesc: '同時にダウンロードする最大曲数（1-5）',
    saveSuccess: 'ダウンロード設定を保存しました',
    presets: {
      songArtist: '楽曲名 - アーティスト名',
      artistSong: 'アーティスト名 - 楽曲名',
      songOnly: '楽曲名のみ'
    },
    components: {
      songName: '楽曲名',
      artistName: 'アーティスト名',
      albumName: 'アルバム名'
    }
  },
  error: {
    incomplete: 'ファイルのダウンロードが不完全です',
    urlExpired: 'URLの有効期限が切れました。再取得中',
    resumeFailed: '再開に失敗しました'
  }
};
