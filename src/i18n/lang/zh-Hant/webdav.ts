export default {
  title: 'WebDAV 同步',
  entryDesc: '將設定、音源外掛、播放記錄等同步到自己的 WebDAV',
  url: '伺服器位址',
  urlPlaceholder: '例如 https://dav.jianguoyun.com/dav/',
  username: '使用者名稱',
  password: '密碼',
  test: '測試連線',
  testSuccess: '連線成功',
  configSaved: 'WebDAV 設定已儲存',
  categoriesTitle: '同步內容',
  categories: {
    settings: '設定',
    plugins: '音源外掛',
    history: '播放記錄',
    favorites: '收藏',
    login: '登入狀態'
  },
  categoryDesc: {
    settings: '外觀、播放、快捷鍵、歌詞與等化器等，不含下載目錄、快取、代理等本機相關項目',
    plugins: '已安裝的音源外掛、音源順序與外掛變數（變數中的金鑰會一併上傳）',
    history: '歌曲、歌單、專輯、播客的本機播放記錄，兩端自動合併',
    favorites: '本機收藏清單與不喜歡清單，不會變更網易雲帳號裡的喜歡',
    login: '網易雲登入資訊，另一台裝置同步後免登入'
  },
  loginWarning: 'Cookie 會以明文儲存在 WebDAV 伺服器上，請確認伺服器可信',
  loginConfirmTitle: '同步登入狀態',
  loginConfirmContent:
    '登入 Cookie 將以明文儲存到 WebDAV 伺服器，任何能讀取該檔案的人都可以直接登入你的帳號；多台裝置共用同一 Cookie 也可能觸發網易雲風控而被登出。在一台裝置登出，其他裝置同步後也會登出。確定要開啟嗎？',
  loginConfirmPositive: '我已了解，開啟',
  scheduleTitle: '同步時機',
  syncOnStartup: '啟動時自動同步',
  interval: '定時同步',
  intervalOptions: {
    off: '關閉',
    m15: '每 15 分鐘',
    m30: '每 30 分鐘',
    h1: '每 1 小時',
    h6: '每 6 小時',
    h24: '每 24 小時'
  },
  actions: {
    sync: '立即同步',
    upload: '上傳覆蓋遠端',
    restore: '從遠端還原'
  },
  uploadConfirm: '將以本機資料覆蓋遠端已開啟的同步內容，確定繼續嗎？',
  restoreConfirm: '將以遠端資料覆蓋本機已開啟的同步內容，確定繼續嗎？',
  status: {
    never: '尚未同步',
    lastSync: '上次同步：{time}',
    conflict: '部分內容兩端都有修改，請手動同步並選擇保留哪一邊'
  },
  conflictTitle: '同步衝突',
  conflictContent:
    '以下內容在本機和遠端都有修改：{categories}。要保留哪一邊？關閉此視窗則暫不處理。',
  keepLocal: '保留本機',
  useRemote: '使用遠端',
  result: {
    synced: '同步完成',
    upToDate: '已是最新，無需同步',
    conflictSkipped: 'WebDAV 同步：部分內容兩端都有修改，已略過，請到設定中手動同步',
    restartRequired: 'WebDAV 同步：已套用遠端資料，部分內容需要重新啟動應用程式後生效',
    restartNow: '立即重新啟動',
    later: '稍後'
  },
  errors: {
    invalidUrl: '伺服器位址無效，請填寫 http(s) 開頭的 WebDAV 位址',
    auth: '驗證失敗，請檢查使用者名稱和密碼',
    http: '伺服器回傳錯誤（{status}）',
    network: '無法連線到伺服器，請檢查位址與網路',
    invalidFile: '遠端檔案不是有效的同步檔案，或由較新版本的應用程式建立',
    noBackup: '遠端還沒有同步檔案',
    busy: '正在同步中，請稍候'
  }
};
