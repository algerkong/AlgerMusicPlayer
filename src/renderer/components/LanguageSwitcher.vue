<script setup lang="ts">
import { getLanguageOptions } from '@i18n/utils';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useSettingsStore } from '@/store/modules/settings';

const settingsStore = useSettingsStore();
const { locale } = useI18n();

const languages = getLanguageOptions();

const currentLanguage = computed({
  get: () => locale.value,
  set: (value: string) => {
    settingsStore.setLanguage(value);
  }
});

const currentLabel = computed(
  () => languages.find((l) => l.value === currentLanguage.value)?.label ?? currentLanguage.value
);
</script>

<template>
  <ui-select v-model="currentLanguage">
    <select-trigger size="sm" class="w-full min-w-[140px]">
      <select-value :placeholder="currentLabel">
        {{ currentLabel }}
      </select-value>
    </select-trigger>
    <select-content position="popper" class="z-[9999]">
      <select-item v-for="lang in languages" :key="lang.value" :value="lang.value">
        {{ lang.label }}
      </select-item>
    </select-content>
  </ui-select>
</template>
