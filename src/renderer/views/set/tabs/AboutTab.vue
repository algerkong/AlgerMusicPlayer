<template>
  <setting-section :title="t('settings.sections.about')">
    <setting-item :title="t('settings.about.version')">
      <template #description>
        <div class="flex flex-wrap items-center gap-2">
          <span>{{ updateInfo.currentVersion }}</span>
          <n-tag v-if="updateInfo.hasUpdate" type="success">
            {{ t('settings.about.hasUpdate') }} {{ updateInfo.latestVersion }}
          </n-tag>
        </div>
        <div v-if="hasManualUpdateFallback" class="mt-2 text-xs text-amber-600">
          <i class="ri-information-line mr-1"></i>
          {{ appUpdateState.errorMessage || t('settings.about.messages.checkError') }}
        </div>
      </template>
      <template #action>
        <div class="flex items-center gap-2 flex-wrap">
          <s-btn :loading="checking" @click="checkForUpdates(true)">
            {{ checking ? t('settings.about.checking') : t('settings.about.checkUpdate') }}
          </s-btn>
          <s-btn v-if="updateInfo.hasUpdate" variant="primary" @click="openReleasePage">
            {{ t('settings.about.gotoUpdate') }}
          </s-btn>
          <s-btn v-if="hasManualUpdateFallback" variant="ghost" @click="openManualUpdatePage">
            {{ t('settings.about.manualUpdate') }}
          </s-btn>
        </div>
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.about.author')"
      :description="t('settings.about.authorDesc')"
      clickable
      @click="openAuthor"
    >
      <s-btn @click.stop="openAuthor">
        <i class="ri-github-line mr-1"></i>{{ t('settings.about.gotoGithub') }}
      </s-btn>
    </setting-item>
  </setting-section>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSettingsStore } from '@/store/modules/settings';
import { isElectron } from '@/utils';
import { checkUpdate, UpdateResult } from '@/utils/update';

import config from '../../../../../package.json';
import { APP_UPDATE_STATUS, hasAvailableAppUpdate } from '../../../../shared/appUpdate';
import { SETTINGS_DATA_KEY, SETTINGS_MESSAGE_KEY } from '../keys';
import SBtn from '../SBtn.vue';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const setData = inject(SETTINGS_DATA_KEY)!;
const message = inject(SETTINGS_MESSAGE_KEY)!;

const checking = ref(false);
const webUpdateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

const appUpdateState = computed(() => settingsStore.appUpdateState);
const hasAppUpdate = computed(() => hasAvailableAppUpdate(appUpdateState.value));
const hasManualUpdateFallback = computed(
  () => isElectron && appUpdateState.value.status === APP_UPDATE_STATUS.error
);

const updateInfo = computed<UpdateResult>(() => {
  if (!isElectron) {
    return webUpdateInfo.value;
  }

  return {
    hasUpdate: hasAppUpdate.value,
    latestVersion: appUpdateState.value.availableVersion ?? '',
    currentVersion: appUpdateState.value.currentVersion || config.version,
    releaseInfo: appUpdateState.value.availableVersion
      ? {
          tag_name: appUpdateState.value.availableVersion,
          body: appUpdateState.value.releaseNotes,
          html_url: appUpdateState.value.releasePageUrl,
          assets: []
        }
      : null
  };
});

const checkForUpdates = async (isClick = false) => {
  checking.value = true;
  try {
    if (isElectron) {
      const result = await window.api.checkAppUpdate(isClick);
      settingsStore.setAppUpdateState(result);

      if (hasAvailableAppUpdate(result)) {
        if (isClick) {
          settingsStore.setShowUpdateModal(true);
        }
      } else if (result.status === APP_UPDATE_STATUS.notAvailable && isClick) {
        message.success(t('settings.about.latest'));
      } else if (result.status === APP_UPDATE_STATUS.error && isClick) {
        message.error(result.errorMessage || t('settings.about.messages.checkError'));
      }

      return;
    }

    const result = await checkUpdate(config.version);
    if (result) {
      webUpdateInfo.value = result;
      if (!result.hasUpdate && isClick) {
        message.success(t('settings.about.latest'));
      }
    } else if (isClick) {
      message.success(t('settings.about.latest'));
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    if (isClick) {
      message.error(t('settings.about.messages.checkError'));
    }
  } finally {
    checking.value = false;
  }
};

const openReleasePage = () => {
  if (isElectron) {
    settingsStore.setShowUpdateModal(true);
    return;
  }

  window.open(updateInfo.value.releaseInfo?.html_url || setData.value.authorUrl);
};

const openManualUpdatePage = async () => {
  if (isElectron) {
    await window.api.openAppUpdatePage();
    return;
  }

  window.open(updateInfo.value.releaseInfo?.html_url || setData.value.authorUrl);
};

const openAuthor = () => {
  window.open(setData.value.authorUrl);
};

defineExpose({ checkForUpdates });
</script>
