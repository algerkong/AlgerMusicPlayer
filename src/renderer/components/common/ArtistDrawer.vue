<template>
  <n-drawer v-model:show="modelValue" :width="420" placement="right">
    <n-drawer-content title="歌手" closable>
      <n-empty description="在线音源将接入独立库" class="pt-16" />
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent, NEmpty } from 'naive-ui';
import { computed, watch } from 'vue';

import { useSettingsStore } from '@/store';

const settingsStore = useSettingsStore();

const modelValue = defineModel<boolean>('show', { required: true });

watch(modelValue, (newVal) => {
  settingsStore.setShowArtistDrawer(newVal);
});

// keep settings artist id reactive without unused warning
const _artistId = computed(() => settingsStore.currentArtistId);
void _artistId;
</script>
