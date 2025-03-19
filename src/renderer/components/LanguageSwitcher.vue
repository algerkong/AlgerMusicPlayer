<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSettingsStore } from '@/store/modules/settings';

const settingsStore = useSettingsStore();
const { locale } = useI18n();

const languages = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

console.log('locale', locale);
// 使用计算属性来获取当前语言
const currentLanguage = computed({
  get: () => locale.value,
  set: (value) => {
    settingsStore.setLanguage(value);
  }
});
</script>

<template>
  <n-select v-model:value="currentLanguage" :options="languages" size="small" />
</template>
