<template>
  <!-- 应用：快捷键 -->
  <setting-section v-if="isElectron">
    <setting-item
      :title="t('settings.application.shortcut')"
      :description="t('settings.application.shortcutDesc')"
    >
      <template #action>
        <s-btn @click="showShortcutModal = true">{{ t('common.configure') }}</s-btn>
      </template>
    </setting-item>

    <shortcut-settings v-model:show="showShortcutModal" @change="handleShortcutsChange" />
  </setting-section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ShortcutSettings from '@/components/settings/ShortcutSettings.vue';
import { isElectron } from '@/utils';

import SBtn from '../SBtn.vue';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';

const { t } = useI18n();
const showShortcutModal = ref(false);

const handleShortcutsChange = (shortcuts: any) => {
  console.log('快捷键已更新:', shortcuts);
};
</script>
