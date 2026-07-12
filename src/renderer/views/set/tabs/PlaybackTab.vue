<template>
  <setting-section :title="t('settings.sections.playback')">
    <setting-item
      v-if="platform === 'darwin'"
      :title="t('settings.playback.showStatusBar')"
      :description="t('settings.playback.showStatusBarContent')"
    >
      <template #action>
        <n-switch v-model:value="setData.showTopAction">
          <template #checked>{{ t('common.on') }}</template>
          <template #unchecked>{{ t('common.off') }}</template>
        </n-switch>
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.playback.autoPlay')"
      :description="t('settings.playback.autoPlayDesc')"
    >
      <template #action>
        <n-switch v-model:value="setData.autoPlay">
          <template #checked>{{ t('common.on') }}</template>
          <template #unchecked>{{ t('common.off') }}</template>
        </n-switch>
      </template>
    </setting-item>
  </setting-section>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';

import { isElectron } from '@/utils';

import { SETTINGS_DATA_KEY } from '../keys';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';

const { t } = useI18n();
const setData = inject(SETTINGS_DATA_KEY)!;
const platform = isElectron ? window.electron.ipcRenderer.sendSync('get-platform') : 'web';
</script>
