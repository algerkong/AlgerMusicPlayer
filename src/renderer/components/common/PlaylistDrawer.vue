<template>
  <n-drawer :show="modelValue" :width="400" placement="right" @update:show="onUpdateShow">
    <n-drawer-content :title="t('comp.playlistDrawer.title') || '添加到歌单'" closable>
      <n-empty description="在线账号/歌单功能已移除" class="pt-12" />
    </n-drawer-content>
  </n-drawer>
</template>

<script lang="ts" setup>
import { NDrawer, NDrawerContent, NEmpty } from 'naive-ui';
import { useI18n } from 'vue-i18n';

defineProps<{
  modelValue: boolean;
  songId?: number;
}>();

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();

const onUpdateShow = (v: boolean) => emit('update:modelValue', v);
</script>
