<template>
  <setting-section v-if="isElectron" :title="t('settings.sections.application')">
    <setting-item
      :title="t('settings.application.closeAction')"
      :description="t('settings.application.closeActionDesc')"
    >
      <s-select
        v-model="setData.closeAction"
        :options="closeActionOptions"
        width="w-40 max-md:w-full"
      />
    </setting-item>

    <setting-item
      :title="t('settings.application.shortcut')"
      :description="t('settings.application.shortcutDesc')"
    >
      <s-btn @click="showShortcutModal = true">{{ t('common.configure') }}</s-btn>
    </setting-item>

    <setting-item v-if="isElectron" :title="t('settings.application.download')">
      <template #description>
        <n-switch v-model:value="setData.alwaysShowDownloadButton" class="mr-2">
          <template #checked>{{ t('common.show') }}</template>
          <template #unchecked>{{ t('common.hide') }}</template>
        </n-switch>
        {{ t('settings.application.downloadDesc') }}
      </template>
      <s-btn @click="router.push('/downloads')">
        {{ t('settings.application.download') }}
      </s-btn>
    </setting-item>

    <setting-item :title="t('settings.application.unlimitedDownload')">
      <template #description>
        <n-switch v-model:value="setData.unlimitedDownload" class="mr-2">
          <template #checked>{{ t('common.on') }}</template>
          <template #unchecked>{{ t('common.off') }}</template>
        </n-switch>
        {{ t('settings.application.unlimitedDownloadDesc') }}
      </template>
    </setting-item>

    <setting-item :title="t('settings.application.downloadPath')">
      <template #description>
        <span class="break-all">{{
          setData.downloadPath || t('settings.application.downloadPathDesc')
        }}</span>
      </template>
      <template #action>
        <div class="flex items-center gap-2">
          <s-btn @click="openDownloadPath">{{ t('common.open') }}</s-btn>
          <s-btn @click="selectDownloadPath">{{ t('common.modify') }}</s-btn>
        </div>
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.application.remoteControl')"
      :description="t('settings.application.remoteControlDesc')"
    >
      <s-btn @click="showRemoteControlModal = true">{{ t('common.configure') }}</s-btn>
    </setting-item>

    <shortcut-settings v-model:show="showShortcutModal" @change="handleShortcutsChange" />
    <remote-control-setting v-model:visible="showRemoteControlModal" />
  </setting-section>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import RemoteControlSetting from '@/components/settings/ServerSetting.vue';
import ShortcutSettings from '@/components/settings/ShortcutSettings.vue';
import { isElectron } from '@/utils';
import { openDirectory, selectDirectory } from '@/utils/fileOperation';

import { SETTINGS_DATA_KEY, SETTINGS_MESSAGE_KEY } from '../keys';
import SBtn from '../SBtn.vue';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';
import SSelect from '../SSelect.vue';

const { t } = useI18n();
const router = useRouter();
const setData = inject(SETTINGS_DATA_KEY)!;
const message = inject(SETTINGS_MESSAGE_KEY)!;

const showShortcutModal = ref(false);
const showRemoteControlModal = ref(false);

const closeActionOptions = computed(() => [
  { label: t('settings.application.closeOptions.ask'), value: 'ask' },
  { label: t('settings.application.closeOptions.minimize'), value: 'minimize' },
  { label: t('settings.application.closeOptions.close'), value: 'close' }
]);

const selectDownloadPath = async () => {
  const path = await selectDirectory(message);
  if (path) {
    setData.value = { ...setData.value, downloadPath: path };
  }
};

const openDownloadPath = () => {
  openDirectory(setData.value.downloadPath, message);
};

const handleShortcutsChange = (shortcuts: any) => {
  console.log('快捷键已更新:', shortcuts);
};
</script>
