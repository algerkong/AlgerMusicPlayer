export default {
  title: '下载管理',
  localMusic: '本地音乐',
  count: '共 {count} 首歌曲',
  clearAll: '清空记录',
  settings: '设置',
  tabs: {
    downloading: '下载中',
    downloaded: '已下载'
  },
  empty: {
    noTasks: '暂无下载任务',
    noDownloaded: '暂无已下载歌曲'
  },
  progress: {
    total: '总进度: {progress}%'
  },
  status: {
    downloading: '下载中',
    completed: '已完成',
    failed: '失败',
    unknown: '未知'
  },
  artist: {
    unknown: '未知歌手'
  },
  delete: {
    title: '删除确认',
    message: '确定要删除歌曲 "{filename}" 吗？此操作不可恢复。',
    confirm: '确定删除',
    cancel: '取消',
    success: '删除成功',
    failed: '删除失败',
    fileNotFound: '文件不存在或已被移动，已从记录中移除',
    recordRemoved: '文件删除失败，但已从记录中移除'
  },
  clear: {
    title: '清空下载记录',
    message: '确定要清空所有下载记录吗？此操作不会删除已下载的音乐文件，但将清空所有记录。',
    confirm: '确定清空',
    cancel: '取消',
    success: '下载记录已清空'
  },
  message: {
    downloadComplete: '{filename} 下载完成',
    downloadFailed: '{filename} 下载失败: {error}'
  },
  loading: '加载中...',
  playStarted: '开始播放: {name}',
  playFailed: '播放失败: {name}',
  path: {
    copied: '路径已复制到剪贴板',
    copyFailed: '复制路径失败'
  },
  settingsPanel: {
    title: '下载设置',
    path: '下载位置',
    pathDesc: '设置音乐文件下载保存的位置',
    pathPlaceholder: '请选择下载路径',
    noPathSelected: '请先选择下载路径',
    select: '选择文件夹',
    open: '打开文件夹',
    fileFormat: '文件名格式',
    fileFormatDesc: '设置下载音乐时的文件命名格式',
    customFormat: '自定义格式',
    separator: '分隔符',
    separators: {
      dash: '空格-空格',
      underscore: '下划线',
      space: '空格'
    },
    dragToArrange: '拖动排序或使用箭头按钮调整顺序：',
    formatVariables: '可用变量',
    preview: '预览效果：',
    saveSuccess: '下载设置已保存',
    presets: {
      songArtist: '歌曲名 - 歌手名',
      artistSong: '歌手名 - 歌曲名',
      songOnly: '仅歌曲名'
    },
    components: {
      songName: '歌曲名',
      artistName: '歌手名',
      albumName: '专辑名'
    }
  }
};
