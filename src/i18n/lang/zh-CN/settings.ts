export default {
  theme: '主题',
  language: '语言',
  logout: '退出登录',
  sections: {
    basic: '基础设置',
    playback: '播放设置',
    application: '应用设置',
    network: '网络设置',
    system: '系统管理'
  },
  basic: {
    themeMode: '主题模式',
    themeModeDesc: '切换日间/夜间主题',
    language: '语言设置',
    languageDesc: '切换显示语言',
    font: '字体设置',
    fontDesc: '选择字体，优先使用排在前面的字体',
    fontScope: {
      global: '全局',
      lyric: '仅歌词'
    },
    animation: '动画速度',
    animationDesc: '是否开启动画',
    animationSpeed: {
      slow: '极慢',
      normal: '正常',
      fast: '极快'
    },
    fontPreview: {
      title: '字体预览',
      chinese: '中文',
      english: 'English',
      japanese: '日本語',
      korean: '한국어',
      chineseText: '静夜思 床前明月光 疑是地上霜',
      englishText: 'The quick brown fox jumps over the lazy dog',
      japaneseText: 'あいうえお かきくけこ さしすせそ',
      koreanText: '가나다라마 바사아자차 카타파하'
    }
  },
  playback: {
    quality: '音质设置',
    qualityDesc: '选择音乐播放音质（网易云VIP）',
    qualityOptions: {
      standard: '标准',
      higher: '较高',
      exhigh: '极高',
      lossless: '无损',
      hires: 'Hi-Res',
      jyeffect: '高清环绕声',
      sky: '沉浸环绕声',
      dolby: '杜比全景声',
      jymaster: '超清母带'
    },
    musicSources: '音源设置',
    musicSourcesDesc: '选择音乐解析使用的音源平台',
    musicSourcesWarning: '至少需要选择一个音源平台',
    musicUnblockEnable: '启用音乐解析',
    musicUnblockEnableDesc: '开启后将尝试解析无法播放的音乐',
    configureMusicSources: '配置音源',
    selectedMusicSources: '已选音源：',
    noMusicSources: '未选择音源',
    gdmusicInfo: 'GD音乐台可自动解析多个平台音源，自动选择最佳结果',
    autoPlay: '自动播放',
    autoPlayDesc: '重新打开应用时是否自动继续播放',
    showStatusBar: '是否显示状态栏控制功能',
    showStatusBarContent: '可以在您的mac状态栏显示音乐控制功能(重启后生效)',
  },
  application: {
    closeAction: '关闭行为',
    closeActionDesc: '选择关闭窗口时的行为',
    closeOptions: {
      ask: '每次询问',
      minimize: '最小化到托盘',
      close: '直接退出'
    },
    shortcut: '快捷键设置',
    shortcutDesc: '自定义全局快捷键',
    download: '下载管理',
    downloadDesc: '是否始终显示下载列表按钮',
    unlimitedDownload: '无限制下载',
    unlimitedDownloadDesc: '开启后将无限制下载音乐（可能出现下载失败的情况）, 默认限制 300 首',
    downloadPath: '下载目录',
    downloadPathDesc: '选择音乐文件的下载位置',
    remoteControl: '远程控制',
    remoteControlDesc: '设置远程控制功能'
  },
  network: {
    apiPort: '音乐API端口',
    apiPortDesc: '修改后需要重启应用',
    proxy: '代理设置',
    proxyDesc: '无法访问音乐时可以开启代理',
    proxyHost: '代理地址',
    proxyHostPlaceholder: '请输入代理地址',
    proxyPort: '代理端口',
    proxyPortPlaceholder: '请输入代理端口',
    realIP: 'realIP设置',
    realIPDesc: '由于限制,此项目在国外使用会受到限制可使用realIP参数,传进国内IP解决',
    messages: {
      proxySuccess: '代理设置已保存，重启应用后生效',
      proxyError: '请检查输入是否正确',
      realIPSuccess: '真实IP设置已保存',
      realIPError: '请输入有效的IP地址'
    }
  },
  system: {
    cache: '缓存管理',
    cacheDesc: '清除缓存',
    cacheClearTitle: '请选择要清除的缓存类型：',
    cacheTypes: {
      history: {
        label: '播放历史',
        description: '清除播放过的歌曲记录'
      },
      favorite: {
        label: '收藏记录',
        description: '清除本地收藏的歌曲记录(不会影响云端收藏)'
      },
      user: {
        label: '用户数据',
        description: '清除登录信息和用户相关数据'
      },
      settings: {
        label: '应用设置',
        description: '清除应用的所有自定义设置'
      },
      downloads: {
        label: '下载记录',
        description: '清除下载历史记录(不会删除已下载的文件)'
      },
      resources: {
        label: '音乐资源',
        description: '清除已加载的音乐文件、歌词等资源缓存'
      },
      lyrics: {
        label: '歌词资源',
        description: '清除已加载的歌词资源缓存'
      }
    },
    restart: '重启',
    restartDesc: '重启应用',
    messages: {
      clearSuccess: '清除成功，部分设置在重启后生效'
    }
  },
  validation: {
    selectProxyProtocol: '请选择代理协议',
    proxyHost: '请输入代理地址',
    portNumber: '请输入有效的端口号(1-65535)'
  },
  lyricSettings: {
    title: '歌词设置',
    tabs: {
      display: '显示',
      interface: '界面',
      typography: '文字',
      mobile: '移动端'
    },
    pureMode: '纯净模式',
    hideCover: '隐藏封面',
    centerDisplay: '居中显示',
    showTranslation: '显示翻译',
    hideLyrics: '隐藏歌词',
    hidePlayBar: '隐藏播放栏',
    hideMiniPlayBar: '隐藏迷你播放栏',
    backgroundTheme: '背景主题',
    themeOptions: {
      default: '默认',
      light: '亮色',
      dark: '暗色'
    },
    fontSize: '字体大小',
    fontSizeMarks: {
      small: '小',
      medium: '中',
      large: '大'
    },
    letterSpacing: '字间距',
    letterSpacingMarks: {
      compact: '紧凑',
      default: '默认',
      loose: '宽松'
    },
    lineHeight: '行高',
    lineHeightMarks: {
      compact: '紧凑',
      default: '默认',
      loose: '宽松'
    },
    mobileLayout: '移动端布局',
    layoutOptions: {
      default: '默认',
      ios: 'iOS风格',
      android: '安卓风格'
    },
    mobileCoverStyle: '封面样式',
    coverOptions: {
      record: '唱片',
      square: '方形',
      full: '全屏'
    },
    lyricLines: '歌词行数',
    mobileUnavailable: '此设置仅在移动端可用'
  },
  shortcutSettings: {
    title: '快捷键设置',
    shortcut: '快捷键',
    shortcutDesc: '自定义快捷键',
    shortcutConflict: '快捷键冲突',
    inputPlaceholder: '点击输入快捷键',
    resetShortcuts: '恢复默认',
    disableAll: '全部禁用',
    enableAll: '全部启用',
    togglePlay: '播放/暂停',
    prevPlay: '上一首',
    nextPlay: '下一首',
    volumeUp: '音量增加',
    volumeDown: '音量减少',
    toggleFavorite: '收藏/取消收藏',
    toggleWindow: '显示/隐藏窗口',
    scopeGlobal: '全局',
    scopeApp: '应用内',
    enabled: '启用',
    disabled: '禁用',
    messages: {
      resetSuccess: '已恢复默认快捷键，请记得保存',
      conflict: '存在冲突的快捷键，请重新设置',
      saveSuccess: '快捷键设置已保存',
      saveError: '保存快捷键失败，请重试',
      cancelEdit: '已取消修改',
      disableAll: '已禁用所有快捷键，请记得保存',
      enableAll: '已启用所有快捷键，请记得保存'
    }
  },
  remoteControl: {
    title: '远程控制',
    enable: '启用远程控制',
    port: '服务端口',
    allowedIps: '允许的IP地址',
    addIp: '添加IP',
    emptyListHint: '空列表表示允许所有IP访问',
    saveSuccess: '远程控制设置已保存',
    accessInfo: '远程控制访问地址:',
  }
};
