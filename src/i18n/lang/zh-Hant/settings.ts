export default {
  theme: '主題',
  language: '語言',
  logout: '登出',
  sections: {
    basic: '基礎設定',
    playback: '播放設定',
    application: '應用程式設定',
    network: '網路設定',
    system: '系統管理'
  },
  basic: {
    themeMode: '主題模式',
    themeModeDesc: '切換日間/夜間主題',
    language: '語言設定',
    languageDesc: '切換顯示語言',
    font: '字體設定',
    fontDesc: '選擇字體，優先使用排在前面的字體',
    fontScope: {
      global: '全域',
      lyric: '僅歌詞'
    },
    animation: '動畫速度',
    animationSpeedPlaceholder: '請輸入動畫速度',
    animationDesc: '是否開起動畫',
    animationSpeed: {
      slow: '極慢',
      normal: '正常',
      fast: '極快'
    },
    fontPreview: {
      title: '字體預覽',
      chinese: '中文',
      english: 'English',
      japanese: '日本語',
      korean: '한국어',
      chineseText: '靜夜思 床前明月光 疑是地上霜',
      englishText: 'The quick brown fox jumps over the lazy dog',
      japaneseText: 'あいうえお かきくけこ さしすせそ',
      koreanText: '가나다라마 바사아자차 카타파하'
    }
  },
  playback: {
    quality: '音質設定',
    qualityDesc: '選擇音樂播放音質（網易云VIP）',
    qualityOptions: {
      standard: '標準',
      higher: '較高',
      exhigh: '極高',
      lossless: '無損',
      hires: 'Hi-Res',
      jyeffect: '高清環繞聲',
      sky: '沉浸環繞聲',
      dolby: '杜比全景聲',
      jymaster: '超清母帶'
    },
    musicSources: '音源設定',
    musicSourcesDesc: '選擇音樂解析使用的音源平台',
    musicSourcesWarning: '至少需要選擇一個音源平台',
    webPlatformNote: '網頁版僅支援線上音源（GD音樂台、星辰音樂、雲端音樂）',
    musicUnblockEnable: '啟用音樂解析',
    musicUnblockEnableDesc: '開啟後將嘗試解析無法播放的音樂',
    configureMusicSources: '設定音源',
    selectedMusicSources: '已選音源：',
    noMusicSources: '未選擇音源',
    gdmusicInfo: 'GD音樂台可自動解析多個平台音源，自動選擇最佳結果',
    autoPlay: '自動播放',
    autoPlayDesc: '重新開啟應用程式時是否自動繼續播放',
    showStatusBar: '是否顯示狀態列控制功能',
    showStatusBarContent: '可以在您的mac狀態列顯示音樂控制功能(重啟後生效)'
  },
  application: {
    closeAction: '關閉行為',
    closeActionDesc: '選擇關閉視窗時的行為',
    closeOptions: {
      ask: '每次詢問',
      minimize: '最小化到系統匣',
      close: '直接退出'
    },
    shortcut: '快捷鍵設定',
    shortcutDesc: '自訂全域快捷鍵',
    download: '下載管理',
    downloadDesc: '是否始終顯示下載清單按鈕',
    unlimitedDownload: '無限制下載',
    unlimitedDownloadDesc: '開啟後將無限制下載音樂（可能出現下載失敗的情況）, 預設限制 300 首',
    downloadPath: '下載目錄',
    downloadPathDesc: '選擇音樂檔案的下載位置',
    remoteControl: '遠端控制',
    remoteControlDesc: '設定遠端控制功能'
  },
  network: {
    apiPort: '音樂API連接埠',
    apiPortDesc: '修改後需要重啟應用程式',
    proxy: '代理設定',
    proxyDesc: '無法存取音樂時可以開啟代理',
    proxyHost: '代理位址',
    proxyHostPlaceholder: '請輸入代理位址',
    proxyPort: '代理連接埠',
    proxyPortPlaceholder: '請輸入代理連接埠',
    realIP: 'realIP設定',
    realIPDesc: '由於限制,此項目在國外使用會受到限制可使用realIP參數,傳進國內IP解決',
    messages: {
      proxySuccess: '代理設定已儲存，重啟應用程式後生效',
      proxyError: '請檢查輸入是否正確',
      realIPSuccess: '真實IP設定已儲存',
      realIPError: '請輸入有效的IP位址'
    }
  },
  system: {
    cache: '快取管理',
    cacheDesc: '清除快取',
    cacheClearTitle: '請選擇要清除的快取類型：',
    cacheTypes: {
      history: {
        label: '播放歷史',
        description: '清除播放過的歌曲記錄'
      },
      favorite: {
        label: '收藏記錄',
        description: '清除本機收藏的歌曲記錄(不會影響雲端收藏)'
      },
      user: {
        label: '使用者資料',
        description: '清除登入資訊和使用者相關資料'
      },
      settings: {
        label: '應用程式設定',
        description: '清除應用程式的所有自訂設定'
      },
      downloads: {
        label: '下載記錄',
        description: '清除下載歷史記錄(不會刪除已下載的檔案)'
      },
      resources: {
        label: '音樂資源',
        description: '清除已載入的音樂檔案、歌詞等資源快取'
      },
      lyrics: {
        label: '歌詞資源',
        description: '清除已載入的歌詞資源快取'
      }
    },
    restart: '重新啟動',
    restartDesc: '重新啟動應用程式',
    messages: {
      clearSuccess: '清除成功，部分設定在重啟後生效'
    }
  },
  validation: {
    selectProxyProtocol: '請選擇代理協議',
    proxyHost: '請輸入代理位址',
    portNumber: '請輸入有效的連接埠號(1-65535)'
  },
  lyricSettings: {
    title: '歌詞設定',
    tabs: {
      display: '顯示',
      interface: '介面',
      typography: '文字',
      mobile: '行動端'
    },
    pureMode: '純淨模式',
    hideCover: '隱藏封面',
    centerDisplay: '置中顯示',
    showTranslation: '顯示翻譯',
    hideLyrics: '隱藏歌詞',
    hidePlayBar: '隱藏播放列',
    hideMiniPlayBar: '隱藏迷你播放列',
    backgroundTheme: '背景主題',
    themeOptions: {
      default: '預設',
      light: '亮色',
      dark: '暗色'
    },
    fontSize: '字體大小',
    fontSizeMarks: {
      small: '小',
      medium: '中',
      large: '大'
    },
    letterSpacing: '字間距',
    letterSpacingMarks: {
      compact: '緊湊',
      default: '預設',
      loose: '寬鬆'
    }
  }
};
