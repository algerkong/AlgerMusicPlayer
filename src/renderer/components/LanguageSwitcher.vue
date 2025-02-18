<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';

import { isElectron } from '@/utils';

const store = useStore();
const { locale } = useI18n();

const languages = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

// 使用计算属性来获取当前语言
const currentLanguage = computed({
  get: () => store.state.setData.language || 'zh-CN',
  set: (value: string) => {
    handleLanguageChange(value);
  }
});

// 当语言改变时的处理函数
const handleLanguageChange = (value: string) => {
  // 更新 i18n locale
  locale.value = value;
  // 通过 mutation 更新 store
  store.commit('setLanguage', value);
  // 通知主进程语言已更改
  if (isElectron) {
    window.electron.ipcRenderer.send('change-language', value);
  }
};

// 监听来自主进程的语言切换事件
const handleSetLanguage = (_: any, value: string) => {
  handleLanguageChange(value);
};

onMounted(() => {
  if (isElectron) {
    window.electron.ipcRenderer.on('set-language', handleSetLanguage);
  }
});

onUnmounted(() => {
  if (isElectron) {
    window.electron.ipcRenderer.removeListener('set-language', handleSetLanguage);
  }
});
</script>

<template>
  <n-select v-model:value="currentLanguage" :options="languages" size="small" />
</template>
