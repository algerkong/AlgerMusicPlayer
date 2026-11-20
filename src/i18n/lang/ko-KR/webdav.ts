export default {
  title: 'WebDAV 동기화',
  entryDesc: '설정, 음원 플러그인, 재생 기록 등을 내 WebDAV에 동기화',
  url: '서버 주소',
  urlPlaceholder: '예: https://dav.jianguoyun.com/dav/',
  username: '사용자 이름',
  password: '비밀번호',
  test: '연결 테스트',
  testSuccess: '연결되었습니다',
  configSaved: 'WebDAV 설정이 저장되었습니다',
  categoriesTitle: '동기화 내용',
  categories: {
    settings: '설정',
    plugins: '음원 플러그인',
    history: '재생 기록',
    favorites: '즐겨찾기',
    login: '로그인 상태'
  },
  categoryDesc: {
    settings:
      '외관, 재생, 단축키, 가사, 이퀄라이저 등. 다운로드 폴더, 캐시, 프록시 등 기기별 항목은 제외됩니다',
    plugins: '설치된 음원 플러그인, 음원 순서, 플러그인 변수(변수에 포함된 키도 함께 업로드됩니다)',
    history: '곡, 플레이리스트, 앨범, 팟캐스트의 로컬 재생 기록. 양쪽을 자동으로 병합합니다',
    favorites: '로컬 즐겨찾기 목록과 싫어요 목록. NetEase 계정의 좋아요는 변경하지 않습니다',
    login: 'NetEase 로그인 정보. 동기화 후 다른 기기에서 로그인이 필요 없습니다'
  },
  loginWarning: 'Cookie가 WebDAV 서버에 평문으로 저장됩니다. 신뢰할 수 있는 서버인지 확인하세요',
  loginConfirmTitle: '로그인 상태 동기화',
  loginConfirmContent:
    '로그인 Cookie가 WebDAV 서버에 평문으로 저장됩니다. 이 파일을 읽을 수 있는 사람은 누구나 내 계정에 로그인할 수 있으며, 여러 기기에서 같은 Cookie를 사용하면 NetEase 위험 관리로 인해 로그아웃될 수 있습니다. 한 기기에서 로그아웃하면 다른 기기도 동기화 후 로그아웃됩니다. 활성화하시겠습니까?',
  loginConfirmPositive: '이해했으며 활성화합니다',
  scheduleTitle: '동기화 시점',
  syncOnStartup: '시작 시 자동 동기화',
  interval: '정기 동기화',
  intervalOptions: {
    off: '끄기',
    m15: '15분마다',
    m30: '30분마다',
    h1: '1시간마다',
    h6: '6시간마다',
    h24: '24시간마다'
  },
  actions: {
    sync: '지금 동기화',
    upload: '업로드하여 원격 덮어쓰기',
    restore: '원격에서 복원'
  },
  uploadConfirm: '이 기기의 데이터로 원격의 활성화된 동기화 내용을 덮어씁니다. 계속하시겠습니까?',
  restoreConfirm: '원격 데이터로 이 기기의 활성화된 동기화 내용을 덮어씁니다. 계속하시겠습니까?',
  status: {
    never: '아직 동기화하지 않았습니다',
    lastSync: '마지막 동기화: {time}',
    conflict: '일부 내용이 양쪽에서 수정되었습니다. 수동으로 동기화하고 유지할 쪽을 선택하세요'
  },
  conflictTitle: '동기화 충돌',
  conflictContent:
    '다음 내용이 이 기기와 원격 양쪽에서 수정되었습니다: {categories}. 어느 쪽을 유지하시겠습니까? 이 창을 닫으면 이번에는 처리하지 않습니다.',
  keepLocal: '이 기기 유지',
  useRemote: '원격 사용',
  result: {
    synced: '동기화 완료',
    upToDate: '이미 최신 상태입니다',
    conflictSkipped:
      'WebDAV 동기화: 일부 내용이 양쪽에서 수정되어 건너뛰었습니다. 설정에서 수동으로 동기화하세요',
    restartRequired:
      'WebDAV 동기화: 원격 데이터를 적용했습니다. 일부 내용은 앱을 다시 시작한 후 적용됩니다',
    restartNow: '지금 다시 시작',
    later: '나중에'
  },
  errors: {
    invalidUrl: '서버 주소가 올바르지 않습니다. http(s)로 시작하는 WebDAV 주소를 입력하세요',
    auth: '인증에 실패했습니다. 사용자 이름과 비밀번호를 확인하세요',
    http: '서버가 오류를 반환했습니다({status})',
    network: '서버에 연결할 수 없습니다. 주소와 네트워크를 확인하세요',
    invalidFile: '원격 파일이 올바른 동기화 파일이 아니거나 더 최신 버전의 앱에서 만들어졌습니다',
    noBackup: '원격에 아직 동기화 파일이 없습니다',
    busy: '동기화 중입니다. 잠시 기다려 주세요'
  }
};
