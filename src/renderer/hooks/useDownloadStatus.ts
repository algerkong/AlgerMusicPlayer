import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const downloadList = ref<any[]>([]);
const isInitialized = ref(false);

export const useDownloadStatus = () => {
  const router = useRouter();

  const downloadingCount = computed(() => {
    return downloadList.value.filter((item) => item.status === 'downloading').length;
  });

  const navigateToDownloads = () => {
    router.push('/downloads');
  };

  const initDownloadListeners = () => {
    if (isInitialized.value) return;

    if (!window.electron?.ipcRenderer) return;

    window.electron.ipcRenderer.on('music-download-progress', (_, data) => {
      const existingItem = downloadList.value.find((item) => item.filename === data.filename);

      if (data.progress === 100) {
        data.status = 'completed';
      }

      if (existingItem) {
        Object.assign(existingItem, {
          ...data,
          songInfo: data.songInfo || existingItem.songInfo
        });

        if (data.status === 'completed') {
          downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
        }
      } else {
        downloadList.value.push({
          ...data,
          songInfo: data.songInfo
        });
      }
    });

    window.electron.ipcRenderer.on('music-download-complete', async (_, data) => {
      if (data.success) {
        downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
      } else {
        const existingItem = downloadList.value.find((item) => item.filename === data.filename);
        if (existingItem) {
          Object.assign(existingItem, {
            status: 'error',
            error: data.error,
            progress: 0
          });
          setTimeout(() => {
            downloadList.value = downloadList.value.filter(
              (item) => item.filename !== data.filename
            );
          }, 3000);
        }
      }
    });

    window.electron.ipcRenderer.on('music-download-queued', (_, data) => {
      const existingItem = downloadList.value.find((item) => item.filename === data.filename);
      if (!existingItem) {
        downloadList.value.push({
          filename: data.filename,
          progress: 0,
          loaded: 0,
          total: 0,
          path: '',
          status: 'downloading',
          songInfo: data.songInfo
        });
      }
    });

    isInitialized.value = true;
  };

  onMounted(() => {
    initDownloadListeners();
  });

  return {
    downloadList,
    downloadingCount,
    navigateToDownloads
  };
};
