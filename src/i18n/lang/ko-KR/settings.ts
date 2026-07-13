export default {
  theme: '테마',
  language: '언어',
  regard: '정보',
  logout: '로그아웃',
  sections: {
    basic: '일반',
    playback: '재생',
    application: '앱',
    network: '네트워크',
    system: '저장소',
    about: '정보'
  },
  basic: {
    themeMode: '테마 모드',
    themeModeDesc: '낮/밤 테마 전환',
    autoTheme: '시스템 따라가기',
    manualTheme: '수동 전환',
    language: '언어 설정',
    languageDesc: '표시 언어 전환',
    tokenManagement: 'Cookie 관리',
    tokenManagementDesc: '넷이즈 클라우드 뮤직 로그인 Cookie 관리',
    tokenStatus: '현재 Cookie 상태',
    tokenSet: '설정됨',
    tokenNotSet: '설정되지 않음',
    setToken: 'Cookie 설정',
    modifyToken: 'Cookie 수정',
    clearToken: 'Cookie 지우기',
    font: '폰트 설정',
    fontDesc: '폰트 선택, 앞에 있는 폰트를 우선 사용',
    fontScope: {
      global: '전역',
      lyric: '가사만'
    },
    animation: '애니메이션 속도',
    animationDesc: '애니메이션 활성화 여부',
    animationSpeed: {
      slow: '매우 느림',
      normal: '보통',
      fast: '매우 빠름'
    },
    fontPreview: {
      title: '폰트 미리보기',
      chinese: '中文',
      english: 'English',
      japanese: '日本語',
      korean: '한국어',
      chineseText: '静夜思 床前明月光 疑是地上霜',
      englishText: 'The quick brown fox jumps over the lazy dog',
      japaneseText: 'あいうえお かきくけこ さしすせそ',
      koreanText: '가나다라마 바사아자차 카타파하'
    },
    gpuAcceleration: 'GPU 가속',
    gpuAccelerationDesc:
      'GPU 가속을 사용하면 애니메이션이 빠르게 재생되고 애니메이션이 느리게 재생되는 것보다 느릴 수 있습니다.',
    gpuAccelerationRestart: 'GPU 가속 설정을 변경하면 애플리케이션을 다시 시작해야 합니다',
    gpuAccelerationChangeSuccess:
      'GPU 가속 설정이 업데이트되었습니다. 애플리케이션을 다시 시작하여 적용하십시오',
    gpuAccelerationChangeError: 'GPU 가속 설정 업데이트에 실패했습니다',
    tabletMode: '태블릿 모드',
    tabletModeDesc:
      '태블릿 모드를 사용하면 모바일 기기에서 PC 스타일의 인터페이스를 사용할 수 있습니다'
  },
  playback: {
    quality: '음질 설정',
    qualityDesc: '음악 재생 음질 선택 (넷이즈 클라우드 VIP)',
    qualityOptions: {
      standard: '표준',
      higher: '높음',
      exhigh: '매우 높음',
      lossless: '무손실',
      hires: 'Hi-Res',
      jyeffect: 'HD 서라운드',
      sky: '몰입형 서라운드',
      dolby: '돌비 애트모스',
      jymaster: '초고화질 마스터'
    },
    autoPlay: '자동 재생',
    autoPlayDesc: '앱을 다시 열 때 자동으로 재생을 계속할지 여부',
    audioDevice: '오디오 출력 장치',
    audioDeviceDesc: '스피커, 헤드폰 또는 블루투스 장치와 같은 오디오 출력 장치 선택',
    testAudio: '테스트',
    selectAudioDevice: '출력 장치 선택',
    systemDefault: '시스템 기본값',
    showStatusBar: '상태바 제어 기능 표시 여부',
    showStatusBarContent: 'Mac 상태바에 음악 제어 기능을 표시할 수 있습니다 (재시작 후 적용)'

    // 음원 라벨
  },
  application: {
    closeAction: '닫기 동작',
    closeActionDesc: '창을 닫을 때의 동작 선택',
    closeOptions: {
      ask: '매번 묻기',
      minimize: '트레이로 최소화',
      close: '직접 종료'
    },
    shortcut: '단축키 설정',
    shortcutDesc: '전역 단축키 사용자 정의',
    download: '다운로드 관리',
    downloadDesc: '다운로드 목록 버튼을 항상 표시할지 여부',
    unlimitedDownload: '무제한 다운로드',
    unlimitedDownloadDesc:
      '활성화하면 음악을 무제한으로 다운로드합니다 (다운로드 실패가 발생할 수 있음), 기본 제한 300곡',
    downloadPath: '다운로드 디렉토리',
    downloadPathDesc: '음악 파일의 다운로드 위치 선택'
  },
  network: {
    proxy: '프록시 설정',
    proxyDesc: '음악에 액세스할 수 없을 때 프록시를 활성화할 수 있습니다',
    proxyHost: '프록시 주소',
    proxyHostPlaceholder: '프록시 주소를 입력하세요',
    proxyPort: '프록시 포트',
    proxyPortPlaceholder: '프록시 포트를 입력하세요',
    messages: {
      proxySuccess: '프록시 설정이 저장되었습니다. 앱을 재시작한 후 적용됩니다',
      proxyError: '입력이 올바른지 확인하세요'
    }
  },
  system: {
    cache: '캐시 관리',
    cacheDesc: '캐시 지우기',
    diskCache: '디스크 캐시',
    diskCacheDesc: '재생한 음악과 가사를 로컬 디스크에 캐시하여 재생 속도를 높입니다',
    cacheDirectory: '캐시 디렉터리',
    cacheDirectoryDesc: '음악 및 가사 캐시 저장 경로를 사용자 지정',
    selectDirectory: '디렉터리 선택',
    openDirectory: '디렉터리 열기',
    cacheMaxSize: '캐시 용량 제한',
    cacheMaxSizeDesc: '용량 제한 도달 시 오래된 캐시를 자동 정리합니다',
    cleanupPolicy: '정리 정책',
    cleanupPolicyDesc: '캐시 용량 제한 도달 시 적용할 자동 정리 규칙',
    cleanupPolicyOptions: {
      lru: '최근 사용 안 함 우선',
      fifo: '선입선출'
    },
    cacheStatus: '캐시 상태',
    cacheStatusDesc: '사용량 {used} / 제한 {limit}',
    cacheStatusDetail: '음악 {musicCount}곡, 가사 {lyricCount}곡',
    manageDiskCache: '수동 디스크 캐시 정리',
    manageDiskCacheDesc: '캐시 유형별로 정리',
    clearMusicCache: '음악 캐시 정리',
    clearLyricCache: '가사 캐시 정리',
    clearAllCache: '전체 캐시 정리',
    switchDirectoryMigrateTitle: '기존 캐시가 감지되었습니다',
    switchDirectoryMigrateContent: '기존 캐시를 새 디렉터리로 마이그레이션할까요?',
    switchDirectoryMigrateConfirm: '마이그레이션',
    switchDirectoryDestroyTitle: '기존 캐시 삭제',
    switchDirectoryDestroyContent:
      '마이그레이션하지 않을 경우, 이전 디렉터리의 캐시 파일을 삭제할까요?',
    switchDirectoryDestroyConfirm: '삭제',
    switchDirectoryKeepOld: '기존 캐시 유지',
    cacheClearTitle: '지울 캐시 유형을 선택하세요：',
    cacheTypes: {
      history: {
        label: '재생 기록',
        description: '재생한 곡 기록 지우기'
      },
      favorite: {
        label: '즐겨찾기 기록',
        description: '로컬 즐겨찾기 곡 기록 지우기 (클라우드 즐겨찾기에는 영향 없음)'
      },
      user: {
        label: '사용자 데이터',
        description: '로그인 정보 및 사용자 관련 데이터 지우기'
      },
      settings: {
        label: '앱 설정',
        description: '앱의 모든 사용자 정의 설정 지우기'
      },
      downloads: {
        label: '다운로드 기록',
        description: '다운로드 기록 지우기 (다운로드된 파일은 삭제되지 않음)'
      },
      resources: {
        label: '음악 리소스',
        description: '로드된 음악 파일, 가사 등 리소스 캐시 지우기'
      },
      lyrics: {
        label: '가사 리소스',
        description: '로드된 가사 리소스 캐시 지우기'
      }
    },
    restart: '재시작',
    restartDesc: '앱 재시작',
    messages: {
      clearSuccess: '지우기 성공, 일부 설정은 재시작 후 적용됩니다',
      diskCacheClearSuccess: '디스크 캐시를 정리했습니다',
      diskCacheClearFailed: '디스크 캐시 정리에 실패했습니다',
      diskCacheStatsLoadFailed: '캐시 상태를 불러오지 못했습니다',
      switchDirectorySuccess: '캐시 디렉터리가 변경되었습니다. 기존 캐시는 유지됩니다',
      switchDirectoryFailed: '캐시 디렉터리 변경에 실패했습니다',
      switchDirectoryMigrated: '캐시 디렉터리를 변경하고 {count}개 파일을 마이그레이션했습니다',
      switchDirectoryDestroyed: '캐시 디렉터리를 변경하고 기존 캐시 {count}개 파일을 삭제했습니다'
    }
  },
  about: {
    version: '버전',
    checkUpdate: '업데이트 확인',
    checking: '확인 중...',
    latest: '현재 최신 버전입니다',
    hasUpdate: '새 버전 발견',
    gotoUpdate: '업데이트하러 가기',
    manualUpdate: '수동 업데이트',
    gotoGithub: 'Github로 이동',
    author: '작성자',
    authorDesc: 'LuoYe17 스타🌟 부탁드려요',
    messages: {
      checkError: '업데이트 확인 실패, 나중에 다시 시도하세요'
    }
  },
  validation: {
    selectProxyProtocol: '프록시 프로토콜을 선택하세요',
    proxyHost: '프록시 주소를 입력하세요',
    portNumber: '유효한 포트 번호를 입력하세요 (1-65535)'
  },
  lyricSettings: {
    title: '가사 설정',
    tabs: {
      display: '표시',
      interface: '인터페이스',
      typography: '텍스트',
      background: '배경',
      mobile: '모바일'
    },
    pureMode: '순수 모드',
    hideCover: '커버 숨기기',
    centerDisplay: '중앙 표시',
    showTranslation: '번역 표시',
    hideLyrics: '가사 숨기기',
    hidePlayBar: '재생바 숨기기',
    hideMiniPlayBar: '미니 재생바 숨기기',
    showMiniPlayBar: '미니 재생바 표시',
    backgroundTheme: '배경 테마',
    themeOptions: {
      default: '기본',
      light: '밝음',
      dark: '어둠'
    },
    fontSize: '폰트 크기',
    fontSizeMarks: {
      small: '작음',
      medium: '중간',
      large: '큼'
    },
    fontWeight: '글꼴 두께',
    fontWeightMarks: {
      thin: '가늘게',
      normal: '보통',
      bold: '굵게'
    },
    letterSpacing: '글자 간격',
    letterSpacingMarks: {
      compact: '좁음',
      default: '기본',
      loose: '넓음'
    },
    lineHeight: '줄 높이',
    lineHeightMarks: {
      compact: '좁음',
      default: '기본',
      loose: '넓음'
    },
    contentWidth: '콘텐츠 너비',
    mobileLayout: '모바일 레이아웃',
    layoutOptions: {
      default: '기본',
      ios: 'iOS 스타일',
      android: '안드로이드 스타일'
    },
    mobileCoverStyle: '커버 스타일',
    coverOptions: {
      record: '레코드',
      square: '정사각형',
      full: '전체화면'
    },
    lyricLines: '가사 줄 수',
    mobileUnavailable: '이 설정은 모바일에서만 사용 가능합니다',
    // 배경 설정
    background: {
      useCustomBackground: '사용자 정의 배경 사용',
      backgroundMode: '배경 모드',
      modeOptions: {
        solid: '단색',
        gradient: '그라데이션',
        image: '이미지',
        css: 'CSS'
      },
      solidColor: '색상 선택',
      presetColors: '프리셋 색상',
      customColor: '사용자 정의 색상',
      gradientEditor: '그라데이션 편집기',
      gradientColors: '그라데이션 색상',
      gradientDirection: '그라데이션 방향',
      directionOptions: {
        toBottom: '위에서 아래로',
        toRight: '왼쪽에서 오른쪽으로',
        toBottomRight: '왼쪽 위에서 오른쪽 아래로',
        angle45: '45도',
        toTop: '아래에서 위로',
        toLeft: '오른쪽에서 왼쪽으로'
      },
      addColor: '색상 추가',
      removeColor: '색상 제거',
      imageUpload: '이미지 업로드',
      imagePreview: '이미지 미리보기',
      clearImage: '이미지 지우기',
      imageBlur: '흐림',
      imageBrightness: '밝기',
      customCss: '사용자 정의 CSS 스타일',
      customCssPlaceholder: 'CSS 스타일 입력, 예: background: linear-gradient(...)',
      customCssHelp: '모든 CSS background 속성 지원',
      reset: '기본값으로 재설정',
      fileSizeLimit: '이미지 크기 제한: 20MB',
      invalidImageFormat: '잘못된 이미지 형식',
      imageTooLarge: '이미지가 너무 큽니다. 20MB 미만의 이미지를 선택하세요'
    }
  },
  translationEngine: '가사 번역 엔진',
  translationEngineOptions: {
    none: '닫기',
    opencc: 'OpenCC 중국어 번체'
  },
  themeColor: {
    title: '가사 테마 색상',
    presetColors: '미리 설정된 색상',
    reset: '기본값으로 복원',
    customColor: '사용자 정의 색상',
    preview: '미리보기 효과',
    previewText: '가사 효과',
    colorNames: {
      'spotify-green': 'Spotify 그린',
      'apple-blue': '애플 블루',
      'youtube-red': 'YouTube 레드',
      orange: '활력 오렌지',
      purple: '신비 퍼플',
      pink: '벚꽃 핑크'
    },
    tooltips: {
      openColorPicker: '색상 선택기 열기',
      closeColorPicker: '색상 선택기 닫기'
    },
    placeholder: '#1db954'
  },
  shortcutSettings: {
    title: '단축키 설정',
    shortcut: '단축키',
    shortcutDesc: '단축키 사용자 정의',
    summaryReady: '단축키 구성이 저장 가능한 상태입니다',
    summaryRecording: '새 단축키 조합을 입력 중입니다',
    summaryBlocked: '충돌 또는 잘못된 항목을 먼저 수정하세요',
    platformHintMac: 'macOS에서는 CommandOrControl이 Cmd로 표시됩니다',
    platformHintWindows: 'Windows에서는 CommandOrControl이 Ctrl로 표시됩니다',
    platformHintLinux: 'Linux에서는 CommandOrControl이 Ctrl로 표시됩니다',
    platformHintGeneric: 'CommandOrControl은 운영체제에 맞게 자동 변환됩니다',
    enabledCount: '활성화됨',
    recordingTip: '필드를 클릭 후 조합키 입력, Esc 취소, Delete 비활성화',
    shortcutConflict: '단축키 충돌',
    inputPlaceholder: '클릭하여 단축키 입력',
    clickToRecord: '클릭 후 단축키 입력',
    recording: '입력 중...',
    resetShortcuts: '기본값 복원',
    restoreSingle: '복원',
    disableAll: '모두 비활성화',
    enableAll: '모두 활성화',
    groups: {
      playback: '재생 제어',
      sound: '볼륨 및 즐겨찾기',
      window: '창 제어'
    },
    togglePlay: '재생/일시정지',
    togglePlayDesc: '현재 재생 상태를 전환합니다',
    prevPlay: '이전 곡',
    prevPlayDesc: '이전 곡으로 이동합니다',
    nextPlay: '다음 곡',
    nextPlayDesc: '다음 곡으로 이동합니다',
    volumeUp: '볼륨 증가',
    volumeUpDesc: '플레이어 볼륨을 높입니다',
    volumeDown: '볼륨 감소',
    volumeDownDesc: '플레이어 볼륨을 낮춥니다',
    toggleFavorite: '즐겨찾기/즐겨찾기 취소',
    toggleFavoriteDesc: '현재 곡 즐겨찾기를 전환합니다',
    toggleWindow: '창 표시/숨기기',
    toggleWindowDesc: '메인 창을 빠르게 표시/숨김합니다',
    scopeGlobal: '전역',
    scopeApp: '앱 내',
    enabled: '활성화',
    disabled: '비활성화',
    issueInvalid: '잘못된 조합',
    issueReserved: '시스템 예약',
    registrationWarningTitle: '다음 단축키는 등록되지 않았습니다',
    registrationOccupied: '시스템 또는 다른 앱에서 사용 중',
    registrationInvalid: '단축키 형식이 잘못됨',
    messages: {
      resetSuccess: '기본 단축키로 복원되었습니다. 저장을 잊지 마세요',
      conflict: '충돌하는 단축키가 있습니다. 다시 설정하세요',
      saveSuccess: '단축키 설정이 저장되었습니다',
      saveError: '단축키 저장 실패, 다시 시도하세요',
      saveValidationError: '단축키 검증에 실패했습니다. 설정을 확인하세요',
      partialRegistered: '저장되었지만 일부 전역 단축키는 등록되지 않았습니다',
      cancelEdit: '수정이 취소되었습니다',
      clearToDisable: '해당 단축키가 비활성화되었습니다',
      invalidShortcut: '잘못된 단축키입니다. 유효한 조합을 입력하세요',
      disableAll: '모든 단축키가 비활성화되었습니다. 저장을 잊지 마세요',
      enableAll: '모든 단축키가 활성화되었습니다. 저장을 잊지 마세요'
    }
  },
  musicSource: {
    title: '온라인 음원 세션',
    desc: 'ly-music-source 로 기수 등 플랫폼 세션 관리 (Cookie 는 디버그/이전용)',
    loggedIn: '로그인됨: {name}',
    loggedOut: '로그인되지 않음',
    importSession: 'Cookie 가져오기',
    logout: '로그아웃',
    logoutSuccess: '음원 세션에서 로그아웃했습니다',
    logoutFailed: '로그아웃 실패',
    sessionTitle: '기수 Cookie 가져오기',
    sessionDesc: '브라우저 Cookie 문자열을 붙여넣으세요 (최소 sessionid). 공유하지 마세요.',
    sessionPlaceholder: 'sessionid=...; ...',
    sessionRequired: 'Cookie 를 입력하세요',
    sessionSaved: '세션이 저장되었습니다',
    sessionSaveFailed: '세션 저장 실패',
    saveSession: '저장'
  }
};
