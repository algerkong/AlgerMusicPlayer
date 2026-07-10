export default {
  title: {
    qr: 'QRコードログイン',
    phone: '電話番号ログイン',
    cookie: 'Cookie ログイン',
    uid: 'UID ログイン'
  },
  qrTip: 'APP で QR コードを読み取ってログイン',
  phoneTip: 'アカウントとパスワードでログイン',
  tokenTip: '有効な音楽 Cookie を入力するとログインできます',
  uidTip: 'ユーザー ID を入力してすばやくログイン',
  placeholder: {
    phone: '電話番号',
    password: 'パスワード',
    cookie: '音楽 Cookie（token）を入力してください',
    uid: 'ユーザー ID（UID）を入力してください'
  },
  button: {
    login: 'ログイン',
    continueGuest: 'ログインせずに試す',
    switchToQr: 'QRコードログイン',
    switchToPhone: '電話番号ログイン',
    switchToToken: 'Cookie でログイン',
    switchToUid: 'UID ログイン',
    backToQr: 'QR コードログインに戻る',
    cookieLogin: 'Cookie ログイン',
    autoGetCookie: 'Cookie を自動取得',
    refresh: 'クリックして更新',
    refreshing: '更新中...',
    refreshQr: 'QR コードを更新'
  },
  onboarding: {
    title: 'まずは一番かんたんなログイン方法を選びましょう',
    subtitle: '先に音楽を聴き始めて、必要になったら後からログインできます。',
    recommendation: 'おすすめ',
    capabilityTitle: 'ログイン方法ごとに使える機能',
    guestHint: 'ログインしなくても、利用可能なコンテンツの閲覧と再生は先に試せます。'
  },
  methods: {
    qr: {
      badge: 'おすすめ',
      summary: 'ほとんどのユーザーに最適',
      detail: 'スマホで素早く確認でき、アカウント機能をフルで使えます。'
    },
    phone: {
      badge: '完全機能',
      summary: 'この端末で直接ログインしたい場合に最適',
      detail: 'アカウントとパスワードに慣れているなら、最も直接的な方法です。'
    },
    cookie: {
      badge: '上級者向け',
      summary: '有効な Cookie をすでに持っている人向け',
      detail: '高度な設定や機能復旧の場面で使いやすく、完全機能も利用できます。'
    },
    uid: {
      badge: '一部機能のみ',
      summary: '公開プロフィールの確認に向いた方法',
      detail: '公開情報は確認できますが、パーソナライズ推薦や一部のアカウント機能は利用できません。'
    }
  },
  message: {
    loginSuccess: 'ログイン成功',
    loginFailed: 'ログイン失敗',
    tokenLoginSuccess: 'Cookie ログイン成功',
    uidLoginSuccess: 'UID ログイン成功',
    loadError: 'ログイン情報の読み込み中にエラーが発生しました',
    qrCheckError: 'QRコード状態の確認中にエラーが発生しました',
    tokenRequired: 'Cookie を入力してください',
    tokenInvalid: 'Cookie が無効です。確認して再試行してください',
    uidRequired: 'ユーザー ID を入力してください',
    uidInvalid: 'ユーザー ID が無効、またはユーザーが存在しません',
    uidLoginFailed: 'UID ログインに失敗しました。ユーザー ID を確認してください',
    phoneRequired: '電話番号を入力してください',
    passwordRequired: 'パスワードを入力してください',
    phoneLoginFailed: '電話番号ログインに失敗しました。番号とパスワードを確認してください',
    autoGetCookieSuccess: 'Cookie の自動取得に成功しました',
    autoGetCookieFailed: 'Cookie の自動取得に失敗しました',
    autoGetCookieTip: 'ログインページを開きます。ログイン完了後にウィンドウを閉じてください',
    autoGetCookiePreparing: 'ログインウィンドウを準備しています。しばらくお待ちください...',
    autoGetCookieWindowOpened:
      'ログインウィンドウを開きました。新しいウィンドウでログインを完了してください。',
    autoGetCookieWindowFocused: '既存のログインウィンドウにフォーカスしました。',
    autoGetCookieDetected: 'Cookie を検出しました。アカウントを確認しています...',
    autoGetCookieClosedWithoutCookie: 'Cookie を検出する前にログインウィンドウが閉じられました。',
    autoGetCookieOpenFailed: 'ログインウィンドウを開けませんでした。再試行してください。',
    qrCheckFailed: 'QRコード状態の確認に失敗しました。更新して再試行してください',
    qrLoading: 'QRコードを読み込み中...',
    qrExpired: 'QRコードの期限が切れました。クリックして更新してください',
    qrExpiredShort: 'QRコード期限切れ',
    qrExpiredWarning: 'QRコードの期限が切れました。クリックして新しいコードを取得してください',
    qrScanned: 'QRコードがスキャンされました。スマホでログインを確認してください',
    qrScannedShort: 'スキャン済み',
    qrScannedInfo: 'QRコードがスキャンされました。スマホでログインを確認してください',
    qrConfirmed: 'ログイン成功、リダイレクト中...',
    qrGenerating: 'QRコードを生成中...'
  },
  qrTitle: 'QRコードログイン',
  uidWarning:
    '注意：UID ログインは公開情報の確認にのみ利用でき、ログイン権限が必要な機能にはアクセスできません。'
};
