export default {
  theme: 'Theme',
  language: 'Language',
  regard: 'About',
  logout: 'Logout',
  sections: {
    basic: 'General',
    playback: 'Playback',
    application: 'App',
    network: 'Network',
    system: 'Storage',
    about: 'About'
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
    },
    gpuAcceleration: 'GPU Acceleration',
    gpuAccelerationDesc:
      'Enable or disable hardware acceleration, can improve rendering performance but may increase GPU load',
    gpuAccelerationRestart:
      'Changing GPU acceleration settings requires application restart to take effect',
    gpuAccelerationChangeSuccess:
      'GPU acceleration settings updated, restart application to take effect',
    gpuAccelerationChangeError: 'Failed to update GPU acceleration settings',
    tabletMode: 'Tablet Mode',
    tabletModeDesc: 'Enabling tablet mode allows using PC-style interface on mobile devices'
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
    autoPlay: 'Auto Play',
    autoPlayDesc: 'Auto resume playback when reopening the app',
    audioDevice: 'Audio Output Device',
    audioDeviceDesc: 'Select audio output device such as speakers, headphones or Bluetooth devices',
    testAudio: 'Test',
    selectAudioDevice: 'Select output device',
    systemDefault: 'System default',
    showStatusBar: 'Show Status Bar',
    showStatusBarContent:
      'You can display the music control function in your mac status bar (effective after a restart)'

    // Source labels
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
    downloadPathDesc: 'Choose download location for music files'
  },
  network: {
    proxy: 'Proxy Settings',
    proxyDesc: 'Enable proxy when unable to access music',
    proxyHost: 'Proxy Host',
    proxyHostPlaceholder: 'Enter proxy host',
    proxyPort: 'Proxy Port',
    proxyPortPlaceholder: 'Enter proxy port',
    messages: {
      proxySuccess: 'Proxy settings saved, restart required to take effect',
      proxyError: 'Please check your input'
    }
  },
  system: {
    cache: 'Cache Management',
    cacheDesc: 'Clear cache',
    diskCache: 'Disk Cache',
    diskCacheDesc: 'Cache played music and lyrics on local disk to speed up repeated playback',
    cacheDirectory: 'Cache Directory',
    cacheDirectoryDesc: 'Custom directory for music and lyric cache files',
    selectDirectory: 'Select Directory',
    openDirectory: 'Open Directory',
    cacheMaxSize: 'Cache Size Limit',
    cacheMaxSizeDesc: 'Older cache items are cleaned automatically when limit is reached',
    cleanupPolicy: 'Cleanup Policy',
    cleanupPolicyDesc: 'Auto cleanup rule when cache reaches the size limit',
    cleanupPolicyOptions: {
      lru: 'Least Recently Used',
      fifo: 'First In, First Out'
    },
    cacheStatus: 'Cache Status',
    cacheStatusDesc: 'Used {used} / Limit {limit}',
    cacheStatusDetail: 'Music {musicCount}, Lyrics {lyricCount}',
    manageDiskCache: 'Manual Disk Cache Cleanup',
    manageDiskCacheDesc: 'Clean cache by category',
    clearMusicCache: 'Clear Music Cache',
    clearLyricCache: 'Clear Lyric Cache',
    clearAllCache: 'Clear All Cache',
    switchDirectoryMigrateTitle: 'Existing Cache Detected',
    switchDirectoryMigrateContent: 'Do you want to migrate old cache files to the new directory?',
    switchDirectoryMigrateConfirm: 'Migrate',
    switchDirectoryDestroyTitle: 'Destroy Old Cache',
    switchDirectoryDestroyContent:
      'If you do not migrate, do you want to destroy old cache files in the previous directory?',
    switchDirectoryDestroyConfirm: 'Destroy',
    switchDirectoryKeepOld: 'Keep Old Cache',
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
      clearSuccess: 'Cache cleared successfully, some settings will take effect after restart',
      diskCacheClearSuccess: 'Disk cache cleaned',
      diskCacheClearFailed: 'Failed to clean disk cache',
      diskCacheStatsLoadFailed: 'Failed to load cache status',
      switchDirectorySuccess: 'Cache directory switched, old cache is kept',
      switchDirectoryFailed: 'Failed to switch cache directory',
      switchDirectoryMigrated: 'Cache directory switched, migrated {count} cache files',
      switchDirectoryDestroyed: 'Cache directory switched, destroyed {count} old cache files'
    }
  },
  about: {
    version: 'Version',
    checkUpdate: 'Check for Updates',
    checking: 'Checking...',
    latest: 'Already latest version',
    hasUpdate: 'New version available',
    gotoUpdate: 'Go to Update',
    manualUpdate: 'Manual Update',
    gotoGithub: 'Go to Github',
    author: 'Author',
    authorDesc: 'LuoYe17 — give a star 🌟',
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
      background: 'Background',
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
    fontWeight: 'Font Weight',
    fontWeightMarks: {
      thin: 'Thin',
      normal: 'Normal',
      bold: 'Bold'
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
    contentWidth: 'Content Width',
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
    mobileUnavailable: 'This setting is only available on mobile devices',
    // Background settings
    background: {
      useCustomBackground: 'Use Custom Background',
      backgroundMode: 'Background Mode',
      modeOptions: {
        solid: 'Solid',
        gradient: 'Gradient',
        image: 'Image',
        css: 'CSS'
      },
      solidColor: 'Select Color',
      presetColors: 'Preset Colors',
      customColor: 'Custom Color',
      gradientEditor: 'Gradient Editor',
      gradientColors: 'Gradient Colors',
      gradientDirection: 'Gradient Direction',
      directionOptions: {
        toBottom: 'Top to Bottom',
        toRight: 'Left to Right',
        toBottomRight: 'Top Left to Bottom Right',
        angle45: '45 Degrees',
        toTop: 'Bottom to Top',
        toLeft: 'Right to Left'
      },
      addColor: 'Add Color',
      removeColor: 'Remove Color',
      imageUpload: 'Upload Image',
      imagePreview: 'Image Preview',
      clearImage: 'Clear Image',
      imageBlur: 'Blur',
      imageBrightness: 'Brightness',
      customCss: 'Custom CSS Style',
      customCssPlaceholder: 'Enter CSS style, e.g.: background: linear-gradient(...)',
      customCssHelp: 'Supports any CSS background property',
      reset: 'Reset to Default',
      fileSizeLimit: 'Image size limit: 20MB',
      invalidImageFormat: 'Invalid image format',
      imageTooLarge: 'Image too large, please select an image smaller than 20MB'
    }
  },
  translationEngine: 'Lyric Translation Engine',
  translationEngineOptions: {
    none: 'Off',
    opencc: 'OpenCC Traditionalize'
  },
  themeColor: {
    title: 'Lyric Theme Color',
    presetColors: 'Preset Colors',
    reset: 'Reset to Default',
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
    summaryReady: 'Shortcut configuration is ready to save',
    summaryRecording: 'Recording a new shortcut combination',
    summaryBlocked: 'Fix conflicts or invalid entries before saving',
    platformHintMac: 'On macOS, CommandOrControl is displayed as Cmd',
    platformHintWindows: 'On Windows, CommandOrControl is displayed as Ctrl',
    platformHintLinux: 'On Linux, CommandOrControl is displayed as Ctrl',
    platformHintGeneric: 'CommandOrControl is adapted per operating system',
    enabledCount: 'Enabled',
    recordingTip: 'Click a shortcut field, press combination. Esc cancels, Delete disables',
    shortcutConflict: 'Shortcut Conflict',
    inputPlaceholder: 'Click to input shortcut',
    clickToRecord: 'Click then press a shortcut',
    recording: 'Recording...',
    resetShortcuts: 'Reset',
    restoreSingle: 'Restore',
    disableAll: 'Disable All',
    enableAll: 'Enable All',
    groups: {
      playback: 'Playback',
      sound: 'Volume & Favorite',
      window: 'Window'
    },
    togglePlay: 'Play/Pause',
    togglePlayDesc: 'Toggle current playback state',
    prevPlay: 'Previous',
    prevPlayDesc: 'Play the previous track',
    nextPlay: 'Next',
    nextPlayDesc: 'Play the next track',
    volumeUp: 'Volume Up',
    volumeUpDesc: 'Increase player volume',
    volumeDown: 'Volume Down',
    volumeDownDesc: 'Decrease player volume',
    toggleFavorite: 'Favorite/Unfavorite',
    toggleFavoriteDesc: 'Favorite or unfavorite current track',
    toggleWindow: 'Show/Hide Window',
    toggleWindowDesc: 'Quickly show or hide the main window',
    scopeGlobal: 'Global',
    scopeApp: 'App Only',
    enabled: 'Enabled',
    disabled: 'Disabled',
    issueInvalid: 'Invalid combo',
    issueReserved: 'System reserved',
    registrationWarningTitle: 'These shortcuts could not be registered',
    registrationOccupied: 'Occupied by system or another app',
    registrationInvalid: 'Invalid shortcut format',
    messages: {
      resetSuccess: 'Shortcuts reset successfully, please save',
      conflict: 'Shortcut conflict, please reset',
      saveSuccess: 'Shortcuts saved successfully',
      saveError: 'Failed to save shortcuts',
      saveValidationError: 'Shortcut validation failed, please review and try again',
      partialRegistered: 'Saved, but some global shortcuts were not registered',
      cancelEdit: 'Edit cancelled',
      clearToDisable: 'Shortcut disabled',
      invalidShortcut: 'Invalid shortcut, please use a valid combination',
      disableAll: 'All shortcuts disabled, please save to apply',
      enableAll: 'All shortcuts enabled, please save to apply'
    }
  },
  musicSource: {
    title: 'Online source session',
    desc: 'Manage Qishui sessions via ly-music-source (cookie is for debug/migration only)',
    loggedIn: 'Signed in: {name}',
    loggedOut: 'Not signed in',
    importSession: 'Import cookie',
    logout: 'Sign out',
    logoutSuccess: 'Signed out of music source',
    logoutFailed: 'Failed to sign out',
    sessionTitle: 'Import Qishui cookie',
    sessionDesc: 'Paste the browser cookie string (at least sessionid). Do not share it.',
    sessionPlaceholder: 'sessionid=...; ...',
    sessionRequired: 'Please enter a cookie',
    sessionSaved: 'Session saved',
    sessionSaveFailed: 'Failed to save session',
    saveSession: 'Save'
  }
};
