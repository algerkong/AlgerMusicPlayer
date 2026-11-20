export default {
  title: 'WebDAV Sync',
  entryDesc: 'Sync settings, source plugins, play history and more to your own WebDAV',
  url: 'Server URL',
  urlPlaceholder: 'e.g. https://dav.jianguoyun.com/dav/',
  username: 'Username',
  password: 'Password',
  test: 'Test Connection',
  testSuccess: 'Connected',
  configSaved: 'WebDAV configuration saved',
  categoriesTitle: 'What to Sync',
  categories: {
    settings: 'Settings',
    plugins: 'Source Plugins',
    history: 'Play History',
    favorites: 'Favorites',
    login: 'Login State'
  },
  categoryDesc: {
    settings:
      'Appearance, playback, shortcuts, lyrics and equalizer. Excludes device-specific items such as download folder, cache and proxy',
    plugins:
      'Installed source plugins, source order and plugin variables (secrets in variables are uploaded too)',
    history: 'Local play history of songs, playlists, albums and podcasts, merged automatically',
    favorites: 'Local favorites and dislike list. Likes in your NetEase account are not changed',
    login: 'NetEase login info, so other devices are signed in after syncing'
  },
  loginWarning: 'The cookie is stored in plain text on the WebDAV server. Make sure you trust it',
  loginConfirmTitle: 'Sync Login State',
  loginConfirmContent:
    'Your login cookie will be stored in plain text on the WebDAV server. Anyone who can read that file can sign in to your account, and sharing one cookie across devices may trigger NetEase risk control and sign you out. Logging out on one device also logs out the others after they sync. Enable anyway?',
  loginConfirmPositive: 'I understand, enable',
  scheduleTitle: 'When to Sync',
  syncOnStartup: 'Sync on startup',
  interval: 'Scheduled sync',
  intervalOptions: {
    off: 'Off',
    m15: 'Every 15 minutes',
    m30: 'Every 30 minutes',
    h1: 'Every hour',
    h6: 'Every 6 hours',
    h24: 'Every 24 hours'
  },
  actions: {
    sync: 'Sync Now',
    upload: 'Upload & Overwrite Remote',
    restore: 'Restore from Remote'
  },
  uploadConfirm: 'Local data will overwrite the enabled categories on the remote. Continue?',
  restoreConfirm: 'Remote data will overwrite the enabled categories on this device. Continue?',
  status: {
    never: 'Never synced',
    lastSync: 'Last sync: {time}',
    conflict: 'Some categories changed on both sides. Sync manually and choose which side to keep'
  },
  conflictTitle: 'Sync Conflict',
  conflictContent:
    'These categories changed both locally and remotely: {categories}. Which side do you want to keep? Close this dialog to leave them untouched.',
  keepLocal: 'Keep Local',
  useRemote: 'Use Remote',
  result: {
    synced: 'Sync complete',
    upToDate: 'Already up to date',
    conflictSkipped:
      'WebDAV sync: some categories changed on both sides and were skipped. Sync manually in Settings',
    restartRequired: 'WebDAV sync: remote data applied. Some changes take effect after a restart',
    restartNow: 'Restart Now',
    later: 'Later'
  },
  errors: {
    invalidUrl: 'Invalid server URL. Enter a WebDAV address starting with http(s)',
    auth: 'Authentication failed. Check your username and password',
    http: 'Server returned an error ({status})',
    network: 'Cannot reach the server. Check the URL and your network',
    invalidFile: 'The remote file is not a valid sync file, or was created by a newer app version',
    noBackup: 'No sync file on the remote yet',
    busy: 'A sync is already running'
  }
};
