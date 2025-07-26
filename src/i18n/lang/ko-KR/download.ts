export default {
  title: '다운로드 관리',
  localMusic: '로컬 음악',
  count: '총 {count}곡',
  clearAll: '기록 지우기',
  settings: '설정',
  tabs: {
    downloading: '다운로드 중',
    downloaded: '다운로드 완료'
  },
  empty: {
    noTasks: '다운로드 작업이 없습니다',
    noDownloaded: '다운로드된 곡이 없습니다'
  },
  progress: {
    total: '전체 진행률: {progress}%'
  },
  status: {
    downloading: '다운로드 중',
    completed: '완료',
    failed: '실패',
    unknown: '알 수 없음'
  },
  artist: {
    unknown: '알 수 없는 가수'
  },
  delete: {
    title: '삭제 확인',
    message: '곡 "{filename}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    confirm: '삭제 확인',
    cancel: '취소',
    success: '삭제 성공',
    failed: '삭제 실패',
    fileNotFound: '파일이 존재하지 않거나 이동되었습니다. 기록에서 제거되었습니다',
    recordRemoved: '파일 삭제 실패, 하지만 기록에서 제거되었습니다'
  },
  clear: {
    title: '다운로드 기록 지우기',
    message: '모든 다운로드 기록을 지우시겠습니까? 이 작업은 다운로드된 음악 파일을 삭제하지 않지만 모든 기록을 지웁니다.',
    confirm: '지우기 확인',
    cancel: '취소',
    success: '다운로드 기록이 지워졌습니다'
  },
  message: {
    downloadComplete: '{filename} 다운로드 완료',
    downloadFailed: '{filename} 다운로드 실패: {error}'
  },
  loading: '로딩 중...',
  playStarted: '재생 시작: {name}',
  playFailed: '재생 실패: {name}',
  path: {
    copied: '경로가 클립보드에 복사됨',
    copyFailed: '경로 복사 실패'
  },
  settingsPanel: {
    title: '다운로드 설정',
    path: '다운로드 위치',
    pathDesc: '음악 파일 다운로드 저장 위치 설정',
    pathPlaceholder: '다운로드 경로를 선택해주세요',
    noPathSelected: '먼저 다운로드 경로를 선택해주세요',
    select: '폴더 선택',
    open: '폴더 열기',
    fileFormat: '파일명 형식',
    fileFormatDesc: '음악 다운로드 시 파일 이름 형식 설정',
    customFormat: '사용자 정의 형식',
    separator: '구분자',
    separators: {
      dash: '공백-공백',
      underscore: '밑줄',
      space: '공백'
    },
    dragToArrange: '드래그하여 정렬하거나 화살표 버튼을 사용하여 순서 조정:',
    formatVariables: '사용 가능한 변수',
    preview: '미리보기 효과:',
    saveSuccess: '다운로드 설정이 저장됨',
    presets: {
      songArtist: '곡명 - 가수명',
      artistSong: '가수명 - 곡명',
      songOnly: '곡명만'
    },
    components: {
      songName: '곡명',
      artistName: '가수명',
      albumName: '앨범명'
    }
  }
};