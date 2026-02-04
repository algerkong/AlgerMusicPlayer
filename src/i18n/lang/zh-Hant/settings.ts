export default {
  theme: '主題',
  language: '語言',
  regard: '關於',
  logout: '登出',
  sections: {
    basic: '基礎設定',
    playback: '播放設定',
    application: '應用程式設定',
    network: '網路設定',
    system: '系統管理',
    donation: '捐贈支持',
    about: '關於'
  },
  basic: {
    themeMode: '主題模式',
    themeModeDesc: '切換日間/夜間主題',
    autoTheme: '跟隨系統',
    manualTheme: '手動切換',
    language: '語言設定',
    languageDesc: '切換顯示語言',
    tokenManagement: 'Cookie管理',
    tokenManagementDesc: '管理網易雲音樂登入Cookie',
    tokenStatus: '目前Cookie狀態',
    tokenSet: '已設定',
    tokenNotSet: '未設定',
    setToken: '設定Cookie',
    setCookie: '設定Cookie',
    modifyToken: '修改Cookie',
    clearToken: '清除Cookie',
    font: '字體設定',
    fontDesc: '選擇字體，優先使用排在前面的字體',
    fontScope: {
      global: '全域',
      lyric: '僅歌詞'
    },
    animation: '動畫速度',
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
    },
    gpuAcceleration: 'GPU加速',
    gpuAccelerationDesc: '啟用或禁用硬體加速，可以提高渲染性能，但可能會增加GPU負載',
    gpuAccelerationRestart: '更改GPU加速設定需要重啟應用後生效',
    gpuAccelerationChangeSuccess: 'GPU加速設定已更新，重啟應用後生效',
    gpuAccelerationChangeError: 'GPU加速設定更新失敗',
    tabletMode: '平板模式',
    tabletModeDesc: '啟用後將在移動設備上使用PC樣式界面，適合平板等大屏設備'
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
    musicUnblockEnable: '啟用音樂解析',
    musicUnblockEnableDesc: '開啟後將嘗試解析無法播放的音樂',
    configureMusicSources: '設定音源',
    selectedMusicSources: '已選音源：',
    noMusicSources: '未選擇音源',
    gdmusicInfo: 'GD音樂台可自動解析多個平台音源，自動選擇最佳結果',
    autoPlay: '自動播放',
    autoPlayDesc: '重新開啟應用程式時是否自動繼續播放',
    audioDevice: '音訊輸出裝置',
    audioDeviceDesc: '選擇音訊輸出裝置，如揚聲器、耳機或藍牙裝置',
    testAudio: '測試',
    selectAudioDevice: '選擇輸出裝置',
    showStatusBar: '是否顯示狀態列控制功能',
    showStatusBarContent: '可以在您的mac狀態列顯示音樂控制功能(重啟後生效)',
    fallbackParser: '備用解析服務 (GD音樂台)',
    fallbackParserDesc: '當勾選「GD音樂台」且常規音源無法播放時，將使用此服務嘗試解析。',
    parserGD: 'GD 音樂台 (內建)',
    parserCustom: '自訂 API',

    // 音源標籤
    sourceLabels: {
      migu: '咪咕音樂',
      kugou: '酷狗音樂',
      pyncmd: '網易雲（內建）',
      bilibili: 'Bilibili',
      gdmusic: 'GD音樂台',
      custom: '自訂 API'
    },

    customApi: {
      sectionTitle: '自訂 API 設定',
      importConfig: '匯入 JSON 設定',
      currentSource: '目前音源',
      notImported: '尚未匯入自訂音源。',
      importSuccess: '成功匯入音源：{name}',
      importFailed: '匯入失敗：{message}',
      enableHint: '請先匯入 JSON 設定檔才能啟用',
      status: {
        imported: '已匯入自訂音源',
        notImported: '未匯入'
      }
    },
    lxMusic: {
      tabs: {
        sources: '音源選擇',
        lxMusic: '落雪音源',
        customApi: '自訂API'
      },
      scripts: {
        title: '已匯入的音源腳本',
        importLocal: '本機匯入',
        importOnline: '線上匯入',
        urlPlaceholder: '輸入落雪音源腳本 URL',
        importBtn: '匯入',
        empty: '暫無已匯入的落雪音源',
        notConfigured: '未設定 (請至落雪音源分頁設定)',
        importHint: '匯入相容的自訂 API 外掛以擴充音源',
        noScriptWarning: '請先匯入落雪音源腳本',
        noSelectionWarning: '請先選擇一個落雪音源',
        notFound: '音源不存在',
        switched: '已切換到音源: {name}',
        deleted: '已刪除音源: {name}',
        enterUrl: '請輸入腳本 URL',
        invalidUrl: '無效的 URL 格式',
        invalidScript: '無效的落雪音源腳本，未找到 globalThis.lx 相關程式碼',
        nameRequired: '名稱不能為空',
        renameSuccess: '重新命名成功'
      }
    }
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
  about: {
    version: '版本',
    checkUpdate: '檢查更新',
    checking: '檢查中...',
    latest: '目前已是最新版本',
    hasUpdate: '發現新版本',
    gotoUpdate: '前往更新',
    gotoGithub: '前往 Github',
    author: '作者',
    authorDesc: 'algerkong 點個star🌟呗',
    messages: {
      checkError: '檢查更新失敗，請稍後重試'
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
      background: '背景',
      mobile: '行動端'
    },
    pureMode: '純淨模式',
    hideCover: '隱藏封面',
    centerDisplay: '置中顯示',
    showTranslation: '顯示翻譯',
    hideLyrics: '隱藏歌詞',
    hidePlayBar: '隱藏播放列',
    hideMiniPlayBar: '隱藏迷你播放列',
    showMiniPlayBar: '顯示迷你播放列',
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
    fontWeight: '字體粗細',
    fontWeightMarks: {
      thin: '細',
      normal: '常規',
      bold: '粗'
    },
    letterSpacing: '字間距',
    letterSpacingMarks: {
      compact: '緊湊',
      default: '預設',
      loose: '寬鬆'
    },
    lineHeight: '行高',
    lineHeightMarks: {
      compact: '緊湊',
      default: '預設',
      loose: '寬鬆'
    },
    contentWidth: '內容區寬度',
    mobileLayout: '行動端佈局',
    layoutOptions: {
      default: '預設',
      ios: 'iOS 風格',
      android: 'Android 風格'
    },
    mobileCoverStyle: '封面風格',
    coverOptions: {
      record: '唱片',
      square: '方形',
      full: '全螢幕'
    },
    lyricLines: '歌詞行數',
    mobileUnavailable: '此設定僅在行動端可用',
    // 背景設定
    background: {
      useCustomBackground: '使用自訂背景',
      backgroundMode: '背景模式',
      modeOptions: {
        solid: '純色',
        gradient: '漸層',
        image: '圖片',
        css: 'CSS'
      },
      solidColor: '選擇顏色',
      presetColors: '預設顏色',
      customColor: '自訂顏色',
      gradientEditor: '漸層編輯器',
      gradientColors: '漸層顏色',
      gradientDirection: '漸層方向',
      directionOptions: {
        toBottom: '上到下',
        toRight: '左到右',
        toBottomRight: '左上到右下',
        angle45: '45度',
        toTop: '下到上',
        toLeft: '右到左'
      },
      addColor: '新增顏色',
      removeColor: '移除顏色',
      imageUpload: '上傳圖片',
      imagePreview: '圖片預覽',
      clearImage: '清除圖片',
      imageBlur: '模糊度',
      imageBrightness: '明暗度',
      customCss: '自訂 CSS 樣式',
      customCssPlaceholder: '輸入 CSS 樣式，如: background: linear-gradient(...)',
      customCssHelp: '支援任意 CSS background 屬性',
      reset: '重設為預設',
      fileSizeLimit: '圖片大小限制: 20MB',
      invalidImageFormat: '無效的圖片格式',
      imageTooLarge: '圖片過大，請選擇小於 20MB 的圖片'
    }
  },
  themeColor: {
    title: '歌詞主題色',
    presetColors: '預設顏色',
    customColor: '自訂顏色',
    preview: '預覽效果',
    previewText: '歌詞效果',
    colorNames: {
      'spotify-green': 'Spotify 綠',
      'apple-blue': '蘋果藍',
      'youtube-red': 'YouTube 紅',
      orange: '活力橙',
      purple: '神秘紫',
      pink: '櫻花粉'
    },
    tooltips: {
      openColorPicker: '開啟色板',
      closeColorPicker: '關閉色板'
    },
    placeholder: '#1db954'
  },
  translationEngine: '歌詞翻譯引擎',
  translationEngineOptions: {
    none: '關閉',
    opencc: 'OpenCC 繁化'
  },
  shortcutSettings: {
    title: '快捷鍵設定',
    shortcut: '快捷鍵',
    shortcutDesc: '自訂快捷鍵',
    shortcutConflict: '快捷鍵衝突',
    inputPlaceholder: '點擊輸入快捷鍵',
    resetShortcuts: '恢復預設',
    disableAll: '全部停用',
    enableAll: '全部啟用',
    togglePlay: '播放/暫停',
    prevPlay: '上一首',
    nextPlay: '下一首',
    volumeUp: '增加音量',
    volumeDown: '減少音量',
    toggleFavorite: '收藏/取消收藏',
    toggleWindow: '顯示/隱藏視窗',
    scopeGlobal: '全域',
    scopeApp: '應用程式內',
    enabled: '已啟用',
    disabled: '已停用',
    messages: {
      resetSuccess: '已恢復預設快捷鍵，請記得儲存',
      conflict: '存在快捷鍵衝突，請重新設定',
      saveSuccess: '快捷鍵設定已儲存',
      saveError: '快捷鍵儲存失敗，請重試',
      cancelEdit: '已取消修改',
      disableAll: '已停用所有快捷鍵，請記得儲存',
      enableAll: '已啟用所有快捷鍵，請記得儲存'
    }
  },
  remoteControl: {
    title: '遠端控制',
    enable: '啟用遠端控制',
    port: '服務連接埠',
    allowedIps: '允許的 IP 位址',
    addIp: '新增 IP',
    emptyListHint: '空白清單表示允許所有 IP 存取',
    saveSuccess: '遠端控制設定已儲存',
    accessInfo: '遠端控制存取位址：'
  },
  cookie: {
    title: 'Cookie設定',
    description: '請輸入網易雲音樂的Cookie：',
    placeholder: '請貼上完整的Cookie...',
    help: {
      format: 'Cookie通常以 "MUSIC_U=" 開頭',
      source: '可以從瀏覽器開發者工具的網路請求中取得',
      storage: 'Cookie設定後將自動儲存到本機儲存'
    },
    action: {
      save: '儲存Cookie',
      paste: '貼上',
      clear: '清空'
    },
    validation: {
      required: '請輸入Cookie',
      format: 'Cookie格式可能不正確，請檢查是否包含MUSIC_U'
    },
    message: {
      saveSuccess: 'Cookie儲存成功',
      saveError: 'Cookie儲存失敗',
      pasteSuccess: '貼上成功',
      pasteError: '貼上失敗，請手動複製'
    },
    info: {
      length: '目前長度：{length} 字元'
    }
  }
};
