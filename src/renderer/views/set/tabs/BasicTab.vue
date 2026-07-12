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
        <ui-switch v-model="setData.tabletMode" />
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.playback.autoPlay')"
      :description="t('settings.playback.autoPlayDesc')"
    >
      <template #action>
        <ui-switch v-model="setData.autoPlay" />
      </template>
    </setting-item>

    <setting-item
      v-if="platform === 'darwin'"
      :title="t('settings.playback.showStatusBar')"
      :description="t('settings.playback.showStatusBarContent')"
    >
      <template #action>
        <ui-switch v-model="setData.showTopAction" />
      </template>
    </setting-item>

    <setting-item
      v-if="isElectron"
      :title="t('settings.application.closeAction')"
      :description="t('settings.application.closeActionDesc')"
    >
      <template #action>
        <ui-select v-model="setData.closeAction">
          <select-trigger class="w-40 max-md:w-full">
            <select-value :placeholder="closeActionLabel">
              {{ closeActionLabel }}
            </select-value>
          </select-trigger>
          <select-content position="popper" class="z-[9999]">
            <select-item
              v-for="opt in closeActionOptions"
              :key="String(opt.value)"
              :value="opt.value"
            >
              {{ opt.label }}
            </select-item>
          </select-content>
        </ui-select>
      </template>
    </setting-item>
  </setting-section>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';

import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { isElectron } from '@/utils';

import { SETTINGS_DATA_KEY } from '../keys';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';

const { t } = useI18n();
const setData = inject(SETTINGS_DATA_KEY)!;
const platform = isElectron ? window.electron.ipcRenderer.sendSync('get-platform') : 'web';

const closeActionOptions = computed(() => [
  { label: t('settings.application.closeOptions.ask'), value: 'ask' },
  { label: t('settings.application.closeOptions.minimize'), value: 'minimize' },
  { label: t('settings.application.closeOptions.close'), value: 'close' }
]);

const closeActionLabel = computed(() => {
  const v = setData.value.closeAction;
  return closeActionOptions.value.find((o) => o.value === v)?.label ?? '';
});
</script>
