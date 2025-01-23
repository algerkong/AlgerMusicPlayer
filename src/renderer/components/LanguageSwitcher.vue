<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const languages = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

// 从配置中读取语言设置
onMounted(() => {
  const savedLanguage = window.electron.ipcRenderer.sendSync('get-store-value', 'set.language');
  if (savedLanguage) {
    locale.value = savedLanguage;
  }
});

const handleLanguageChange = (value: string) => {
  locale.value = value;
  // 保存语言设置到配置中
  window.electron.ipcRenderer.send('set-store-value', 'set.language', value);
  // 通知主进程语言已更改
  window.electron.ipcRenderer.send('change-language', value);
};
</script>

<template>
  <n-select
    v-model:value="locale"
    :options="languages"
    size="small"
    @update:value="handleLanguageChange"
  />
</template>
