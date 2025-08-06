export default {
  theme: '테마',
  language: '언어',
  regard: '정보',
  logout: '로그아웃',
  sections: {
    basic: '기본 설정',
    playback: '재생 설정',
    application: '애플리케이션 설정',
    network: '네트워크 설정',
    system: '시스템 관리',
    donation: '후원 지원',
    regard: '정보'
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
    }
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
    musicSources: '음원 설정',
    musicSourcesDesc: '음악 해석에 사용할 음원 플랫폼 선택',
    musicSourcesWarning: '최소 하나의 음원 플랫폼을 선택해야 합니다',
    musicUnblockEnable: '음악 해석 활성화',
    musicUnblockEnableDesc: '활성화하면 재생할 수 없는 음악을 해석하려고 시도합니다',
    configureMusicSources: '음원 구성',
    selectedMusicSources: '선택된 음원：',
    noMusicSources: '음원이 선택되지 않음',
    gdmusicInfo: 'GD 뮤직은 여러 플랫폼 음원을 자동으로 해석하고 최적의 결과를 자동 선택합니다',
    autoPlay: '자동 재생',
    autoPlayDesc: '앱을 다시 열 때 자동으로 재생을 계속할지 여부',
    showStatusBar: '상태바 제어 기능 표시 여부',
    showStatusBarContent: 'Mac 상태바에 음악 제어 기능을 표시할 수 있습니다 (재시작 후 적용)'
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
    unlimitedDownloadDesc: '활성화하면 음악을 무제한으로 다운로드합니다 (다운로드 실패가 발생할 수 있음), 기본 제한 300곡',
    downloadPath: '다운로드 디렉토리',
    downloadPathDesc: '음악 파일의 다운로드 위치 선택',
    remoteControl: '원격 제어',
    remoteControlDesc: '원격 제어 기능 설정'
  },
  network: {
    apiPort: '음악 API 포트',
    apiPortDesc: '수정 후 앱을 재시작해야 합니다',
    proxy: '프록시 설정',
    proxyDesc: '음악에 액세스할 수 없을 때 프록시를 활성화할 수 있습니다',
    proxyHost: '프록시 주소',
    proxyHostPlaceholder: '프록시 주소를 입력하세요',
    proxyPort: '프록시 포트',
    proxyPortPlaceholder: '프록시 포트를 입력하세요',
    realIP: 'realIP 설정',
    realIPDesc: '제한으로 인해 이 프로젝트는 해외에서 사용할 때 제한을 받을 수 있으며, realIP 매개변수를 사용하여 국내 IP를 전달하여 해결할 수 있습니다',
    messages: {
      proxySuccess: '프록시 설정이 저장되었습니다. 앱을 재시작한 후 적용됩니다',
      proxyError: '입력이 올바른지 확인하세요',
      realIPSuccess: '실제 IP 설정이 저장되었습니다',
      realIPError: '유효한 IP 주소를 입력하세요'
    }
  },
  system: {
    cache: '캐시 관리',
    cacheDesc: '캐시 지우기',
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
      clearSuccess: '지우기 성공, 일부 설정은 재시작 후 적용됩니다'
    }
  },
  about: {
    version: '버전',
    checkUpdate: '업데이트 확인',
    checking: '확인 중...',
    latest: '현재 최신 버전입니다',
    hasUpdate: '새 버전 발견',
    gotoUpdate: '업데이트하러 가기',
    gotoGithub: 'Github로 이동',
    author: '작성자',
    authorDesc: 'algerkong 별점🌟 부탁드려요',
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
    mobileUnavailable: '이 설정은 모바일에서만 사용 가능합니다'
  },
  themeColor: {
    title: '가사 테마 색상',
    presetColors: '미리 설정된 색상',
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
    shortcutConflict: '단축키 충돌',
    inputPlaceholder: '클릭하여 단축키 입력',
    resetShortcuts: '기본값 복원',
    disableAll: '모두 비활성화',
    enableAll: '모두 활성화',
    togglePlay: '재생/일시정지',
    prevPlay: '이전 곡',
    nextPlay: '다음 곡',
    volumeUp: '볼륨 증가',
    volumeDown: '볼륨 감소',
    toggleFavorite: '즐겨찾기/즐겨찾기 취소',
    toggleWindow: '창 표시/숨기기',
    scopeGlobal: '전역',
    scopeApp: '앱 내',
    enabled: '활성화',
    disabled: '비활성화',
    messages: {
      resetSuccess: '기본 단축키로 복원되었습니다. 저장을 잊지 마세요',
      conflict: '충돌하는 단축키가 있습니다. 다시 설정하세요',
      saveSuccess: '단축키 설정이 저장되었습니다',
      saveError: '단축키 저장 실패, 다시 시도하세요',
      cancelEdit: '수정이 취소되었습니다',
      disableAll: '모든 단축키가 비활성화되었습니다. 저장을 잊지 마세요',
      enableAll: '모든 단축키가 활성화되었습니다. 저장을 잊지 마세요'
    }
  },
  remoteControl: {
    title: '원격 제어',
    enable: '원격 제어 활성화',
    port: '서비스 포트',
    allowedIps: '허용된 IP 주소',
    addIp: 'IP 추가',
    emptyListHint: '빈 목록은 모든 IP 액세스를 허용함을 의미합니다',
    saveSuccess: '원격 제어 설정이 저장되었습니다',
    accessInfo: '원격 제어 액세스 주소:'
  },
  cookie: {
    title: 'Cookie 설정',
    description: '넷이즈 클라우드 뮤직의 Cookie를 입력하세요:',
    placeholder: '완전한 Cookie를 붙여넣으세요...',
    help: {
      format: 'Cookie는 일반적으로 "MUSIC_U="로 시작합니다',
      source: '브라우저 개발자 도구의 네트워크 요청에서 얻을 수 있습니다',
      storage: 'Cookie 설정 후 자동으로 로컬 저장소에 저장됩니다'
    },
    action: {
      save: 'Cookie 저장',
      paste: '붙여넣기',
      clear: '지우기'
    },
    validation: {
      required: 'Cookie를 입력하세요',
      format: 'Cookie 형식이 올바르지 않을 수 있습니다. MUSIC_U가 포함되어 있는지 확인하세요'
    },
    message: {
      saveSuccess: 'Cookie 저장 성공',
      saveError: 'Cookie 저장 실패',
      pasteSuccess: '붙여넣기 성공',
      pasteError: '붙여넣기 실패, 수동으로 복사하세요'
    },
    info: {
      length: '현재 길이: {length} 문자'
    }
  }
};