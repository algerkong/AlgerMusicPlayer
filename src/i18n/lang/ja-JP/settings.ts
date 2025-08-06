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
    regard: 'について'
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
    }
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
    showStatusBar: 'ステータスバーコントロール機能を表示するかどうか',
    showStatusBarContent: 'Macのステータスバーに音楽コントロール機能を表示できます（再起動後に有効）'
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
    unlimitedDownloadDesc: '有効にすると音楽を無制限でダウンロードします（ダウンロード失敗の可能性があります）。デフォルトは300曲制限',
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
    realIPDesc: '制限により、このプロジェクトは海外での使用が制限されます。realIPパラメータを使用して国内IPを渡すことで解決できます',
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
      clearSuccess: 'クリア成功。一部の設定は再起動後に有効になります'
    }
  },
  about: {
    version: 'バージョン',
    checkUpdate: '更新を確認',
    checking: '確認中...',
    latest: '現在最新バージョンです',
    hasUpdate: '新しいバージョンが見つかりました',
    gotoUpdate: '更新へ',
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
    mobileUnavailable: 'この設定はモバイルでのみ利用可能です'
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
    shortcutConflict: 'ショートカットの競合',
    inputPlaceholder: 'クリックしてショートカットを入力',
    resetShortcuts: 'デフォルトに戻す',
    disableAll: 'すべて無効',
    enableAll: 'すべて有効',
    togglePlay: '再生/一時停止',
    prevPlay: '前の曲',
    nextPlay: '次の曲',
    volumeUp: '音量を上げる',
    volumeDown: '音量を下げる',
    toggleFavorite: 'お気に入り/お気に入り解除',
    toggleWindow: 'ウィンドウ表示/非表示',
    scopeGlobal: 'グローバル',
    scopeApp: 'アプリ内',
    enabled: '有効',
    disabled: '無効',
    messages: {
      resetSuccess: 'デフォルトのショートカットに戻しました。保存を忘れずに',
      conflict: '競合するショートカットがあります。再設定してください',
      saveSuccess: 'ショートカット設定を保存しました',
      saveError: 'ショートカットの保存に失敗しました。再試行してください',
      cancelEdit: '変更をキャンセルしました',
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