export default {
  title: 'WebDAV 同步',
  entryDesc: '把设置、音源插件、播放记录等同步到自己的 WebDAV',
  url: '服务器地址',
  urlPlaceholder: '例如 https://dav.jianguoyun.com/dav/',
  username: '用户名',
  password: '密码',
  test: '测试连接',
  testSuccess: '连接成功',
  configSaved: 'WebDAV 配置已保存',
  categoriesTitle: '同步内容',
  categories: {
    settings: '设置',
    plugins: '音源插件',
    history: '播放记录',
    favorites: '收藏',
    login: '登录状态'
  },
  categoryDesc: {
    settings: '外观、播放、快捷键、歌词与均衡器等，不含下载目录、缓存、代理等本机相关项',
    plugins: '已安装的音源插件、音源顺序与插件变量（变量中的密钥会一并上传）',
    history: '歌曲、歌单、专辑、播客的本地播放记录，两端自动合并',
    favorites: '本地收藏列表与不喜欢列表，不会改动网易云账号里的喜欢',
    login: '网易云登录信息，另一台设备同步后免登录'
  },
  loginWarning: 'Cookie 会以明文保存在 WebDAV 服务器上，请确认服务器可信',
  loginConfirmTitle: '同步登录状态',
  loginConfirmContent:
    '登录 Cookie 将以明文保存到 WebDAV 服务器，任何能读取该文件的人都可以直接登录你的账号；多台设备共用同一 Cookie 也可能触发网易云风控而被下线。在一台设备退出登录，其他设备同步后也会退出。确定要开启吗？',
  loginConfirmPositive: '我已了解，开启',
  scheduleTitle: '同步时机',
  syncOnStartup: '启动时自动同步',
  interval: '定时同步',
  intervalOptions: {
    off: '关闭',
    m15: '每 15 分钟',
    m30: '每 30 分钟',
    h1: '每 1 小时',
    h6: '每 6 小时',
    h24: '每 24 小时'
  },
  actions: {
    sync: '立即同步',
    upload: '上传覆盖远端',
    restore: '从远端恢复'
  },
  uploadConfirm: '将用本机数据覆盖远端已开启的同步内容，确定继续吗？',
  restoreConfirm: '将用远端数据覆盖本机已开启的同步内容，确定继续吗？',
  status: {
    never: '尚未同步',
    lastSync: '上次同步：{time}',
    conflict: '部分内容两端都有修改，请手动同步并选择保留哪一边'
  },
  conflictTitle: '同步冲突',
  conflictContent:
    '以下内容在本机和远端都有修改：{categories}。要保留哪一边？关闭此窗口则暂不处理。',
  keepLocal: '保留本机',
  useRemote: '使用远端',
  result: {
    synced: '同步完成',
    upToDate: '已是最新，无需同步',
    conflictSkipped: 'WebDAV 同步：部分内容两端都有修改，已跳过，请到设置中手动同步',
    restartRequired: 'WebDAV 同步：已应用远端数据，部分内容需要重启应用后生效',
    restartNow: '立即重启',
    later: '稍后'
  },
  errors: {
    invalidUrl: '服务器地址无效，请填写 http(s) 开头的 WebDAV 地址',
    auth: '认证失败，请检查用户名和密码',
    http: '服务器返回错误（{status}）',
    network: '无法连接到服务器，请检查地址与网络',
    invalidFile: '远端文件不是有效的同步文件，或由更新版本的应用创建',
    noBackup: '远端还没有同步文件',
    busy: '正在同步中，请稍候'
  }
};
