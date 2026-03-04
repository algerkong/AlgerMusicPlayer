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
    audioDevice: 'Audio Output Device',
    audioDeviceDesc: 'Select audio output device such as speakers, headphones or Bluetooth devices',
    testAudio: 'Test',
    selectAudioDevice: 'Select output device',
    showStatusBar: 'Show Status Bar',
    showStatusBarContent:
      'You can display the music control function in your mac status bar (effective after a restart)',
    fallbackParser: 'Fallback Parser (GD Music)',
    fallbackParserDesc:
      'When "GD Music" is checked and regular sources fail, this service will be used.',
    parserGD: 'GD Music (Built-in)',
    parserCustom: 'Custom API',

    // Source labels
    sourceLabels: {
      migu: 'Migu',
      kugou: 'Kugou',
      kuwo: 'Kuwo',
      pyncmd: 'NetEase (Built-in)',
      qq: 'QQ Music',
      joox: 'JOOX',
      bilibili: 'Bilibili',
      gdmusic: 'GD Music',
      lxMusic: 'LX Music',
      custom: 'Custom API'
    },

    customApi: {
      sectionTitle: 'Custom API Settings',
      importConfig: 'Import JSON Config',
      currentSource: 'Current Source',
      notImported: 'No custom source imported yet.',
      importSuccess: 'Successfully imported source: {name}',
      importFailed: 'Import failed: {message}',
      enableHint: 'Import a JSON config file to enable',
      status: {
        imported: 'Custom Source Imported',
        notImported: 'Not Imported'
      }
    },
    lxMusic: {
      tabs: {
        sources: 'Source Selection',
        lxMusic: 'LX Music',
        customApi: 'Custom API'
      },
      scripts: {
        title: 'Imported Scripts',
        importLocal: 'Import Local',
        importOnline: 'Import Online',
        urlPlaceholder: 'Enter LX Music Script URL',
        importBtn: 'Import',
        empty: 'No imported LX Music scripts',
        notConfigured: 'Not configured (Configure in LX Music Tab)',
        importHint: 'Import compatible custom API plugins to extend sources',
        noScriptWarning: 'Please import LX Music script first',
        noSelectionWarning: 'Please select an LX Music source first',
        notFound: 'Source not found',
        switched: 'Switched to source: {name}',
        deleted: 'Deleted source: {name}',
        enterUrl: 'Please enter script URL',
        invalidUrl: 'Invalid URL format',
        invalidScript: 'Invalid LX Music script, globalThis.lx code not found',
        nameRequired: 'Name cannot be empty',
        renameSuccess: 'Rename successful'
      }
    }
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
