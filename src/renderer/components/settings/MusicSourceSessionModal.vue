<template>
  <n-modal
    :show="show"
    preset="card"
    :title="t('settings.musicSource.sessionTitle')"
    class="w-[520px] max-w-[92vw]"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <p class="text-sm text-neutral-500 mb-3">
      {{ t('settings.musicSource.sessionDesc') }}
    </p>
    <n-input
      v-model:value="cookieInput"
      type="textarea"
      :rows="6"
      :placeholder="t('settings.musicSource.sessionPlaceholder')"
    />
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="emit('update:show', false)">{{ t('common.cancel') }}</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">
          {{ t('settings.musicSource.saveSession') }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { NButton, NInput, NModal, useMessage } from 'naive-ui';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { msGetProfile, msImportCookie } from '@/api/musicSource';

defineOptions({ name: 'MusicSourceSessionModal' });

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'saved', profile?: { nickname: string }): void;
}>();

const { t } = useI18n();
const message = useMessage();
const cookieInput = ref('');
const saving = ref(false);

watch(
  () => props.show,
  (v) => {
    if (v) cookieInput.value = '';
  }
);

const handleSave = async () => {
  const cookie = cookieInput.value.trim();
  if (!cookie) {
    message.warning(t('settings.musicSource.sessionRequired'));
    return;
  }
  saving.value = true;
  try {
    await msImportCookie(cookie);
    let profile: { nickname: string } | undefined;
    try {
      const p = await msGetProfile();
      profile = { nickname: p.nickname };
    } catch {
      // cookie may work for search without /me
    }
    message.success(t('settings.musicSource.sessionSaved'));
    emit('saved', profile);
    emit('update:show', false);
  } catch (error: any) {
    message.error(error?.message || t('settings.musicSource.sessionSaveFailed'));
  } finally {
    saving.value = false;
  }
};
</script>
