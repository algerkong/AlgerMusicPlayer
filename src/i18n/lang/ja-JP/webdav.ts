export default {
  title: 'WebDAV 同期',
  entryDesc: '設定、音源プラグイン、再生履歴などを自分の WebDAV に同期',
  url: 'サーバーアドレス',
  urlPlaceholder: '例: https://dav.jianguoyun.com/dav/',
  username: 'ユーザー名',
  password: 'パスワード',
  test: '接続テスト',
  testSuccess: '接続に成功しました',
  configSaved: 'WebDAV 設定を保存しました',
  categoriesTitle: '同期する内容',
  categories: {
    settings: '設定',
    plugins: '音源プラグイン',
    history: '再生履歴',
    favorites: 'お気に入り',
    login: 'ログイン状態'
  },
  categoryDesc: {
    settings:
      '外観、再生、ショートカット、歌詞、イコライザーなど。ダウンロード先、キャッシュ、プロキシなど端末固有の項目は含みません',
    plugins:
      'インストール済みの音源プラグイン、音源の順序、プラグイン変数（変数内のキーも一緒にアップロードされます）',
    history:
      '曲、プレイリスト、アルバム、ポッドキャストのローカル再生履歴。両側を自動でマージします',
    favorites:
      'ローカルのお気に入りと「興味なし」リスト。NetEase アカウントの「いいね」は変更しません',
    login: 'NetEase のログイン情報。同期後は他の端末でもログイン不要になります'
  },
  loginWarning:
    'Cookie は WebDAV サーバーに平文で保存されます。信頼できるサーバーか確認してください',
  loginConfirmTitle: 'ログイン状態の同期',
  loginConfirmContent:
    'ログイン Cookie は WebDAV サーバーに平文で保存されます。このファイルを読める人は誰でもあなたのアカウントにログインできます。また、複数の端末で同じ Cookie を使うと NetEase のリスク管理によりログアウトされる場合があります。1 台でログアウトすると、他の端末も同期後にログアウトされます。有効にしますか？',
  loginConfirmPositive: '理解したうえで有効にする',
  scheduleTitle: '同期のタイミング',
  syncOnStartup: '起動時に自動同期',
  interval: '定期同期',
  intervalOptions: {
    off: 'オフ',
    m15: '15 分ごと',
    m30: '30 分ごと',
    h1: '1 時間ごと',
    h6: '6 時間ごと',
    h24: '24 時間ごと'
  },
  actions: {
    sync: '今すぐ同期',
    upload: 'アップロードしてリモートを上書き',
    restore: 'リモートから復元'
  },
  uploadConfirm: 'この端末のデータで、リモートの有効な同期内容を上書きします。続行しますか？',
  restoreConfirm: 'リモートのデータで、この端末の有効な同期内容を上書きします。続行しますか？',
  status: {
    never: 'まだ同期していません',
    lastSync: '前回の同期: {time}',
    conflict: '一部の内容が両側で変更されています。手動で同期し、残す側を選んでください'
  },
  conflictTitle: '同期の競合',
  conflictContent:
    '次の内容がこの端末とリモートの両方で変更されています: {categories}。どちらを残しますか？このウィンドウを閉じると今回は処理しません。',
  keepLocal: 'この端末を残す',
  useRemote: 'リモートを使う',
  result: {
    synced: '同期が完了しました',
    upToDate: 'すでに最新です',
    conflictSkipped:
      'WebDAV 同期: 一部の内容が両側で変更されていたためスキップしました。設定から手動で同期してください',
    restartRequired:
      'WebDAV 同期: リモートのデータを適用しました。一部はアプリの再起動後に反映されます',
    restartNow: '今すぐ再起動',
    later: 'あとで'
  },
  errors: {
    invalidUrl: 'サーバーアドレスが無効です。http(s) で始まる WebDAV アドレスを入力してください',
    auth: '認証に失敗しました。ユーザー名とパスワードを確認してください',
    http: 'サーバーがエラーを返しました（{status}）',
    network: 'サーバーに接続できません。アドレスとネットワークを確認してください',
    invalidFile:
      'リモートのファイルは有効な同期ファイルではないか、より新しいバージョンで作成されています',
    noBackup: 'リモートに同期ファイルがまだありません',
    busy: '同期中です。しばらくお待ちください'
  }
};
