export default {
  title: {
    qr: 'QR Code Login',
    phone: 'Phone Login',
    cookie: 'Cookie Login',
    uid: 'UID Login'
  },
  qrTip: 'Scan with NetEase Cloud Music APP',
  phoneTip: 'Login with NetEase Cloud account',
  tokenTip: 'Enter a valid NetEase Cloud Music Cookie to login',
  uidTip: 'Enter User ID for quick login',
  placeholder: {
    phone: 'Phone Number',
    password: 'Password',
    cookie: 'Please enter NetEase Cloud Music Cookie (token)',
    uid: 'Please enter User ID (UID)'
  },
  button: {
    login: 'Login',
    continueGuest: 'Continue without login',
    switchToQr: 'QR Code Login',
    switchToPhone: 'Phone Login',
    switchToToken: 'Use Cookie Login',
    switchToUid: 'UID Login',
    backToQr: 'Back to QR Code Login',
    cookieLogin: 'Cookie Login',
    autoGetCookie: 'Auto Get Cookie',
    refresh: 'Click to Refresh',
    refreshing: 'Refreshing...',
    refreshQr: 'Refresh QR Code'
  },
  onboarding: {
    title: 'Start with the easiest path',
    subtitle: 'You can begin listening first, then unlock more features when needed.',
    recommendation: 'Recommended',
    capabilityTitle: 'What each login unlocks',
    guestHint: 'Guest mode lets you explore and play available content first.'
  },
  methods: {
    qr: {
      badge: 'Recommended',
      summary: 'Fastest for most users',
      detail: 'Full account features with quick confirmation on your phone.'
    },
    phone: {
      badge: 'Full features',
      summary: 'Use your NetEase Cloud account',
      detail: 'Best if you prefer a direct account login on this device.'
    },
    cookie: {
      badge: 'Advanced',
      summary: 'For users who already have a valid Cookie',
      detail: 'Useful for advanced setups and full feature recovery.'
    },
    uid: {
      badge: 'Limited',
      summary: 'View public profile information only',
      detail:
        'Good for quick profile lookup, but recommendations and some account features stay unavailable.'
    }
  },
  message: {
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed',
    tokenLoginSuccess: 'Cookie login successful',
    uidLoginSuccess: 'UID login successful',
    loadError: 'Error loading login information',
    qrCheckError: 'Error checking QR code status',
    tokenRequired: 'Please enter Cookie',
    tokenInvalid: 'Invalid Cookie, please check and try again',
    uidRequired: 'Please enter User ID',
    uidInvalid: 'Invalid User ID or user does not exist',
    uidLoginFailed: 'UID login failed, please check if User ID is correct',
    phoneRequired: 'Please enter phone number',
    passwordRequired: 'Please enter password',
    phoneLoginFailed: 'Phone login failed, please check if phone number and password are correct',
    autoGetCookieSuccess: 'Auto get Cookie successful',
    autoGetCookieFailed: 'Auto get Cookie failed',
    autoGetCookieTip:
      'Will open NetEase Cloud Music login page, please complete login and close the window',
    autoGetCookiePreparing: 'Preparing the login window, please wait...',
    autoGetCookieWindowOpened: 'Login window opened. Complete the sign-in in the new window.',
    autoGetCookieWindowFocused: 'Focused the existing login window for you.',
    autoGetCookieDetected: 'Cookie detected. Verifying your account...',
    autoGetCookieClosedWithoutCookie: 'Login window closed before a Cookie was detected.',
    autoGetCookieOpenFailed: 'Failed to open the login window. Please try again.',
    qrCheckFailed: 'Failed to check QR code status, please refresh and try again',
    qrLoading: 'Loading QR code...',
    qrExpired: 'QR code has expired, please click to refresh',
    qrExpiredShort: 'QR code expired',
    qrExpiredWarning: 'QR code has expired, please click to refresh for a new one',
    qrScanned: 'QR code scanned, please confirm login on your phone',
    qrScannedShort: 'Scanned',
    qrScannedInfo: 'QR code scanned, please confirm login on your phone',
    qrConfirmed: 'Login successful, redirecting...',
    qrGenerating: 'Generating QR code...'
  },
  qrTitle: 'NetEase Cloud Music QR Code Login',
  uidWarning:
    'Note: UID login is only for viewing user public information and cannot access features that require login permissions.'
};
