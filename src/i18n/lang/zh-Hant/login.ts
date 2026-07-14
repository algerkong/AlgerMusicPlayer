export default {
  title: {
    qr: '掃碼登入',
    phone: '手機號登入',
    cookie: 'Cookie 登入',
    uid: 'UID 登入'
  },
  qrTip: '使用 APP 掃碼登入',
  phoneTip: '使用帳號密碼登入',
  tokenTip: '輸入有效的音樂 Cookie 即可登入',
  uidTip: '輸入使用者 ID 快速登入',
  placeholder: {
    phone: '手機號',
    password: '密碼',
    cookie: '請輸入音樂 Cookie（token）',
    uid: '請輸入使用者 ID（UID）'
  },
  button: {
    login: '登入',
    continueGuest: '先不登入，直接體驗',
    switchToQr: '掃碼登入',
    switchToPhone: '手機號登入',
    switchToToken: '使用 Cookie 登入',
    switchToUid: 'UID 登入',
    backToQr: '返回二維碼登入',
    cookieLogin: 'Cookie 登入',
    autoGetCookie: '自動取得 Cookie',
    refresh: '點擊重新整理',
    refreshing: '重新整理中...',
    refreshQr: '重新整理二維碼'
  },
  onboarding: {
    title: '先選最簡單的登入方式',
    subtitle: '你可以先開始聽歌，需要更多功能時再完成登入。',
    recommendation: '推薦',
    capabilityTitle: '不同登入方式解鎖的能力',
    guestHint: '不登入也可以先瀏覽與播放可用內容。'
  },
  methods: {
    qr: {
      badge: '推薦',
      summary: '大多數使用者的最佳選擇',
      detail: '用手機快速確認，可直接取得完整帳號功能。'
    },
    phone: {
      badge: '完整功能',
      summary: '適合在目前裝置直接登入帳號',
      detail: '如果你更習慣使用帳號密碼，這是最直接的方式。'
    },
    cookie: {
      badge: '進階',
      summary: '適合已持有有效 Cookie 的使用者',
      detail: '常見於進階設定或功能恢復場景，同樣可使用完整功能。'
    },
    uid: {
      badge: '部分功能',
      summary: '只適合快速查看公開資料',
      detail: '可以查看使用者公開資訊，但個人化推薦與部分帳號功能不可用。'
    }
  },
  message: {
    loginSuccess: '登入成功',
    loginFailed: '登入失敗',
    tokenLoginSuccess: 'Cookie 登入成功',
    uidLoginSuccess: 'UID 登入成功',
    loadError: '載入登入資訊時發生錯誤',
    qrCheckError: '檢查二維碼狀態時發生錯誤',
    tokenRequired: '請輸入 Cookie',
    tokenInvalid: 'Cookie 無效，請檢查後重試',
    uidRequired: '請輸入使用者 ID',
    uidInvalid: '使用者 ID 無效或使用者不存在',
    uidLoginFailed: 'UID 登入失敗，請檢查使用者 ID 是否正確',
    phoneRequired: '請輸入手機號',
    passwordRequired: '請輸入密碼',
    phoneLoginFailed: '手機號登入失敗，請檢查手機號與密碼是否正確',
    autoGetCookieSuccess: '自動取得 Cookie 成功',
    autoGetCookieFailed: '自動取得 Cookie 失敗',
    autoGetCookieTip: '將開啟音樂登入頁面，請完成登入後關閉視窗',
    autoGetCookiePreparing: '正在準備登入視窗，請稍候...',
    autoGetCookieWindowOpened: '登入視窗已開啟，請在新視窗完成登入。',
    autoGetCookieWindowFocused: '已定位到已開啟的登入視窗。',
    autoGetCookieDetected: '已偵測到登入 Cookie，正在驗證帳號...',
    autoGetCookieClosedWithoutCookie: '登入視窗已關閉，尚未偵測到 Cookie。',
    autoGetCookieOpenFailed: '開啟登入視窗失敗，請再試一次。',
    qrCheckFailed: '檢查二維碼狀態失敗，請重新整理後重試',
    qrLoading: '正在載入二維碼...',
    qrExpired: '二維碼已過期，請點擊重新整理',
    qrExpiredShort: '二維碼已過期',
    qrExpiredWarning: '二維碼已過期，請點擊重新整理取得新的二維碼',
    qrScanned: '已掃碼，請在手機上確認登入',
    qrScannedShort: '已掃碼',
    qrScannedInfo: '已掃碼，請在手機上確認登入',
    qrConfirmed: '登入成功，正在跳轉...',
    qrGenerating: '正在產生二維碼...'
  },
  qrTitle: '掃碼登入',
  uidWarning: '注意：UID 登入僅用於查看使用者公開資訊，無法存取需要登入權限的功能'
};
