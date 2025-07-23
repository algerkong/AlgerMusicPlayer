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
          <n-grid-item v-for="source in musicSourceOptions" :key="source.value">
            <n-checkbox :value="source.value">
              {{ source.label }}
              <template v-if="source.value === 'gdmusic'">
                <n-tooltip>
                  <template #trigger>
                    <n-icon size="16" class="ml-1 text-blue-500 cursor-help">
                      <i class="ri-information-line"></i>
                    </n-icon>
                  </template>
                  {{ t('settings.playback.gdmusicInfo') }}
                </n-tooltip>
              </template>
            </n-checkbox>
          </n-grid-item>
        </n-grid>
      </n-checkbox-group>
      <div v-if="selectedSources.length === 0" class="text-red-500 text-sm">
        {{ t('settings.playback.musicSourcesWarning') }}
      </div>

      <!-- GD音乐台设置 -->
      <div
        v-if="selectedSources.includes('gdmusic')"
        class="mt-4 border-t pt-4 border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-base font-medium mb-2">GD音乐台(music.gdstudio.xyz)设置</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
          GD音乐台将自动尝试多个音乐平台进行解析，无需额外配置。优先级高于其他解析方式，但是请求可能较慢。感谢（music.gdstudio.xyz）
        </p>
      </div>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { defineEmits, defineProps, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { type Platform } from '@/types/music';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  sources: {
    type: Array as () => Platform[],
    default: () => ['migu', 'kugou', 'pyncmd', 'bilibili']
  }
});

const emit = defineEmits(['update:show', 'update:sources']);

const { t } = useI18n();
const visible = ref(props.show);
const selectedSources = ref<Platform[]>(props.sources);

const musicSourceOptions = ref([
  { label: 'MG', value: 'migu' },
  { label: 'KG', value: 'kugou' },
  { label: 'pyncmd', value: 'pyncmd' },
  { label: 'Bilibili', value: 'bilibili' },
  { label: 'GD音乐台', value: 'gdmusic' }
]);

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
