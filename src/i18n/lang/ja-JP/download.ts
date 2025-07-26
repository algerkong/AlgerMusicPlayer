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
    noDownloaded: 'ダウンロード済みの楽曲がありません'
  },
  progress: {
    total: '全体の進行状況: {progress}%'
  },
  status: {
    downloading: 'ダウンロード中',
    completed: '完了',
    failed: '失敗',
    unknown: '不明'
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
    message: 'すべてのダウンロード記録をクリアしますか？この操作はダウンロード済みの音楽ファイルを削除しませんが、すべての記録をクリアします。',
    confirm: 'クリア確認',
    cancel: 'キャンセル',
    success: 'ダウンロード記録をクリアしました'
  },
  message: {
    downloadComplete: '{filename}のダウンロードが完了しました',
    downloadFailed: '{filename}のダウンロードに失敗しました: {error}'
  },
  loading: '読み込み中...',
  playStarted: '再生開始: {name}',
  playFailed: '再生失敗: {name}',
  path: {
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
  }
};