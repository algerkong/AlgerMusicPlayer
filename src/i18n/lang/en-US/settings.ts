export default {
  theme: 'Theme',
  language: 'Language',
  regard: 'About',
  logout: 'Logout',
  sections: {
    basic: 'Basic Settings',
    playback: 'Playback Settings',
    application: 'Application Settings',
    network: 'Network Settings',
    system: 'System Management',
    donation: 'Donation',
    regard: 'About'
  },
  basic: {
    themeMode: 'Theme Mode',
    themeModeDesc: 'Switch between light/dark theme',
    autoTheme: 'Follow System',
    manualTheme: 'Manual Switch',
    language: 'Language Settings',
    languageDesc: 'Change display language',
    tokenManagement: 'Cookie Management',
    tokenManagementDesc: 'Manage NetEase Cloud Music login Cookie',
    tokenStatus: 'Current Cookie Status',
    tokenSet: 'Set',
    tokenNotSet: 'Not Set',
    setToken: 'Set Cookie',
    modifyToken: 'Modify Cookie',
    clearToken: 'Clear Cookie',
    font: 'Font Settings',
    fontDesc: 'Select fonts, prioritize fonts in order',
    fontScope: {
      global: 'Global',
      lyric: 'Lyrics Only'
    },
    animation: 'Animation Speed',
    animationDesc: 'Enable/disable animations',
    animationSpeed: {
      slow: 'Very Slow',
      normal: 'Normal',
      fast: 'Very Fast'
    },
    fontPreview: {
      title: 'Font Preview',
      chinese: 'Chinese',
      english: 'English',
      japanese: 'Japanese',
      korean: 'Korean',
      chineseText: '静夜思 床前明月光 疑是地上霜',
      englishText: 'The quick brown fox jumps over the lazy dog',
      japaneseText: 'あいうえお かきくけこ さしすせそ',
      koreanText: '가나다라마 바사아자차 카타파하'
    }
  },
  playback: {
    quality: 'Audio Quality',
    qualityDesc: 'Select music playback quality (VIP)',
    qualityOptions: {
      standard: 'Standard',
      higher: 'Higher',
      exhigh: 'Extreme',
      lossless: 'Lossless',
      hires: 'Hi-Res',
      jyeffect: 'HD Surround',
      sky: 'Immersive',
      dolby: 'Dolby Atmos',
      jymaster: 'Master'
    },
    musicSources: 'Music Sources',
    musicSourcesDesc: 'Select music sources for song resolution',
    musicSourcesWarning: 'At least one music source must be selected',
    musicUnblockEnable: 'Enable Music Unblocking',
    musicUnblockEnableDesc: 'When enabled, attempts to resolve unplayable songs',
    configureMusicSources: 'Configure Sources',
    selectedMusicSources: 'Selected sources:',
    noMusicSources: 'No sources selected',
    gdmusicInfo:
      'GD Music Station intelligently resolves music from multiple platforms automatically',
    autoPlay: 'Auto Play',
    autoPlayDesc: 'Auto resume playback when reopening the app',
    showStatusBar: 'Show Status Bar',
    showStatusBarContent:
      'You can display the music control function in your mac status bar (effective after a restart)'
  },
  application: {
    closeAction: 'Close Action',
    closeActionDesc: 'Choose action when closing window',
    closeOptions: {
      ask: 'Ask Every Time',
      minimize: 'Minimize to Tray',
      close: 'Exit Directly'
    },
    shortcut: 'Shortcut Settings',
    shortcutDesc: 'Customize global shortcuts',
    download: 'Download Management',
    downloadDesc: 'Always show download list button',
    unlimitedDownload: 'Unlimited Download',
    unlimitedDownloadDesc: 'Enable unlimited download mode for music , default limit 300 songs',
    downloadPath: 'Download Directory',
    downloadPathDesc: 'Choose download location for music files',
    remoteControl: 'Remote Control',
    remoteControlDesc: 'Set remote control function'
  },
  network: {
    apiPort: 'Music API Port',
    apiPortDesc: 'Restart required after modification',
    proxy: 'Proxy Settings',
    proxyDesc: 'Enable proxy when unable to access music',
    proxyHost: 'Proxy Host',
    proxyHostPlaceholder: 'Enter proxy host',
    proxyPort: 'Proxy Port',
    proxyPortPlaceholder: 'Enter proxy port',
    realIP: 'RealIP Settings',
    realIPDesc: 'Use realIP parameter with mainland China IP to resolve access restrictions abroad',
    messages: {
      proxySuccess: 'Proxy settings saved, restart required to take effect',
      proxyError: 'Please check your input',
      realIPSuccess: 'RealIP settings saved',
      realIPError: 'Please enter a valid IP address'
    }
  },
  system: {
    cache: 'Cache Management',
    cacheDesc: 'Clear cache',
    cacheClearTitle: 'Select cache types to clear:',
    cacheTypes: {
      history: {
        label: 'Play History',
        description: 'Clear played song records'
      },
      favorite: {
        label: 'Favorites',
        description: 'Clear local favorite songs (cloud favorites not affected)'
      },
      user: {
        label: 'User Data',
        description: 'Clear login info and user-related data'
      },
      settings: {
        label: 'App Settings',
        description: 'Clear all custom app settings'
      },
      downloads: {
        label: 'Download History',
        description: 'Clear download history (downloaded files not affected)'
      },
      resources: {
        label: 'Music Resources',
        description: 'Clear cached music files, lyrics and other resources'
      },
      lyrics: {
        label: 'Lyrics Resources',
        description: 'Clear cached lyrics resources'
      }
    },
    restart: 'Restart',
    restartDesc: 'Restart application',
    messages: {
      clearSuccess: 'Cache cleared successfully, some settings will take effect after restart'
    }
  },
  about: {
    version: 'Version',
    checkUpdate: 'Check for Updates',
    checking: 'Checking...',
    latest: 'Already latest version',
    hasUpdate: 'New version available',
    gotoUpdate: 'Go to Update',
    gotoGithub: 'Go to Github',
    author: 'Author',
    authorDesc: 'algerkong Give a star🌟',
    messages: {
      checkError: 'Failed to check for updates, please try again later'
    }
  },
  validation: {
    selectProxyProtocol: 'Please select proxy protocol',
    proxyHost: 'Please enter proxy host',
    portNumber: 'Please enter a valid port number (1-65535)'
  },
  lyricSettings: {
    title: 'Lyric Settings',
    tabs: {
      display: 'Display',
      interface: 'Interface',
      typography: 'Typography',
      mobile: 'Mobile'
    },
    pureMode: 'Pure Mode',
    hideCover: 'Hide Cover',
    centerDisplay: 'Center Display',
    showTranslation: 'Show Translation',
    hideLyrics: 'Hide Lyrics',
    hidePlayBar: 'Hide Play Bar',
    hideMiniPlayBar: 'Hide Mini Play Bar',
    showMiniPlayBar: 'Show Mini Play Bar',
    backgroundTheme: 'Background Theme',
    themeOptions: {
      default: 'Default',
      light: 'Light',
      dark: 'Dark'
    },
    fontSize: 'Font Size',
    fontSizeMarks: {
      small: 'Small',
      medium: 'Medium',
      large: 'Large'
    },
    letterSpacing: 'Letter Spacing',
    letterSpacingMarks: {
      compact: 'Compact',
      default: 'Default',
      loose: 'Loose'
    },
    lineHeight: 'Line Height',
    lineHeightMarks: {
      compact: 'Compact',
      default: 'Default',
      loose: 'Loose'
    },
    mobileLayout: 'Mobile Layout',
    layoutOptions: {
      default: 'Default',
      ios: 'iOS Style',
      android: 'Android Style'
    },
    mobileCoverStyle: 'Cover Style',
    coverOptions: {
      record: 'Record',
      square: 'Square',
      full: 'Full Screen'
    },
    lyricLines: 'Lyric Lines',
    mobileUnavailable: 'This setting is only available on mobile devices'
  },
  themeColor: {
    title: 'Lyric Theme Color',
    presetColors: 'Preset Colors',
    customColor: 'Custom Color',
    preview: 'Preview',
    previewText: 'Lyric Effect',
    colorNames: {
      'spotify-green': 'Spotify Green',
      'apple-blue': 'Apple Blue',
      'youtube-red': 'YouTube Red',
      orange: 'Vibrant Orange',
      purple: 'Mystic Purple',
      pink: 'Cherry Pink'
    },
    tooltips: {
      openColorPicker: 'Open Color Picker',
      closeColorPicker: 'Close Color Picker'
    },
    placeholder: '#1db954'
  },
  shortcutSettings: {
    title: 'Shortcut Settings',
    shortcut: 'Shortcut',
    shortcutDesc: 'Customize global shortcuts',
    shortcutConflict: 'Shortcut Conflict',
    inputPlaceholder: 'Click to input shortcut',
    resetShortcuts: 'Reset',
    disableAll: 'Disable All',
    enableAll: 'Enable All',
    togglePlay: 'Play/Pause',
    prevPlay: 'Previous',
    nextPlay: 'Next',
    volumeUp: 'Volume Up',
    volumeDown: 'Volume Down',
    toggleFavorite: 'Favorite/Unfavorite',
    toggleWindow: 'Show/Hide Window',
    scopeGlobal: 'Global',
    scopeApp: 'App Only',
    enabled: 'Enabled',
    disabled: 'Disabled',
    messages: {
      resetSuccess: 'Shortcuts reset successfully, please save',
      conflict: 'Shortcut conflict, please reset',
      saveSuccess: 'Shortcuts saved successfully',
      saveError: 'Failed to save shortcuts',
      cancelEdit: 'Edit cancelled',
      disableAll: 'All shortcuts disabled, please save to apply',
      enableAll: 'All shortcuts enabled, please save to apply'
    }
  },
  remoteControl: {
    title: 'Remote Control',
    enable: 'Enable Remote Control',
    port: 'Port',
    allowedIps: 'Allowed IPs',
    addIp: 'Add IP',
    emptyListHint: 'Empty list means allow all IPs',
    saveSuccess: 'Remote control settings saved',
    accessInfo: 'Remote control access address:'
  },
  cookie: {
    title: 'Cookie Settings',
    description: 'Please enter NetEase Cloud Music Cookie:',
    placeholder: 'Please paste the complete Cookie...',
    help: {
      format: 'Cookie usually starts with "MUSIC_U="',
      source: 'Can be obtained from browser developer tools network requests',
      storage: 'Cookie will be automatically saved to local storage after setting'
    },
    action: {
      save: 'Save Cookie',
      paste: 'Paste',
      clear: 'Clear'
    },
    validation: {
      required: 'Please enter Cookie',
      format: 'Cookie format may be incorrect, please check if it contains MUSIC_U'
    },
    message: {
      saveSuccess: 'Cookie saved successfully',
      saveError: 'Failed to save Cookie',
      pasteSuccess: 'Pasted successfully',
      pasteError: 'Paste failed, please copy manually'
    },
    info: {
      length: 'Current length: {length} characters'
    }
  }
};
