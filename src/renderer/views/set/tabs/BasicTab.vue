<template>
  <!-- 通用：语言 / 播放偏好 / 窗口行为 -->
  <setting-section>
    <setting-item
      :title="t('settings.basic.language')"
      :description="t('settings.basic.languageDesc')"
    >
      <template #action>
        <div class="min-w-[140px]">
          <language-switcher />
        </div>
      </template>
    </setting-item>

    <setting-item
      v-if="!isElectron"
      :title="t('settings.basic.tabletMode')"
      :description="t('settings.basic.tabletModeDesc')"
    >
      <template #action>
        <n-switch v-model:value="setData.tabletMode">
          <template #checked><i class="ri-tablet-line" /></template>
          <template #unchecked><i class="ri-smartphone-line" /></template>
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
      v-if="isElectron"
      :title="t('settings.application.closeAction')"
      :description="t('settings.application.closeActionDesc')"
    >
      <template #action>
        <s-select
          v-model="setData.closeAction"
          :options="closeActionOptions"
          width="w-40 max-md:w-full"
        />
      </template>
    </setting-item>
  </setting-section>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';

import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { isElectron } from '@/utils';

import { SETTINGS_DATA_KEY } from '../keys';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';
import SSelect from '../SSelect.vue';

const { t } = useI18n();
const setData = inject(SETTINGS_DATA_KEY)!;
const platform = isElectron ? window.electron.ipcRenderer.sendSync('get-platform') : 'web';

const closeActionOptions = computed(() => [
  { label: t('settings.application.closeOptions.ask'), value: 'ask' },
  { label: t('settings.application.closeOptions.minimize'), value: 'minimize' },
  { label: t('settings.application.closeOptions.close'), value: 'close' }
]);
</script>
