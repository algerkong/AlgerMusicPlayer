<template>
  <n-modal
    v-model:show="visible"
    preset="dialog"
    :title="t('settings.system.cache')"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    @positive-click="handleConfirm"
    @negative-click="handleCancel"
  >
    <n-space vertical>
      <p>{{ t('settings.system.cacheClearTitle') }}</p>
      <n-checkbox-group v-model:value="selectedTypes">
        <n-space vertical>
          <n-checkbox
            v-for="option in clearCacheOptions"
            :key="option.key"
            :value="option.key"
            :label="option.label"
          >
            <template #default>
              <div>
                <div>{{ t(`settings.system.cacheTypes.${option.key}.label`) }}</div>
                <div class="text-gray-400 text-sm">
                  {{ t(`settings.system.cacheTypes.${option.key}.description`) }}
                </div>
              </div>
            </template>
          </n-checkbox>
        </n-space>
      </n-checkbox-group>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { defineEmits, defineProps, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:show', 'confirm']);

const { t } = useI18n();
const visible = ref(props.show);
const selectedTypes = ref<string[]>([]);

const clearCacheOptions = ref([
  {
    label: t('settings.system.cacheTypes.history.label'),
    key: 'history',
    description: t('settings.system.cacheTypes.history.description')
  },
  {
    label: t('settings.system.cacheTypes.favorite.label'),
    key: 'favorite',
    description: t('settings.system.cacheTypes.favorite.description')
  },
  {
    label: t('settings.system.cacheTypes.user.label'),
    key: 'user',
    description: t('settings.system.cacheTypes.user.description')
  },
  {
    label: t('settings.system.cacheTypes.settings.label'),
    key: 'settings',
    description: t('settings.system.cacheTypes.settings.description')
  },
  {
    label: t('settings.system.cacheTypes.downloads.label'),
    key: 'downloads',
    description: t('settings.system.cacheTypes.downloads.description')
  },
  {
    label: t('settings.system.cacheTypes.resources.label'),
    key: 'resources',
    description: t('settings.system.cacheTypes.resources.description')
  },
  {
    label: t('settings.system.cacheTypes.lyrics.label'),
    key: 'lyrics',
    description: t('settings.system.cacheTypes.lyrics.description')
  }
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

const handleConfirm = () => {
  emit('confirm', selectedTypes.value);
  selectedTypes.value = [];
};

const handleCancel = () => {
  selectedTypes.value = [];
  visible.value = false;
};
</script>
