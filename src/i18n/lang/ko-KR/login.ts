export default {
  title: {
    qr: 'QR 로그인',
    phone: '휴대폰 로그인',
    cookie: 'Cookie 로그인',
    uid: 'UID 로그인'
  },
  qrTip: 'APP 으로 QR 코드를 스캔해 로그인',
  phoneTip: '계정과 비밀번호로 로그인',
  tokenTip: '유효한 음악 Cookie 를 입력하면 로그인할 수 있습니다',
  uidTip: '사용자 ID 를 입력해 빠르게 로그인',
  placeholder: {
    phone: '휴대폰 번호',
    password: '비밀번호',
    cookie: '음악 Cookie(token)를 입력하세요',
    uid: '사용자 ID(UID)를 입력하세요'
  },
  button: {
    login: '로그인',
    continueGuest: '로그인 없이 둘러보기',
    switchToQr: 'QR 로그인',
    switchToPhone: '휴대폰 로그인',
    switchToToken: 'Cookie 로그인',
    switchToUid: 'UID 로그인',
    backToQr: 'QR 로그인으로 돌아가기',
    cookieLogin: 'Cookie 로그인',
    autoGetCookie: 'Cookie 자동 가져오기',
    refresh: '새로고침',
    refreshing: '새로고침 중...',
    refreshQr: 'QR 코드 새로고침'
  },
  onboarding: {
    title: '가장 쉬운 로그인 방식부터 시작하세요',
    subtitle: '먼저 음악을 들어보고, 더 많은 기능이 필요할 때 나중에 로그인해도 됩니다.',
    recommendation: '추천',
    capabilityTitle: '로그인 방식별로 사용할 수 있는 기능',
    guestHint: '로그인하지 않아도 이용 가능한 콘텐츠를 먼저 둘러보고 재생할 수 있습니다.'
  },
  methods: {
    qr: {
      badge: '추천',
      summary: '대부분의 사용자에게 가장 적합한 방식',
      detail: '휴대폰으로 빠르게 확인하면 계정 기능을 온전히 사용할 수 있습니다.'
    },
    phone: {
      badge: '전체 기능',
      summary: '현재 기기에서 바로 로그인하고 싶을 때 적합',
      detail: '계정과 비밀번호에 익숙하다면 가장 직접적인 방식입니다.'
    },
    cookie: {
      badge: '고급',
      summary: '유효한 Cookie 를 이미 가지고 있는 사용자에게 적합',
      detail: '고급 설정이나 기능 복구 상황에서 유용하며 전체 기능도 사용할 수 있습니다.'
    },
    uid: {
      badge: '일부 기능',
      summary: '공개 프로필만 빠르게 확인할 때 적합',
      detail: '공개 정보는 볼 수 있지만 개인화 추천과 일부 계정 기능은 사용할 수 없습니다.'
    }
  },
  message: {
    loginSuccess: '로그인 성공',
    loginFailed: '로그인 실패',
    tokenLoginSuccess: 'Cookie 로그인 성공',
    uidLoginSuccess: 'UID 로그인 성공',
    loadError: '로그인 정보를 불러오는 중 오류가 발생했습니다',
    qrCheckError: 'QR 코드 상태를 확인하는 중 오류가 발생했습니다',
    tokenRequired: 'Cookie 를 입력하세요',
    tokenInvalid: 'Cookie 가 올바르지 않습니다. 확인 후 다시 시도하세요',
    uidRequired: '사용자 ID 를 입력하세요',
    uidInvalid: '사용자 ID 가 올바르지 않거나 사용자가 존재하지 않습니다',
    uidLoginFailed: 'UID 로그인에 실패했습니다. 사용자 ID 를 확인하세요',
    phoneRequired: '휴대폰 번호를 입력하세요',
    passwordRequired: '비밀번호를 입력하세요',
    phoneLoginFailed: '휴대폰 로그인에 실패했습니다. 번호와 비밀번호를 확인하세요',
    autoGetCookieSuccess: 'Cookie 자동 가져오기에 성공했습니다',
    autoGetCookieFailed: 'Cookie 자동 가져오기에 실패했습니다',
    autoGetCookieTip: '로그인 페이지를 엽니다. 로그인 후 창을 닫아 주세요',
    autoGetCookiePreparing: '로그인 창을 준비하는 중입니다. 잠시만 기다려 주세요...',
    autoGetCookieWindowOpened: '로그인 창이 열렸습니다. 새 창에서 로그인을 완료해 주세요.',
    autoGetCookieWindowFocused: '이미 열린 로그인 창으로 이동했습니다.',
    autoGetCookieDetected: 'Cookie 를 감지했습니다. 계정을 확인하는 중입니다...',
    autoGetCookieClosedWithoutCookie: 'Cookie 를 감지하기 전에 로그인 창이 닫혔습니다.',
    autoGetCookieOpenFailed: '로그인 창을 열지 못했습니다. 다시 시도해 주세요.',
    qrCheckFailed: 'QR 코드 상태 확인에 실패했습니다. 새로고침 후 다시 시도하세요',
    qrLoading: 'QR 코드를 불러오는 중...',
    qrExpired: 'QR 코드가 만료되었습니다. 새로고침해 주세요',
    qrExpiredShort: 'QR 코드 만료',
    qrExpiredWarning: 'QR 코드가 만료되었습니다. 새로고침하여 새 코드를 받아 주세요',
    qrScanned: 'QR 코드를 스캔했습니다. 휴대폰에서 로그인을 확인해 주세요',
    qrScannedShort: '스캔됨',
    qrScannedInfo: 'QR 코드를 스캔했습니다. 휴대폰에서 로그인을 확인해 주세요',
    qrConfirmed: '로그인 성공, 이동 중...',
    qrGenerating: 'QR 코드를 생성 중...'
  },
  qrTitle: 'QR 로그인',
  uidWarning:
    '주의: UID 로그인은 공개 정보 조회 전용이며, 로그인 권한이 필요한 기능에는 접근할 수 없습니다.'
};
