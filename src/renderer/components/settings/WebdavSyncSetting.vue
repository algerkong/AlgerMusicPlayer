<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :title="t('webdav.title')"
    style="max-width: 650px; width: 100%"
  >
    <n-scrollbar style="max-height: 70vh">
      <div class="px-5">
        <n-form label-placement="left" label-width="auto">
          <n-form-item :label="t('webdav.url')">
            <n-input v-model:value="config.url" :placeholder="t('webdav.urlPlaceholder')" />
          </n-form-item>
          <n-form-item :label="t('webdav.username')">
            <n-input v-model:value="config.username" />
          </n-form-item>
          <n-form-item :label="t('webdav.password')">
            <n-input v-model:value="config.password" type="password" show-password-on="click" />
          </n-form-item>
          <n-form-item>
            <n-space>
              <n-button type="primary" @click="handleSave">{{ t('common.save') }}</n-button>
              <n-button :loading="testing" @click="handleTest">{{ t('webdav.test') }}</n-button>
            </n-space>
          </n-form-item>
        </n-form>

        <n-divider title-placement="left">{{ t('webdav.categoriesTitle') }}</n-divider>
        <div class="flex flex-col gap-3">
          <div
            v-for="category in BACKUP_CATEGORIES"
            :key="category"
            class="flex items-center justify-between gap-4"
          >
            <div class="min-w-0">
              <div class="text-sm">{{ t(`webdav.categories.${category}`) }}</div>
              <n-text depth="3" class="text-xs">{{ t(`webdav.categoryDesc.${category}`) }}</n-text>
              <div v-if="category === 'login'" class="text-xs text-red-500">
                {{ t('webdav.loginWarning') }}
              </div>
            </div>
            <n-switch
              :value="syncStore.categories[category]"
              @update:value="(value: boolean) => handleCategoryToggle(category, value)"
            />
          </div>
        </div>

        <n-divider title-placement="left">{{ t('webdav.scheduleTitle') }}</n-divider>
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-4">
            <span class="text-sm">{{ t('webdav.syncOnStartup') }}</span>
            <n-switch v-model:value="syncStore.syncOnStartup" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-sm">{{ t('webdav.interval') }}</span>
            <n-select
              v-model:value="syncStore.intervalMinutes"
              :options="intervalOptions"
              class="w-40"
            />
          </div>
        </div>

        <n-divider />
        <n-space>
          <n-button type="primary" :loading="syncStore.syncing" @click="handleSync('sync')">
            {{ t('webdav.actions.sync') }}
          </n-button>
          <n-button :disabled="syncStore.syncing" @click="confirmOverwrite('upload')">
            {{ t('webdav.actions.upload') }}
          </n-button>
          <n-button :disabled="syncStore.syncing" @click="confirmOverwrite('restore')">
            {{ t('webdav.actions.restore') }}
          </n-button>
        </n-space>
        <n-text depth="3" class="mt-3 block text-xs">{{ statusText }}</n-text>
      </div>
    </n-scrollbar>
  </n-modal>
</template>

<script setup lang="ts">
import { useDialog, useMessage } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  type ConflictResolver,
  runWebdavSync,
  type WebdavSyncErrorKind
} from '@/services/webdavSync';
import { useWebdavSyncStore } from '@/store/modules/webdavSync';
import { BACKUP_CATEGORIES, type BackupCategory, type SyncMode } from '@/utils/backupData';

import { createDefaultWebdavConfig } from '../../../shared/webdav';

const visible = defineModel('visible', { default: false });

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const syncStore = useWebdavSyncStore();

const config = ref(createDefaultWebdavConfig());
const testing = ref(false);

const intervalOptions = computed(() => [
  { label: t('webdav.intervalOptions.off'), value: 0 },
  { label: t('webdav.intervalOptions.m15'), value: 15 },
  { label: t('webdav.intervalOptions.m30'), value: 30 },
  { label: t('webdav.intervalOptions.h1'), value: 60 },
  { label: t('webdav.intervalOptions.h6'), value: 360 },
  { label: t('webdav.intervalOptions.h24'), value: 1440 }
]);

const statusText = computed(() => {
  const time = syncStore.lastSyncAt
    ? t('webdav.status.lastSync', { time: new Date(syncStore.lastSyncAt).toLocaleString() })
    : t('webdav.status.never');
  if (syncStore.lastStatus === 'error') {
    const [kind, status] = syncStore.lastError.split(':');
    return `${time} · ${errorText(kind as WebdavSyncErrorKind, Number(status) || undefined)}`;
  }
  if (syncStore.lastStatus === 'conflict') return `${time} · ${t('webdav.status.conflict')}`;
  return time;
});

const errorText = (kind: WebdavSyncErrorKind, status?: number): string =>
  t(`webdav.errors.${kind}`, { status: status ?? '' });

const saveConfig = async () => {
  await window.api.webdavSaveConfig({ ...config.value });
};

const handleSave = async () => {
  await saveConfig();
  message.success(t('webdav.configSaved'));
};

const handleTest = async () => {
  testing.value = true;
  try {
    await saveConfig();
    const result = await window.api.webdavTest();
    if (result.ok) {
      message.success(t('webdav.testSuccess'));
    } else {
      message.error(errorText(result.error, result.status));
    }
  } finally {
    testing.value = false;
  }
};

const handleCategoryToggle = (category: BackupCategory, value: boolean) => {
  if (category !== 'login' || !value) {
    syncStore.categories[category] = value;
    return;
  }
  // 登录状态含 Cookie，开启前必须让用户明确知道风险
  dialog.warning({
    title: t('webdav.loginConfirmTitle'),
    content: t('webdav.loginConfirmContent'),
    positiveText: t('webdav.loginConfirmPositive'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      syncStore.categories.login = true;
    }
  });
};

const askConflict: ConflictResolver = (categories) =>
  new Promise((resolve) => {
    dialog.warning({
      title: t('webdav.conflictTitle'),
      content: t('webdav.conflictContent', {
        categories: categories.map((category) => t(`webdav.categories.${category}`)).join('、')
      }),
      positiveText: t('webdav.keepLocal'),
      negativeText: t('webdav.useRemote'),
      onPositiveClick: () => resolve('local'),
      onNegativeClick: () => resolve('remote'),
      onClose: () => resolve(null),
      onMaskClick: () => resolve(null),
      onEsc: () => resolve(null)
    });
  });

const handleSync = async (mode: SyncMode) => {
  await saveConfig();
  const result = await runWebdavSync(mode, askConflict);
  if (!result.ok) {
    message.error(errorText(result.error, result.status));
    return;
  }

  if (result.conflicts.length) {
    message.warning(t('webdav.result.conflictSkipped'));
  } else if (result.uploaded.length || result.downloaded.length) {
    message.success(t('webdav.result.synced'));
  } else {
    message.success(t('webdav.result.upToDate'));
  }

  if (result.needsRestart) {
    dialog.info({
      title: t('webdav.title'),
      content: t('webdav.result.restartRequired'),
      positiveText: t('webdav.result.restartNow'),
      negativeText: t('webdav.result.later'),
      onPositiveClick: () => window.api.restart()
    });
  }
};

const confirmOverwrite = (mode: 'upload' | 'restore') => {
  dialog.warning({
    title: t(`webdav.actions.${mode}`),
    content: mode === 'upload' ? t('webdav.uploadConfirm') : t('webdav.restoreConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      handleSync(mode);
    }
  });
};

onMounted(async () => {
  try {
    config.value = await window.api.webdavGetConfig();
  } catch (error) {
    console.error('获取 WebDAV 配置失败:', error);
  }
});
</script>
