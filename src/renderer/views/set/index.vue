<template>
  <!-- 不铺 bg-background：暗色下那是纯黑，会盖住封面底色；跟其它页一样透底 -->
  <div class="settings-page h-full w-full text-foreground flex flex-col">
    <!-- 顶区跟搜索结果页一样贴顶，少留天窗 -->
    <div class="flex-shrink-0 z-10 pt-3">
      <h1 class="text-2xl font-bold page-padding mb-1">
        {{ t('common.settings') }}
      </h1>
      <!-- 与搜索结果同一套 line tab：字高亮 + 底线丝滑滑动 -->
      <category-selector
        v-model="currentSection"
        variant="line"
        :categories="navSections"
        label-key="title"
        value-key="id"
        animation-class=""
      />
    </div>

    <!-- 播放条占位交给布局 PlayBottom，这里只留一点呼吸距（同 SearchResult） -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="settings-body page-padding">
        <!-- 通用 / 存储 / 关于（快捷键设置页已移除，使用内置默认快捷键） -->
        <div v-show="currentSection === 'basic'" class="animate-fade-in">
          <basic-tab />
        </div>
        <div v-show="currentSection === 'system'" class="animate-fade-in">
          <system-tab />
        </div>
        <div v-show="currentSection === 'about'" class="animate-fade-in">
          <about-tab />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { useDialog, useMessage } from 'naive-ui';
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import CategorySelector from '@/components/common/CategorySelector.vue';
import { useSettingsStore } from '@/store/modules/settings';
import { isElectron } from '@/utils';

import config from '../../../../package.json';
import { createDefaultAppUpdateState } from '../../../shared/appUpdate';
import { SETTINGS_DATA_KEY, SETTINGS_DIALOG_KEY, SETTINGS_MESSAGE_KEY } from './keys';
import AboutTab from './tabs/AboutTab.vue';
import BasicTab from './tabs/BasicTab.vue';
import SystemTab from './tabs/SystemTab.vue';

const settingsStore = useSettingsStore();
const message = useMessage();
const dialog = useDialog();
const { t } = useI18n();

const saveSettings = useDebounceFn((data) => {
  settingsStore.setSetData(data);
}, 500);

const localSetData = ref({ ...settingsStore.setData });

const setData = computed({
  get: () => localSetData.value,
  set: (newData) => {
    localSetData.value = newData;
  }
});

watch(
  () => localSetData.value,
  (newValue) => saveSettings(newValue),
  { deep: true }
);

watch(
  () => settingsStore.setData,
  (newValue) => {
    if (JSON.stringify(localSetData.value) !== JSON.stringify(newValue)) {
      localSetData.value = { ...newValue };
    }
  },
  { deep: true, immediate: true }
);

onUnmounted(() => {
  settingsStore.setSetData(localSetData.value);
});

provide(SETTINGS_DATA_KEY, setData);
provide(SETTINGS_MESSAGE_KEY, message);
provide(SETTINGS_DIALOG_KEY, dialog);

type SettingSectionConfig = {
  id: string;
  electron?: boolean;
};

/** 通用 / 存储 / 关于；Web 无存储时只留通用 + 关于 */
const settingSections: SettingSectionConfig[] = [
  { id: 'basic' },
  { id: 'system', electron: true },
  { id: 'about' }
];

const navSections = computed(() => {
  return settingSections
    .filter((section) => !section.electron || isElectron)
    .map((section) => ({
      id: section.id,
      title: t(`settings.sections.${section.id}`)
    }));
});

const currentSection = ref('basic');

onMounted(() => {
  if (isElectron && settingsStore.appUpdateState.currentVersion === '') {
    settingsStore.setAppUpdateState(createDefaultAppUpdateState(config.version));
  }
  // 磁盘缓存默认开启，策略/上限写死，不暴露 UI
  setData.value = {
    ...setData.value,
    enableDiskCache: true,
    diskCacheMaxSizeMB: setData.value.diskCacheMaxSizeMB || 4096,
    diskCacheCleanupPolicy: 'lru',
    enableGpuAcceleration: true
  };
});
</script>

<style scoped>
.settings-body {
  /* 同搜索结果：只留一点底距，别再 pb-32 + h-20 + PlayBottom 叠三层 */
  padding-top: 0.75rem;
  padding-bottom: 1rem;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
