export default {
  nowPlaying: '현재 재생 중',
  playlist: '재생 목록',
  lyrics: '가사',
  previous: '이전',
  play: '재생',
  pause: '일시정지',
  next: '다음',
  volumeUp: '볼륨 증가',
  volumeDown: '볼륨 감소',
  mute: '음소거',
  unmute: '음소거 해제',
  songNum: '총 곡 수: {num}',
  addCorrection: '{num}초 앞당기기',
  subtractCorrection: '{num}초 지연',
  playFailed: '현재 곡 재생 실패, 다음 곡 재생',
  parseFailedPlayNext: '곡 분석 실패, 다음 곡 재생',
  consecutiveFailsError:
    '재생 오류가 발생했습니다. 네트워크 문제 또는 유효하지 않은 음원일 수 있습니다. 재생 목록을 변경하거나 나중에 다시 시도하세요',
  playListEnded: '재생 목록의 마지막 곡에 도달했습니다',
  playMode: {
    sequence: '순차 재생',
    loop: '한 곡 반복',
    random: '랜덤 재생'
  },
  fullscreen: {
    enter: '전체화면',
    exit: '전체화면 종료'
  },
  close: '닫기',
  modeHint: {
    single: '한 곡 반복',
    list: '자동으로 다음 곡 재생'
  },
  lrc: {
    noLrc: '가사가 없습니다. 음악을 감상해주세요',
    noAutoScroll: '본 가사는 자동 스크롤을 지원하지 않습니다'
  },
  reparse: {
    title: '음원 선택',
    desc: '음원을 클릭하여 직접 분석하세요. 다음에 이 곡을 재생할 때 선택한 음원을 사용합니다',
    success: '재분석 성공',
    failed: '재분석 실패',
    warning: '음원을 선택해주세요',
    bilibiliNotSupported: 'B站 비디오는 재분석을 지원하지 않습니다',
    processing: '분석 중...',
    clear: '사용자 정의 음원 지우기',
    customApiFailed: '사용자 정의 API 분석 실패, 기본 음원을 시도합니다...',
    customApiError: '사용자 정의 API 요청 오류, 기본 음원을 시도합니다...'
  },
  playBar: {
    expand: '가사 펼치기',
    collapse: '가사 접기',
    like: '좋아요',
    lyric: '가사',
    noSongPlaying: '재생 중인 곡이 없습니다',
    eq: '이퀄라이저',
    playList: '재생 목록',
    reparse: '재분석',
    playMode: {
      sequence: '순차 재생',
      loop: '반복 재생',
      random: '랜덤 재생'
    },
    play: '재생 시작',
    pause: '재생 일시정지',
    prev: '이전 곡',
    next: '다음 곡',
    volume: '볼륨',
    favorite: '{name} 즐겨찾기 추가됨',
    unFavorite: '{name} 즐겨찾기 해제됨',
    miniPlayBar: '미니 재생바',
    playbackSpeed: '재생 속도',
    advancedControls: '고급 설정',
    intelligenceMode: {
      title: '인텔리전스 모드',
      needCookieLogin: '쿠키 방식으로 로그인한 후 인텔리전스 모드를 사용할 수 있습니다',
      noFavoritePlaylist: '내가 좋아하는 음악 재생목록을 찾을 수 없습니다',
      noLikedSongs: '아직 좋아한 노래가 없습니다',
      loading: '인텔리전스 모드를 불러오는 중',
      success: '총 {count}곡을 불러왔습니다',
      failed: '인텔리전스 모드 목록을 가져오는 데 실패했습니다',
      error: '인텔리전스 모드 재생 오류'
    }
  },
  eq: {
    title: '이퀄라이저',
    reset: '재설정',
    on: '켜기',
    off: '끄기',
    bass: '저음',
    midrange: '중음',
    treble: '고음',
    presets: {
      flat: '플랫',
      pop: '팝',
      rock: '록',
      classical: '클래식',
      jazz: '재즈',
      electronic: '일렉트로닉',
      hiphop: '힙합',
      rb: 'R&B',
      metal: '메탈',
      vocal: '보컬',
      dance: '댄스',
      acoustic: '어쿠스틱',
      custom: '사용자 정의'
    }
  },
  // 플레이어 설정
  settings: {
    title: '재생 설정',
    playbackSpeed: '재생 속도'
  },
  sleepTimer: {
    title: '타이머 종료',
    cancel: '타이머 취소',
    timeMode: '시간으로 종료',
    songsMode: '곡 수로 종료',
    playlistEnd: '재생 목록 완료 후 종료',
    afterPlaylist: '재생 목록 완료 후 종료',
    activeUntilEnd: '목록 끝까지 재생',
    minutes: '분',
    hours: '시간',
    songs: '곡',
    set: '설정',
    timerSetSuccess: '{minutes}분 후 종료로 설정됨',
    songsSetSuccess: '{songs}곡 재생 후 종료로 설정됨',
    playlistEndSetSuccess: '재생 목록 완료 후 종료로 설정됨',
    timerCancelled: '타이머 종료 취소됨',
    timerEnded: '타이머 종료 실행됨',
    playbackStopped: '음악 재생이 중지됨',
    minutesRemaining: '남은 시간 {minutes}분',
    songsRemaining: '남은 곡 수 {count}곡'
  },
  playList: {
    clearAll: '재생 목록 비우기',
    alreadyEmpty: '재생 목록이 이미 비어있습니다',
    cleared: '재생 목록이 비워졌습니다',
    empty: '재생 목록이 비어있습니다',
    clearConfirmTitle: '재생 목록 비우기',
    clearConfirmContent: '재생 목록의 모든 곡을 삭제하고 현재 재생을 중지합니다. 계속하시겠습니까?'
  }
};
