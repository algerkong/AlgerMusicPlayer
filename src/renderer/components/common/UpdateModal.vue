<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    :show-icon="false"
    :mask-closable="!isChecking"
    :closable="!isChecking"
    class="update-modal"
    style="width: 800px; max-width: 90vw"
  >
    <div class="p-6 pb-4">
      <div class="mb-6 flex items-center">
        <div
          class="mr-5 h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl shadow-lg ring-2 ring-neutral-100 dark:ring-neutral-800"
        >
          <img src="@/assets/logo.png" alt="App Icon" class="h-full w-full object-cover" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="mb-1.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ t('comp.update.title') }} {{ updateVersionText }}
          </h2>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            >
              {{ t('comp.update.currentVersion') }} {{ currentVersionText }}
            </span>
            <span
              v-if="showNewBadge"
              class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20"
            >
              NEW
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="hasReleaseNotes"
        class="mb-6 overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-800/50"
      >
        <n-scrollbar style="max-height: 300px">
          <div
            class="update-body p-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300"
            v-html="parsedReleaseNotes"
          />
        </n-scrollbar>
      </div>

      <div
        v-if="showProgressCard"
        class="mb-6 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50"
      >
        <div class="mb-2.5 flex items-center justify-between">
          <span class="text-sm text-neutral-500 dark:text-neutral-400">{{ progressText }}</span>
          <span class="text-sm font-bold text-primary">{{ progressPercent }}%</span>
        </div>
        <div
          class="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
        >
          <div
            class="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(34,197,94,0.4)]"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <div
        v-if="showErrorCard"
        class="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
      >
        <div class="mb-1 font-semibold">{{ t('comp.update.autoUpdateFailed') }}</div>
        <div>{{ errorText }}</div>
      </div>

      <div class="flex gap-3" :class="{ 'mt-6': !showProgressCard }">
        <button
          class="flex-1 rounded-xl bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-600 transition-all duration-200 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          :disabled="isChecking"
          @click="closeModal"
        >
          {{ t('comp.update.cancel') }}
        </button>
        <button
          class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="primaryButtonDisabled"
          @click="handlePrimaryAction"
        >
          {{ primaryButtonText }}
        </button>
      </div>

      <p
        v-if="showManualHint"
        class="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500"
      >
        {{ t('comp.update.manualFallbackHint') }}
      </p>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { marked } from 'marked';
import { computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSettingsStore } from '@/store/modules/settings';

import {
  APP_UPDATE_STATUS,
  type AppUpdateState,
  createDefaultAppUpdateState
} from '../../../shared/appUpdate';

marked.setOptions({ breaks: true, gfm: true });

const { t } = useI18n();
const message = useMessage();
const settingsStore = useSettingsStore();

const showModal = computed({
  get: () => settingsStore.showUpdateModal,
  set: (value) => settingsStore.setShowUpdateModal(value)
});

const updateState = computed(() => settingsStore.appUpdateState);
const isChecking = computed(() => updateState.value.status === APP_UPDATE_STATUS.checking);
const isDownloading = computed(() => updateState.value.status === APP_UPDATE_STATUS.downloading);
const isDownloaded = computed(() => updateState.value.status === APP_UPDATE_STATUS.downloaded);
const showErrorCard = computed(() => updateState.value.status === APP_UPDATE_STATUS.error);
const showManualHint = computed(() => showErrorCard.value);
const showProgressCard = computed(() => isDownloading.value || isDownloaded.value);
const showNewBadge = computed(
  () =>
    updateState.value.status === APP_UPDATE_STATUS.available ||
    updateState.value.status === APP_UPDATE_STATUS.downloading ||
    updateState.value.status === APP_UPDATE_STATUS.downloaded
);
const hasReleaseNotes = computed(() => Boolean(updateState.value.releaseNotes));

const currentVersionText = computed(() => updateState.value.currentVersion || '--');
const updateVersionText = computed(() => updateState.value.availableVersion || '--');
const progressPercent = computed(() => Math.round(updateState.value.downloadProgress));
const errorText = computed(() => updateState.value.errorMessage || t('comp.update.downloadFailed'));

const parsedReleaseNotes = computed(() => {
  const releaseNotes = updateState.value.releaseNotes;
  if (!releaseNotes) return '';

  try {
    return marked.parse(releaseNotes) as string;
  } catch (error) {
    console.error('Markdown 解析失败:', error);
    return releaseNotes;
  }
});

const progressText = computed(() => {
  if (isDownloaded.value) {
    return t('comp.update.readyToInstall');
  }

  if (!isDownloading.value) {
    return t('comp.update.prepareDownload');
  }

  const downloaded = formatBytes(updateState.value.downloadedBytes);
  const total = formatBytes(updateState.value.totalBytes);
  return `${t('comp.update.downloading')} ${downloaded} / ${total}`;
});

const primaryButtonText = computed(() => {
  switch (updateState.value.status) {
    case APP_UPDATE_STATUS.checking:
      return t('comp.update.checking');
    case APP_UPDATE_STATUS.available:
      return t('comp.update.nowUpdate');
    case APP_UPDATE_STATUS.downloading:
      return t('comp.update.backgroundDownload');
    case APP_UPDATE_STATUS.downloaded:
      return t('comp.update.yesInstall');
    case APP_UPDATE_STATUS.error:
      return t('comp.update.openOfficialSite');
    default:
      return t('comp.update.nowUpdate');
  }
});

const primaryButtonDisabled = computed(() => isChecking.value);

const formatBytes = (bytes: number): string => {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const base = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** base;
  return `${value.toFixed(base === 0 ? 0 : 2)} ${units[base]}`;
};

const syncUpdateState = (state: AppUpdateState) => {
  const previousStatus = settingsStore.appUpdateState.status;
  settingsStore.setAppUpdateState(state);

  if (
    state.status === APP_UPDATE_STATUS.available ||
    state.status === APP_UPDATE_STATUS.downloaded
  ) {
    settingsStore.setShowUpdateModal(true);
    return;
  }

  if (
    state.status === APP_UPDATE_STATUS.error &&
    (previousStatus === APP_UPDATE_STATUS.available ||
      previousStatus === APP_UPDATE_STATUS.downloading)
  ) {
    settingsStore.setShowUpdateModal(true);
  }
};

const closeModal = () => {
  showModal.value = false;
};

const handlePrimaryAction = async () => {
  try {
    switch (updateState.value.status) {
      case APP_UPDATE_STATUS.available:
        await window.api.downloadAppUpdate();
        break;
      case APP_UPDATE_STATUS.downloading:
        closeModal();
        break;
      case APP_UPDATE_STATUS.downloaded:
        await window.api.installAppUpdate();
        break;
      case APP_UPDATE_STATUS.error:
        await window.api.openAppUpdatePage();
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('执行更新操作失败:', error);
    message.error(t('comp.update.autoUpdateFailed'));
  }
};

const initializeUpdateState = async () => {
  try {
    const currentState = await window.api.getAppUpdateState();
    syncUpdateState(currentState);

    if (currentState.supported && currentState.status === APP_UPDATE_STATUS.idle) {
      await window.api.checkAppUpdate(false);
    }
  } catch (error) {
    console.error('初始化更新状态失败:', error);
    settingsStore.setAppUpdateState(createDefaultAppUpdateState());
  }
};

onMounted(() => {
  window.api.removeAppUpdateListeners();
  window.api.onAppUpdateState(syncUpdateState);
  void initializeUpdateState();
});

onUnmounted(() => {
  window.api.removeAppUpdateListeners();
});
</script>

<style scoped>
.update-modal :deep(.n-dialog) {
  border-radius: 1.25rem;
  overflow: hidden;
}

.update-body :deep(h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.update-body :deep(h2) {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.update-body :deep(h3) {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.update-body :deep(p) {
  margin-bottom: 0.75rem;
  line-height: 1.625;
}

.update-body :deep(ul) {
  list-style-type: disc;
  list-style-position: inside;
  margin-bottom: 0.75rem;
}

.update-body :deep(ol) {
  list-style-type: decimal;
  list-style-position: inside;
  margin-bottom: 0.75rem;
}

.update-body :deep(li) {
  margin-bottom: 0.5rem;
  line-height: 1.625;
}

.update-body :deep(code) {
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  background-color: rgb(245 245 245);
}

.dark .update-body :deep(code) {
  background-color: rgb(64 64 64);
}

.update-body :deep(pre) {
  padding: 0.75rem;
  border-radius: 0.75rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
  background-color: rgb(245 245 245);
}

.dark .update-body :deep(pre) {
  background-color: rgb(64 64 64);
}

.update-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.update-body :deep(blockquote) {
  padding-left: 1rem;
  border-left: 0.25rem solid rgb(229 229 229);
  margin-bottom: 0.75rem;
  color: rgb(115 115 115);
}

.dark .update-body :deep(blockquote) {
  border-left-color: rgb(82 82 82);
  color: rgb(163 163 163);
}

.update-body :deep(a) {
  color: rgb(var(--primary-color));
  text-decoration: underline;
}

.update-body :deep(a:hover) {
  opacity: 0.85;
}

.update-body :deep(hr) {
  margin: 1rem 0;
  border: 0;
  border-top: 1px solid rgb(229 229 229);
}

.dark .update-body :deep(hr) {
  border-top-color: rgb(82 82 82);
}

.update-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
}

.update-body :deep(th),
.update-body :deep(td) {
  border: 1px solid rgb(229 229 229);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.dark .update-body :deep(th),
.dark .update-body :deep(td) {
  border-color: rgb(82 82 82);
}

.update-body :deep(th) {
  background-color: rgb(245 245 245);
}

.dark .update-body :deep(th) {
  background-color: rgb(64 64 64);
}
</style>
