<template>
  <n-modal
    v-model:show="visible"
    preset="dialog"
    :title="t('settings.playback.musicSources')"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    @positive-click="handleConfirm"
    @negative-click="handleCancel"
  >
    <n-space vertical>
      <p>{{ t('settings.playback.musicSourcesDesc') }}</p>

      <n-checkbox-group v-model:value="selectedSources">
        <n-grid :cols="2" :x-gap="12" :y-gap="8">
          <!-- 遍历常规音源 -->
          <n-grid-item v-for="source in regularMusicSources" :key="source.value">
            <n-checkbox :value="source.value">
              {{ t('settings.playback.sourceLabels.' + source.value) }}
              <n-tooltip v-if="source.value === 'gdmusic'">
                <template #trigger>
                  <n-icon size="16" class="ml-1 text-blue-500 cursor-help">
                    <i class="ri-information-line"></i>
                  </n-icon>
                </template>
                {{ t('settings.playback.gdmusicInfo') }}
              </n-tooltip>
            </n-checkbox>
          </n-grid-item>

          <!-- 单独处理自定义API选项 -->
          <n-grid-item>
            <n-checkbox value="custom" :disabled="!settingsStore.setData.customApiPlugin">
              {{ t('settings.playback.sourceLabels.custom') }}
              <n-tooltip v-if="!settingsStore.setData.customApiPlugin">
                <template #trigger>
                  <n-icon size="16" class="ml-1 text-gray-400 cursor-help">
                    <i class="ri-question-line"></i>
                  </n-icon>
                </template>
                {{ t('settings.playback.customApi.enableHint') }}
              </n-tooltip>
            </n-checkbox>
          </n-grid-item>
        </n-grid>
      </n-checkbox-group>

      <!-- 分割线 -->
      <div class="mt-4 border-t pt-4 border-gray-200 dark:border-gray-700"></div>

      <!-- 自定义API导入区域 -->
      <div>
        <h3 class="text-base font-medium mb-2">
          {{ t('settings.playback.customApi.sectionTitle') }}
        </h3>
        <div class="flex items-center gap-4">
          <n-button @click="importPlugin" size="small">{{
            t('settings.playback.customApi.importConfig')
          }}</n-button>
          <p v-if="settingsStore.setData.customApiPluginName" class="text-sm">
            {{ t('settings.playback.customApi.currentSource') }}:
            <span class="font-semibold">{{ settingsStore.setData.customApiPluginName }}</span>
          </p>
          <p v-else class="text-sm text-gray-500">
            {{ t('settings.playback.customApi.notImported') }}
          </p>
        </div>
      </div>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSettingsStore } from '@/store';
import { type Platform } from '@/types/music';

// 扩展 Platform 类型以包含 'custom'
type ExtendedPlatform = Platform | 'custom';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  sources: {
    type: Array as () => ExtendedPlatform[],
    default: () => ['migu', 'kugou', 'pyncmd', 'bilibili']
  }
});

const emit = defineEmits(['update:show', 'update:sources']);

const { t } = useI18n();
const settingsStore = useSettingsStore();
const message = useMessage();
const visible = ref(props.show);
const selectedSources = ref<ExtendedPlatform[]>(props.sources);

// 将常规音源和自定义音源分开定义
const regularMusicSources = ref([
  { value: 'migu' },
  { value: 'kugou' },
  { value: 'pyncmd' },
  { value: 'bilibili' },
  { value: 'gdmusic' }
]);

const importPlugin = async () => {
  try {
    const result = await window.api.importCustomApiPlugin();
    if (result && result.name && result.content) {
      settingsStore.setCustomApiPlugin(result);
      message.success(t('settings.playback.customApi.importSuccess', { name: result.name }));
      // 导入成功后，如果用户还没勾选，则自动勾选上
      if (!selectedSources.value.includes('custom')) {
        selectedSources.value.push('custom');
      }
    }
  } catch (error: any) {
    message.error(t('settings.playback.customApi.importFailed', { message: error.message }));
  }
};

// 监听自定义插件内容的变化。如果用户清除了插件，要确保 'custom' 选项被取消勾选
watch(
  () => settingsStore.setData.customApiPlugin,
  (newPluginContent) => {
    if (!newPluginContent) {
      const index = selectedSources.value.indexOf('custom');
      if (index > -1) {
        selectedSources.value.splice(index, 1);
      }
    }
  }
);

// 同步外部show属性变化
watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal;
  }
);

// 同步内部visible变化
watch(
  () => visible.value,
  (newVal) => {
    emit('update:show', newVal);
  }
);

// 同步外部sources属性变化
watch(
  () => props.sources,
  (newVal) => {
    selectedSources.value = [...newVal];
  },
  { deep: true }
);

const handleConfirm = () => {
  // 确保至少选择一个音源
  const defaultPlatforms = ['migu', 'kugou', 'pyncmd', 'bilibili'];
  const valuesToEmit =
    selectedSources.value.length > 0 ? [...new Set(selectedSources.value)] : defaultPlatforms;
  emit('update:sources', valuesToEmit);
  visible.value = false;
};
const handleCancel = () => {
  // 取消时还原为props传入的初始值
  selectedSources.value = [...props.sources];
  visible.value = false;
};
</script>
