export default {
  theme: 'テーマ',
  language: '言語',
  regard: 'について',
  logout: 'ログアウト',
  sections: {
    basic: '基本設定',
    playback: '再生設定',
    application: 'アプリケーション設定',
    network: 'ネットワーク設定',
    system: 'システム管理',
    donation: '寄付サポート',
    about: 'について'
  },
  basic: {
    themeMode: 'テーマモード',
    themeModeDesc: 'ライト/ダークテーマの切り替え',
    autoTheme: 'システムに従う',
    manualTheme: '手動切り替え',
    language: '言語設定',
    languageDesc: '表示言語を切り替え',
    tokenManagement: 'Cookie管理',
    tokenManagementDesc: 'NetEase Cloud MusicログインCookieを管理',
    tokenStatus: '現在のCookieステータス',
    tokenSet: '設定済み',
    tokenNotSet: '未設定',
    setToken: 'Cookieを設定',
    modifyToken: 'Cookieを変更',
    clearToken: 'Cookieをクリア',
    font: 'フォント設定',
    fontDesc: 'フォントを選択します。前に配置されたフォントが優先されます',
    fontScope: {
      global: 'グローバル',
      lyric: '歌詞のみ'
    },
    animation: 'アニメーション速度',
    animationDesc: 'アニメーションを有効にするかどうか',
    animationSpeed: {
      slow: '非常に遅い',
      normal: '通常',
      fast: '非常に速い'
    },
    fontPreview: {
      title: 'フォントプレビュー',
      chinese: '中国語',
      english: 'English',
      japanese: '日本語',
      korean: '韓国語',
      chineseText: '静夜思 床前明月光 疑是地上霜',
      englishText: 'The quick brown fox jumps over the lazy dog',
      japaneseText: 'あいうえお かきくけこ さしすせそ',
      koreanText: '가나다라마 바사아자차 카타파하'
    },
    gpuAcceleration: 'GPUアクセラレーション',
    gpuAccelerationDesc:
      'ハードウェアアクセラレーションを有効または無効にします。レンダリングパフォーマンスを向上させますが、GPU負荷が増える可能性があります',
    gpuAccelerationRestart: 'GPUアクセラレーション設定の変更はアプリの再起動後に有効になります',
    gpuAccelerationChangeSuccess:
      'GPUアクセラレーション設定を更新しました。アプリの再起動後に有効になります',
    gpuAccelerationChangeError: 'GPUアクセラレーション設定の更新に失敗しました',
    tabletMode: 'タブレットモード',
    tabletModeDesc:
      'タブレットモードを有効にすると、モバイルデバイスでPCスタイルのインターフェースを使用できます'
  },
  playback: {
    quality: '音質設定',
    qualityDesc: '音楽再生の音質を選択（NetEase Cloud VIP）',
    qualityOptions: {
      standard: '標準',
      higher: '高音質',
      exhigh: '超高音質',
      lossless: 'ロスレス',
      hires: 'Hi-Res',
      jyeffect: 'HD サラウンド',
      sky: 'イマーシブサラウンド',
      dolby: 'Dolby Atmos',
      jymaster: '超高解像度マスター'
    },
    musicSources: '音源設定',
    musicSourcesDesc: '音楽解析に使用する音源プラットフォームを選択',
    musicSourcesWarning: '少なくとも1つの音源プラットフォームを選択する必要があります',
    musicUnblockEnable: '音楽解析を有効にする',
    musicUnblockEnableDesc: '有効にすると、再生できない音楽の解析を試みます',
    configureMusicSources: '音源を設定',
    selectedMusicSources: '選択された音源：',
    noMusicSources: '音源が選択されていません',
    gdmusicInfo: 'GD音楽台は複数のプラットフォーム音源を自動解析し、最適な結果を自動選択できます',
    autoPlay: '自動再生',
    autoPlayDesc: 'アプリを再起動した際に自動的に再生を継続するかどうか',
    audioDevice: 'オーディオ出力デバイス',
    audioDeviceDesc: 'スピーカー、ヘッドホン、Bluetoothデバイスなどの出力先を選択',
    testAudio: 'テスト',
    selectAudioDevice: '出力デバイスを選択',
    showStatusBar: 'ステータスバーコントロール機能を表示するかどうか',
    showStatusBarContent:
      'Macのステータスバーに音楽コントロール機能を表示できます（再起動後に有効）',
    fallbackParser: '代替解析サービス (GD音楽台)',
    fallbackParserDesc:
      '「GD音楽台」にチェックが入っていて、通常の音源で再生できない場合、このサービスが使用されます。',
    parserGD: 'GD 音楽台 (内蔵)',
    parserCustom: 'カスタム API',
    sourceLabels: {
      migu: 'Migu',
      kugou: 'Kugou',
      kuwo: 'Kuwo',
      pyncmd: 'NetEase (内蔵)',
      qq: 'QQ Music',
      joox: 'JOOX',
      bilibili: 'Bilibili',
      gdmusic: 'GD 音楽台',
      lxMusic: 'LX Music',
      custom: 'カスタム API'
    },
    customApi: {
      sectionTitle: 'カスタム API 設定',
      enableHint:
        'カスタム API を有効にするには、まずカスタム API をインポートする必要があります。',
      importConfig: 'JSON設定をインポート',
      currentSource: '現在の音源',
      notImported: 'カスタム音源はまだインポートされていません。',
      importSuccess: '音源のインポートに成功しました: {name}',
      importFailed: 'インポートに失敗しました: {message}',
      status: {
        imported: 'カスタム音源インポート済み',
        notImported: '未インポート'
      }
    },
    lxMusic: {
      tabs: {
        sources: '音源選択',
        lxMusic: '落雪音源',
        customApi: 'カスタムAPI'
      },
      scripts: {
        title: 'インポート済みのスクリプト',
        importLocal: 'ローカルインポート',
        importOnline: 'オンラインインポート',
        urlPlaceholder: '落雪音源スクリプトのURLを入力',
        importBtn: 'インポート',
        empty: 'インポート済みの落雪音源はありません',
        notConfigured: '未設定（落雪音源タブで設定してください）',
        importHint: '互換性のあるカスタムAPIプラグインをインポートして音源を拡張します',
        noScriptWarning: '先に落雪音源スクリプトをインポートしてください',
        noSelectionWarning: '先に落雪音源を選択してください',
        notFound: '音源が存在しません',
        switched: '音源を切り替えました: {name}',
        deleted: '音源を削除しました: {name}',
        enterUrl: 'スクリプトURLを入力してください',
        invalidUrl: '無効なURL形式',
        invalidScript: '無効な落雪音源スクリプトです（globalThis.lxが見つかりません）',
        nameRequired: '名前を空にすることはできません',
        renameSuccess: '名前を変更しました'
      }
    }
  },
  application: {
    closeAction: '閉じる動作',
    closeActionDesc: 'ウィンドウを閉じる際の動作を選択',
    closeOptions: {
      ask: '毎回確認',
      minimize: 'トレイに最小化',
      close: '直接終了'
    },
    shortcut: 'ショートカット設定',
    shortcutDesc: 'グローバルショートカットをカスタマイズ',
    download: 'ダウンロード管理',
    downloadDesc: 'ダウンロードリストボタンを常に表示するかどうか',
    unlimitedDownload: '無制限ダウンロード',
    unlimitedDownloadDesc:
      '有効にすると音楽を無制限でダウンロードします（ダウンロード失敗の可能性があります）。デフォルトは300曲制限',
    downloadPath: 'ダウンロードディレクトリ',
    downloadPathDesc: '音楽ファイルのダウンロード場所を選択',
    remoteControl: 'リモートコントロール',
    remoteControlDesc: 'リモートコントロール機能を設定'
  },
  network: {
    apiPort: '音楽APIポート',
    apiPortDesc: '変更後はアプリの再起動が必要です',
    proxy: 'プロキシ設定',
    proxyDesc: '音楽にアクセスできない場合はプロキシを有効にできます',
    proxyHost: 'プロキシアドレス',
    proxyHostPlaceholder: 'プロキシアドレスを入力してください',
    proxyPort: 'プロキシポート',
    proxyPortPlaceholder: 'プロキシポートを入力してください',
    realIP: 'realIP設定',
    realIPDesc:
      '制限により、このプロジェクトは海外での使用が制限されます。realIPパラメータを使用して国内IPを渡すことで解決できます',
    messages: {
      proxySuccess: 'プロキシ設定を保存しました。アプリ再起動後に有効になります',
      proxyError: '入力が正しいかどうか確認してください',
      realIPSuccess: '実IPアドレス設定を保存しました',
      realIPError: '有効なIPアドレスを入力してください'
    }
  },
  system: {
    cache: 'キャッシュ管理',
    cacheDesc: 'キャッシュをクリア',
    diskCache: 'ディスクキャッシュ',
    diskCacheDesc: '再生した音楽と歌詞をローカルディスクへ保存し、再生速度を向上します',
    cacheDirectory: 'キャッシュディレクトリ',
    cacheDirectoryDesc: '音楽・歌詞キャッシュの保存先を指定',
    selectDirectory: 'ディレクトリ選択',
    openDirectory: 'ディレクトリを開く',
    cacheMaxSize: 'キャッシュ上限',
    cacheMaxSizeDesc: '上限に達すると古いキャッシュを自動削除します',
    cleanupPolicy: 'クリーンアップポリシー',
    cleanupPolicyDesc: 'キャッシュ上限到達時の自動削除ルール',
    cleanupPolicyOptions: {
      lru: '最近未使用優先',
      fifo: '先入れ先出し'
    },
    cacheStatus: 'キャッシュ状態',
    cacheStatusDesc: '使用量 {used} / 上限 {limit}',
    cacheStatusDetail: '音楽 {musicCount} 曲、歌詞 {lyricCount} 曲',
    manageDiskCache: '手動キャッシュクリア',
    manageDiskCacheDesc: '種類ごとにキャッシュを削除',
    clearMusicCache: '音楽キャッシュを削除',
    clearLyricCache: '歌詞キャッシュを削除',
    clearAllCache: 'すべて削除',
    switchDirectoryMigrateTitle: '既存キャッシュを検出',
    switchDirectoryMigrateContent: '旧ディレクトリのキャッシュを新ディレクトリへ移行しますか？',
    switchDirectoryMigrateConfirm: '移行する',
    switchDirectoryDestroyTitle: '旧キャッシュを削除',
    switchDirectoryDestroyContent: '移行しない場合、旧ディレクトリのキャッシュを削除しますか？',
    switchDirectoryDestroyConfirm: '削除する',
    switchDirectoryKeepOld: '旧キャッシュを保持',
    cacheClearTitle: 'クリアするキャッシュタイプを選択してください：',
    cacheTypes: {
      history: {
        label: '再生履歴',
        description: '再生した楽曲の記録をクリア'
      },
      favorite: {
        label: 'お気に入り記録',
        description: 'ローカルのお気に入り楽曲記録をクリア（クラウドのお気に入りには影響しません）'
      },
      user: {
        label: 'ユーザーデータ',
        description: 'ログイン情報とユーザー関連データをクリア'
      },
      settings: {
        label: 'アプリ設定',
        description: 'アプリのすべてのカスタム設定をクリア'
      },
      downloads: {
        label: 'ダウンロード記録',
        description: 'ダウンロード履歴をクリア（ダウンロード済みファイルは削除されません）'
      },
      resources: {
        label: '音楽リソース',
        description: '読み込み済みの音楽ファイル、歌詞などのリソースキャッシュをクリア'
      },
      lyrics: {
        label: '歌詞リソース',
        description: '読み込み済みの歌詞リソースキャッシュをクリア'
      }
    },
    restart: '再起動',
    restartDesc: 'アプリを再起動',
    messages: {
      clearSuccess: 'クリア成功。一部の設定は再起動後に有効になります',
      diskCacheClearSuccess: 'ディスクキャッシュを削除しました',
      diskCacheClearFailed: 'ディスクキャッシュの削除に失敗しました',
      diskCacheStatsLoadFailed: 'キャッシュ状態の取得に失敗しました',
      switchDirectorySuccess: 'キャッシュディレクトリを切り替えました（旧キャッシュは保持）',
      switchDirectoryFailed: 'キャッシュディレクトリの切り替えに失敗しました',
      switchDirectoryMigrated: 'キャッシュディレクトリを切り替え、{count} 件を移行しました',
      switchDirectoryDestroyed:
        'キャッシュディレクトリを切り替え、旧キャッシュ {count} 件を削除しました'
    }
  },
  about: {
    version: 'バージョン',
    checkUpdate: '更新を確認',
    checking: '確認中...',
    latest: '現在最新バージョンです',
    hasUpdate: '新しいバージョンが見つかりました',
    gotoUpdate: '更新へ',
    manualUpdate: '手動更新',
    gotoGithub: 'Githubへ',
    author: '作者',
    authorDesc: 'algerkong スターを付けてください🌟',
    messages: {
      checkError: '更新確認に失敗しました。後でもう一度お試しください'
    }
  },
  validation: {
    selectProxyProtocol: 'プロキシプロトコルを選択してください',
    proxyHost: 'プロキシアドレスを入力してください',
    portNumber: '有効なポート番号を入力してください（1-65535）'
  },
  lyricSettings: {
    title: '歌詞設定',
    tabs: {
      display: '表示',
      interface: 'インターフェース',
      typography: 'テキスト',
      background: '背景',
      mobile: 'モバイル'
    },
    pureMode: 'ピュアモード',
    hideCover: 'カバーを非表示',
    centerDisplay: '中央表示',
    showTranslation: '翻訳を表示',
    hideLyrics: '歌詞を非表示',
    hidePlayBar: '再生バーを非表示',
    hideMiniPlayBar: 'ミニ再生バーを非表示',
    showMiniPlayBar: 'ミニ再生バーを表示',
    backgroundTheme: '背景テーマ',
    themeOptions: {
      default: 'デフォルト',
      light: 'ライト',
      dark: 'ダーク'
    },
    fontSize: 'フォントサイズ',
    fontSizeMarks: {
      small: '小',
      medium: '中',
      large: '大'
    },
    fontWeight: 'フォントの太さ',
    fontWeightMarks: {
      thin: '細い',
      normal: '通常',
      bold: '太い'
    },
    letterSpacing: '文字間隔',
    letterSpacingMarks: {
      compact: 'コンパクト',
      default: 'デフォルト',
      loose: 'ゆったり'
    },
    lineHeight: '行の高さ',
    lineHeightMarks: {
      compact: 'コンパクト',
      default: 'デフォルト',
      loose: 'ゆったり'
    },
    contentWidth: 'コンテンツ幅',
    mobileLayout: 'モバイルレイアウト',
    layoutOptions: {
      default: 'デフォルト',
      ios: 'iOSスタイル',
      android: 'Androidスタイル'
    },
    mobileCoverStyle: 'カバースタイル',
    coverOptions: {
      record: 'レコード',
      square: '正方形',
      full: 'フルスクリーン'
    },
    lyricLines: '歌詞行数',
    mobileUnavailable: 'この設定はモバイルでのみ利用可能です',
    // 背景設定
    background: {
      useCustomBackground: 'カスタム背景を使用',
      backgroundMode: '背景モード',
      modeOptions: {
        solid: '単色',
        gradient: 'グラデーション',
        image: '画像',
        css: 'CSS'
      },
      solidColor: '色を選択',
      presetColors: 'プリセットカラー',
      customColor: 'カスタムカラー',
      gradientEditor: 'グラデーションエディター',
      gradientColors: 'グラデーションカラー',
      gradientDirection: 'グラデーション方向',
      directionOptions: {
        toBottom: '上から下',
        toRight: '左から右',
        toBottomRight: '左上から右下',
        angle45: '45度',
        toTop: '下から上',
        toLeft: '右から左'
      },
      addColor: '色を追加',
      removeColor: '色を削除',
      imageUpload: '画像をアップロード',
      imagePreview: '画像プレビュー',
      clearImage: '画像をクリア',
      imageBlur: 'ぼかし',
      imageBrightness: '明るさ',
      customCss: 'カスタム CSS スタイル',
      customCssPlaceholder: 'CSSスタイルを入力、例: background: linear-gradient(...)',
      customCssHelp: '任意のCSS background プロパティをサポート',
      reset: 'デフォルトにリセット',
      fileSizeLimit: '画像サイズ制限: 20MB',
      invalidImageFormat: '無効な画像形式',
      imageTooLarge: '画像が大きすぎます。20MB未満の画像を選択してください'
    }
  },
  translationEngine: '歌詞翻訳エンジン',
  translationEngineOptions: {
    none: 'オフ',
    opencc: 'OpenCC 繁体字化'
  },
  themeColor: {
    title: '歌詞テーマカラー',
    presetColors: 'プリセットカラー',
    customColor: 'カスタムカラー',
    preview: 'プレビュー効果',
    previewText: '歌詞効果',
    colorNames: {
      'spotify-green': 'Spotify グリーン',
      'apple-blue': 'Apple ブルー',
      'youtube-red': 'YouTube レッド',
      orange: 'バイタルオレンジ',
      purple: 'ミステリアスパープル',
      pink: 'サクラピンク'
    },
    tooltips: {
      openColorPicker: 'カラーパレットを開く',
      closeColorPicker: 'カラーパレットを閉じる'
    },
    placeholder: '#1db954'
  },
  shortcutSettings: {
    title: 'ショートカット設定',
    shortcut: 'ショートカット',
    shortcutDesc: 'ショートカットをカスタマイズ',
    summaryReady: 'ショートカット設定は保存可能です',
    summaryRecording: '新しいショートカットを記録中です',
    summaryBlocked: '競合または無効な項目を修正してください',
    platformHintMac: 'macOS では CommandOrControl は Cmd と表示されます',
    platformHintWindows: 'Windows では CommandOrControl は Ctrl と表示されます',
    platformHintLinux: 'Linux では CommandOrControl は Ctrl と表示されます',
    platformHintGeneric: 'CommandOrControl はOSに応じて自動変換されます',
    enabledCount: '有効',
    recordingTip: '欄をクリックしてキー入力。Escでキャンセル、Deleteで無効化',
    shortcutConflict: 'ショートカットの競合',
    inputPlaceholder: 'クリックしてショートカットを入力',
    clickToRecord: 'クリックしてキーを入力',
    recording: '記録中...',
    resetShortcuts: 'デフォルトに戻す',
    restoreSingle: '復元',
    disableAll: 'すべて無効',
    enableAll: 'すべて有効',
    groups: {
      playback: '再生操作',
      sound: '音量とお気に入り',
      window: 'ウィンドウ'
    },
    togglePlay: '再生/一時停止',
    togglePlayDesc: '現在の再生状態を切り替えます',
    prevPlay: '前の曲',
    prevPlayDesc: '前の曲に切り替えます',
    nextPlay: '次の曲',
    nextPlayDesc: '次の曲に切り替えます',
    volumeUp: '音量を上げる',
    volumeUpDesc: 'プレイヤー音量を上げます',
    volumeDown: '音量を下げる',
    volumeDownDesc: 'プレイヤー音量を下げます',
    toggleFavorite: 'お気に入り/お気に入り解除',
    toggleFavoriteDesc: '現在の曲をお気に入り切り替えします',
    toggleWindow: 'ウィンドウ表示/非表示',
    toggleWindowDesc: 'メインウィンドウを表示/非表示にします',
    scopeGlobal: 'グローバル',
    scopeApp: 'アプリ内',
    enabled: '有効',
    disabled: '無効',
    issueInvalid: '無効な組み合わせ',
    issueReserved: 'システム予約',
    registrationWarningTitle: '以下のショートカットは登録できませんでした',
    registrationOccupied: 'システムまたは他アプリで使用中',
    registrationInvalid: 'ショートカット形式が無効',
    messages: {
      resetSuccess: 'デフォルトのショートカットに戻しました。保存を忘れずに',
      conflict: '競合するショートカットがあります。再設定してください',
      saveSuccess: 'ショートカット設定を保存しました',
      saveError: 'ショートカットの保存に失敗しました。再試行してください',
      saveValidationError: 'ショートカット検証に失敗しました。内容を確認してください',
      partialRegistered: '保存しましたが、一部のグローバルショートカットは登録されませんでした',
      cancelEdit: '変更をキャンセルしました',
      clearToDisable: 'このショートカットを無効にしました',
      invalidShortcut: '無効なショートカットです。有効な組み合わせを入力してください',
      disableAll: 'すべてのショートカットを無効にしました。保存を忘れずに',
      enableAll: 'すべてのショートカットを有効にしました。保存を忘れずに'
    }
  },
  remoteControl: {
    title: 'リモートコントロール',
    enable: 'リモートコントロールを有効にする',
    port: 'サービスポート',
    allowedIps: '許可されたIPアドレス',
    addIp: 'IPを追加',
    emptyListHint: '空のリストはすべてのIPアクセスを許可することを意味します',
    saveSuccess: 'リモートコントロール設定を保存しました',
    accessInfo: 'リモートコントロールアクセスアドレス:'
  },
  cookie: {
    title: 'Cookie設定',
    description: 'NetEase Cloud MusicのCookieを入力してください：',
    placeholder: '完全なCookieを貼り付けてください...',
    help: {
      format: 'Cookieは通常「MUSIC_U=」で始まります',
      source: 'ブラウザの開発者ツールのネットワークリクエストから取得できます',
      storage: 'Cookie設定後、自動的にローカルストレージに保存されます'
    },
    action: {
      save: 'Cookieを保存',
      paste: '貼り付け',
      clear: 'クリア'
    },
    validation: {
      required: 'Cookieを入力してください',
      format: 'Cookie形式が正しくない可能性があります。MUSIC_Uが含まれているか確認してください'
    },
    message: {
      saveSuccess: 'Cookieの保存に成功しました',
      saveError: 'Cookieの保存に失敗しました',
      pasteSuccess: '貼り付けに成功しました',
      pasteError: '貼り付けに失敗しました。手動でコピーしてください'
    },
    info: {
      length: '現在の長さ：{length} 文字'
    }
  }
};
