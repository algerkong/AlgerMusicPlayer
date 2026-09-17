export default {
  title: {
    qr: '扫码登录',
    phone: '手机号登录',
    cookie: 'Cookie 登录',
    uid: 'UID 登录'
  },
  qrTip: '使用 APP 扫码登录',
  phoneTip: '使用账号密码登录',
  tokenTip: '输入有效的音乐 Cookie 即可登录',
  uidTip: '输入用户 ID 快速登录',
  placeholder: {
    phone: '手机号',
    password: '密码',
    cookie: '请输入音乐 Cookie（token）',
    uid: '请输入用户 ID（UID）'
  },
  button: {
    login: '登录',
    continueGuest: '先不登录，直接体验',
    switchToQr: '扫码登录',
    switchToPhone: '手机号登录',
    switchToToken: '使用 Cookie 登录',
    switchToUid: 'UID 登录',
    backToQr: '返回二维码登录',
    cookieLogin: 'Cookie 登录',
    autoGetCookie: '自动获取 Cookie',
    refresh: '点击刷新',
    refreshing: '刷新中...',
    refreshQr: '刷新二维码'
  },
  onboarding: {
    title: '先选最简单的登录方式',
    subtitle: '你可以先开始听歌，需要更多功能时再完成登录。',
    recommendation: '推荐',
    capabilityTitle: '不同登录方式解锁的能力',
    guestHint: '不登录也可以先浏览和播放可用内容。'
  },
  methods: {
    qr: {
      badge: '推荐',
      summary: '大多数用户的最佳选择',
      detail: '用手机快速确认，可直接获得完整的账号功能。'
    },
    phone: {
      badge: '完整功能',
      summary: '适合在当前设备直接登录账号',
      detail: '如果你更习惯使用账号密码，这是最直接的方式。'
    },
    cookie: {
      badge: '高级',
      summary: '适合已有有效 Cookie 的用户',
      detail: '常见于高级配置或功能恢复场景，同样可用完整功能。'
    },
    uid: {
      badge: '部分功能',
      summary: '只适合快速查看公开资料',
      detail: '可以查看用户公开信息，但个性化推荐和部分账号功能不可用。'
    }
  },
  message: {
    loginSuccess: '登录成功',
    loginFailed: '登录失败',
    tokenLoginSuccess: 'Cookie 登录成功',
    uidLoginSuccess: 'UID 登录成功',
    loadError: '加载登录信息时出错',
    qrCheckError: '检查二维码状态时出错',
    tokenRequired: '请输入 Cookie',
    tokenInvalid: 'Cookie 无效，请检查后重试',
    uidRequired: '请输入用户 ID',
    uidInvalid: '用户 ID 无效或用户不存在',
    uidLoginFailed: 'UID 登录失败，请检查用户 ID 是否正确',
    phoneRequired: '请输入手机号',
    passwordRequired: '请输入密码',
    phoneLoginFailed: '手机号登录失败，请检查手机号和密码是否正确',
    autoGetCookieSuccess: '自动获取 Cookie 成功',
    autoGetCookieFailed: '自动获取 Cookie 失败',
    autoGetCookieTip: '将打开音乐登录页面，请完成登录后关闭窗口',
    autoGetCookiePreparing: '正在准备登录窗口，请稍候...',
    autoGetCookieWindowOpened: '登录窗口已打开，请在新窗口完成登录。',
    autoGetCookieWindowFocused: '已定位到已打开的登录窗口。',
    autoGetCookieDetected: '已检测到登录 Cookie，正在验证账号...',
    autoGetCookieClosedWithoutCookie: '登录窗口已关闭，尚未检测到 Cookie。',
    autoGetCookieOpenFailed: '打开登录窗口失败，请重试。',
    qrCheckFailed: '检查二维码状态失败，请刷新重试',
    qrLoading: '正在加载二维码...',
    qrExpired: '二维码已过期，请点击刷新',
    qrExpiredShort: '二维码已过期',
    qrExpiredWarning: '二维码已过期，请点击刷新获取新的二维码',
    qrScanned: '已扫码，请在手机上确认登录',
    qrScannedShort: '已扫码',
    qrScannedInfo: '已扫码，请在手机上确认登录',
    qrConfirmed: '登录成功，正在跳转...',
    qrGenerating: '正在生成二维码...'
  },
  qrTitle: '扫码登录',
  uidWarning: '注意：UID 登录仅用于查看用户公开信息，无法访问需要登录权限的功能'
};
