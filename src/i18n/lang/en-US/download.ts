export default {
  title: 'Download Manager',
  localMusic: 'Local Music',
  count: '{count} songs in total',
  clearAll: 'Clear All',
  settings: 'Settings',
  tabs: {
    downloading: 'Downloading',
    downloaded: 'Downloaded'
  },
  empty: {
    noTasks: 'No download tasks',
    noDownloaded: 'No downloaded songs',
    noDownloadedHint: 'Download your favorite songs to listen offline'
  },
  progress: {
    total: 'Total Progress: {progress}%'
  },
  items: 'items',
  status: {
    downloading: 'Downloading',
    completed: 'Completed',
    failed: 'Failed',
    unknown: 'Unknown'
  },
  artist: {
    unknown: 'Unknown Artist'
  },
  delete: {
    title: 'Delete Confirmation',
    message: 'Are you sure you want to delete "{filename}"? This action cannot be undone.',
    confirm: 'Delete',
    cancel: 'Cancel',
    success: 'Successfully deleted',
    failed: 'Failed to delete',
    fileNotFound: 'File not found or moved, removed from records',
    recordRemoved: 'Failed to delete file, but removed from records'
  },
  clear: {
    title: 'Clear Download Records',
    message:
      'Are you sure you want to clear all download records? This will not delete the actual music files, but will clear all records.',
    confirm: 'Clear',
    cancel: 'Cancel',
    success: 'Download records cleared'
  },
  message: {
    downloadComplete: '{filename} download completed',
    downloadFailed: '{filename} download failed: {error}',
    alreadyDownloading: '{filename} is already downloading'
  },
  loading: 'Loading...',
  playStarted: 'Play started: {name}',
  playFailed: 'Play failed: {name}',
  path: {
    copied: 'Path copied to clipboard',
    copyFailed: 'Failed to copy path'
  },
  settingsPanel: {
    title: 'Download Settings',
    path: 'Download Location',
    pathDesc: 'Set where your music files will be saved',
    pathPlaceholder: 'Please select download path',
    noPathSelected: 'Please select download path first',
    select: 'Select Folder',
    open: 'Open Folder',
    fileFormat: 'Filename Format',
    fileFormatDesc: 'Set how downloaded music files will be named',
    customFormat: 'Custom Format',
    separator: 'Separator',
    separators: {
      dash: 'Space-dash-space',
      underscore: 'Underscore',
      space: 'Space'
    },
    dragToArrange: 'Sort or use arrow buttons to arrange:',
    formatVariables: 'Available variables',
    preview: 'Preview:',
    saveSuccess: 'Download settings saved',
    presets: {
      songArtist: 'Song - Artist',
      artistSong: 'Artist - Song',
      songOnly: 'Song only'
    },
    components: {
      songName: 'Song name',
      artistName: 'Artist name',
      albumName: 'Album name'
    }
  }
};
