import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { isElectron } from '@/utils';

import {
  createDefaultDownloadSettings,
  DOWNLOAD_TASK_STATE,
  type DownloadSettings,
  type DownloadTask
} from '../../../shared/download';

const DEFAULT_COVER = '/images/default_cover.png';

function validatePicUrl(url?: string): string {
  if (!url || url === '' || url.startsWith('/')) return DEFAULT_COVER;
  return url.replace(/^http:\/\//, 'https://');
}

export const useDownloadStore = defineStore(
  'download',
  () => {
    // ── State ──────────────────────────────────────────────────────────────
    const tasks = ref(new Map<string, DownloadTask>());
    const completedList = ref<any[]>([]);
    const settings = ref<DownloadSettings>(createDefaultDownloadSettings());
    const isLoadingCompleted = ref(false);

    // Track whether IPC listeners have been registered
    let listenersInitialised = false;

    // ── Computed ───────────────────────────────────────────────────────────
    const downloadingList = computed(() => {
      const active = [
        DOWNLOAD_TASK_STATE.queued,
        DOWNLOAD_TASK_STATE.downloading,
        DOWNLOAD_TASK_STATE.paused
      ] as string[];
      return [...tasks.value.values()]
        .filter((t) => active.includes(t.state))
        .sort((a, b) => a.createdAt - b.createdAt);
    });

    const downloadingCount = computed(() => downloadingList.value.length);

    const totalProgress = computed(() => {
      const list = downloadingList.value;
      if (list.length === 0) return 0;
      const sum = list.reduce((acc, t) => acc + t.progress, 0);
      return sum / list.length;
    });

    // ── Actions ────────────────────────────────────────────────────────────
    const addDownload = async (songInfo: DownloadTask['songInfo'], url: string, type: string) => {
      if (!isElectron) return;
      const validatedInfo = {
        ...songInfo,
        picUrl: validatePicUrl(songInfo.picUrl)
      };
      const artistNames = validatedInfo.ar?.map((a) => a.name).join(',') ?? '';
      const filename = `${validatedInfo.name} - ${artistNames}`;
      await window.api.downloadAdd({ url, filename, songInfo: validatedInfo, type });
    };

    const batchDownload = async (
      items: Array<{ songInfo: DownloadTask['songInfo']; url: string; type: string }>
    ) => {
      if (!isElectron) return;
      const validatedItems = items.map((item) => {
        const validatedInfo = {
          ...item.songInfo,
          picUrl: validatePicUrl(item.songInfo.picUrl)
        };
        const artistNames = validatedInfo.ar?.map((a) => a.name).join(',') ?? '';
        const filename = `${validatedInfo.name} - ${artistNames}`;
        return { url: item.url, filename, songInfo: validatedInfo, type: item.type };
      });
      await window.api.downloadAddBatch({ items: validatedItems });
    };

    const pauseTask = async (taskId: string) => {
      if (!isElectron) return;
      await window.api.downloadPause(taskId);
    };

    const resumeTask = async (taskId: string) => {
      if (!isElectron) return;
      await window.api.downloadResume(taskId);
    };

    const cancelTask = async (taskId: string) => {
      if (!isElectron) return;
      await window.api.downloadCancel(taskId);
      tasks.value.delete(taskId);
    };

    const cancelAll = async () => {
      if (!isElectron) return;
      await window.api.downloadCancelAll();
      tasks.value.clear();
    };

    const updateConcurrency = async (n: number) => {
      if (!isElectron) return;
      const clamped = Math.min(5, Math.max(1, n));
      settings.value = { ...settings.value, maxConcurrent: clamped };
      await window.api.downloadSetConcurrency(clamped);
    };

    const refreshCompleted = async () => {
      if (!isElectron) return;
      isLoadingCompleted.value = true;
      try {
        const list = await window.api.downloadGetCompleted();
        completedList.value = list;
      } finally {
        isLoadingCompleted.value = false;
      }
    };

    const deleteCompleted = async (filePath: string) => {
      if (!isElectron) return;
      await window.api.downloadDeleteCompleted(filePath);
      completedList.value = completedList.value.filter((item) => item.filePath !== filePath);
    };

    const clearCompleted = async () => {
      if (!isElectron) return;
      await window.api.downloadClearCompleted();
      completedList.value = [];
    };

    const loadPersistedQueue = async () => {
      if (!isElectron) return;
      const queue = await window.api.downloadGetQueue();
      tasks.value.clear();
      for (const task of queue) {
        tasks.value.set(task.taskId, task);
      }
    };

    const initListeners = () => {
      if (!isElectron || listenersInitialised) return;
      listenersInitialised = true;

      window.api.onDownloadProgress((event) => {
        const task = tasks.value.get(event.taskId);
        if (task) {
          tasks.value.set(event.taskId, {
            ...task,
            progress: event.progress,
            loaded: event.loaded,
            total: event.total
          });
        }
      });

      window.api.onDownloadStateChange((event) => {
        const { taskId, state, task } = event;
        if (state === DOWNLOAD_TASK_STATE.completed || state === DOWNLOAD_TASK_STATE.cancelled) {
          tasks.value.delete(taskId);
          if (state === DOWNLOAD_TASK_STATE.completed) {
            setTimeout(() => {
              refreshCompleted();
            }, 500);
          }
        } else {
          tasks.value.set(taskId, task);
        }
      });

      window.api.onDownloadBatchComplete((_event) => {
        // no-op: main process handles the desktop notification
      });

      window.api.onDownloadRequestUrl(async (event) => {
        try {
          const { getSongUrl } = await import('@/store/modules/player');
          const result = (await getSongUrl(event.songInfo.id, event.songInfo as any, true)) as any;
          const url = typeof result === 'string' ? result : (result?.url ?? '');
          await window.api.downloadProvideUrl(event.taskId, url);
        } catch (err) {
          console.error('[downloadStore] onDownloadRequestUrl failed:', err);
          await window.api.downloadProvideUrl(event.taskId, '');
        }
      });
    };

    const cleanup = () => {
      if (!isElectron) return;
      window.api.removeDownloadListeners();
      listenersInitialised = false;
    };

    return {
      // state
      tasks,
      completedList,
      settings,
      isLoadingCompleted,
      // computed
      downloadingList,
      downloadingCount,
      totalProgress,
      // actions
      addDownload,
      batchDownload,
      pauseTask,
      resumeTask,
      cancelTask,
      cancelAll,
      updateConcurrency,
      refreshCompleted,
      deleteCompleted,
      clearCompleted,
      loadPersistedQueue,
      initListeners,
      cleanup
    };
  },
  {
    persist: {
      key: 'download-settings',
      // WARNING: Do NOT add 'tasks' — Map doesn't serialize with JSON.stringify
      pick: ['settings']
    }
  }
);
