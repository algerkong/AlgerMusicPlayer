<template>
  <setting-section v-if="isElectron" :title="t('settings.sections.network')">
    <setting-item
      :title="t('settings.network.apiPort')"
      :description="t('settings.network.apiPortDesc')"
    >
      <s-input
        v-model="setData.musicApiPort"
        type="number"
        :min="1024"
        :max="65535"
        :step="1"
        width="w-[140px] max-md:w-32"
      />
    </setting-item>

    <setting-item
      :title="t('settings.network.proxy')"
      :description="t('settings.network.proxyDesc')"
    >
      <template #action>
        <div class="flex items-center gap-2">
          <n-switch v-model:value="setData.proxyConfig.enable">
            <template #checked>{{ t('common.on') }}</template>
            <template #unchecked>{{ t('common.off') }}</template>
          </n-switch>
          <s-btn @click="showProxyModal = true">{{ t('common.configure') }}</s-btn>
        </div>
      </template>
    </setting-item>

    <setting-item
      :title="t('settings.network.realIP')"
      :description="t('settings.network.realIPDesc')"
    >
      <template #action>
        <div class="flex items-center gap-2 max-md:flex-wrap">
          <n-switch v-model:value="setData.enableRealIP">
            <template #checked>{{ t('common.on') }}</template>
            <template #unchecked>{{ t('common.off') }}</template>
          </n-switch>
          <s-input
            v-if="setData.enableRealIP"
            v-model="setData.realIP"
            placeholder="realIP"
            width="w-[200px] max-md:w-full"
            @blur="validateAndSaveRealIP"
          />
        </div>
      </template>
    </setting-item>

    <proxy-settings
      v-model:show="showProxyModal"
      :config="proxyForm"
      @confirm="handleProxyConfirm"
    />
  </setting-section>
</template>

<script setup lang="ts">
import { inject, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ProxySettings from '@/components/settings/ProxySettings.vue';
import { isElectron } from '@/utils';

import { SETTINGS_DATA_KEY, SETTINGS_MESSAGE_KEY } from '../keys';
import SBtn from '../SBtn.vue';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';
import SInput from '../SInput.vue';

const { t } = useI18n();
const setData = inject(SETTINGS_DATA_KEY)!;
const message = inject(SETTINGS_MESSAGE_KEY)!;

const showProxyModal = ref(false);
const proxyForm = ref({ protocol: 'http', host: '127.0.0.1', port: 7890 });

watch(
  () => setData.value.proxyConfig,
  (newVal) => {
    if (newVal) {
      proxyForm.value = {
        protocol: newVal.protocol || 'http',
        host: newVal.host || '127.0.0.1',
        port: newVal.port || 7890
      };
    }
  },
  { immediate: true, deep: true }
);

const handleProxyConfirm = async (proxyConfig: any) => {
  setData.value = {
    ...setData.value,
    proxyConfig: { enable: setData.value.proxyConfig?.enable || false, ...proxyConfig }
  };
  message.success(t('settings.network.messages.proxySuccess'));
};

const validateAndSaveRealIP = () => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!setData.value.realIP || ipRegex.test(setData.value.realIP)) {
    setData.value = { ...setData.value, realIP: setData.value.realIP, enableRealIP: true };
    if (setData.value.realIP) {
      message.success(t('settings.network.messages.realIPSuccess'));
    }
  } else {
    message.error(t('settings.network.messages.realIPError'));
    setData.value = { ...setData.value, realIP: '' };
  }
};

watch(
  () => setData.value.enableRealIP,
  (newVal) => {
    if (!newVal) {
      setData.value = { ...setData.value, realIP: '', enableRealIP: false };
    }
  }
);
</script>
