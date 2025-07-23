export default {
  title: '下載管理',
  localMusic: '本機音樂',
  count: '共 {count} 首歌曲',
  clearAll: '清空記錄',
  settings: '設定',
  tabs: {
    downloading: '下載中',
    downloaded: '已下載'
  },
  empty: {
    noTasks: '暫無下載任務',
    noDownloaded: '暫無已下載歌曲'
  },
  progress: {
    total: '總進度: {progress}%'
  },
  status: {
    downloading: '下載中',
    completed: '已完成',
    failed: '失敗',
    unknown: '未知'
  },
  artist: {
    unknown: '未知歌手'
  },
  delete: {
    title: '刪除確認',
    message: '確定要刪除歌曲 "{filename}" 嗎？此操作不可恢復。',
    confirm: '確定刪除',
    cancel: '取消',
    success: '刪除成功',
    failed: '刪除失敗',
    fileNotFound: '檔案不存在或已被移動，已從記錄中移除',
    recordRemoved: '檔案刪除失敗，但已從記錄中移除'
  },
  clear: {
    title: '清空下載記錄',
    message: '確定要清空所有下載記錄嗎？此操作不會刪除已下載的音樂檔案，但將清空所有記錄。',
    confirm: '確定清空',
    cancel: '取消',
    success: '下載記錄已清空'
  },
  message: {
    downloadComplete: '{filename} 下載完成',
    downloadFailed: '{filename} 下載失敗: {error}'
  },
  loading: '載入中...',
  playStarted: '開始播放: {name}',
  playFailed: '播放失敗: {name}',
  path: {
    copied: '路徑已複製到剪貼簿',
    copyFailed: '複製路徑失敗'
  },
  settingsPanel: {
    title: '下載設定',
    path: '下載位置',
    pathDesc: '設定音樂檔案下載儲存的位置',
    pathPlaceholder: '請選擇下載路徑',
    noPathSelected: '請先選擇下載路徑',
    select: '選擇資料夾',
    open: '開啟資料夾',
    fileFormat: '檔名格式',
    fileFormatDesc: '設定下載音樂時的檔案命名格式',
    customFormat: '自訂格式',
    separator: '分隔符號',
    separators: {
      dash: '空格-空格',
      underscore: '底線',
      space: '空格'
    },
    dragToArrange: '拖曳排序或使用箭頭按鈕調整順序：',
    formatVariables: '可用變數',
    preview: '預覽效果：',
    saveSuccess: '下載設定已儲存',
    presets: {
      songArtist: '歌曲名 - 歌手名',
      artistSong: '歌手名 - 歌曲名',
      songOnly: '僅歌曲名'
    },
    components: {
      songName: '歌曲名',
      artistName: '歌手名',
      albumName: '專輯名'
    }
  }
};
