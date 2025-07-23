<template>
  <n-modal
    v-model:show="visible"
    preset="dialog"
    :title="t('settings.network.proxy')"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    :show-icon="false"
    @positive-click="handleProxyConfirm"
    @negative-click="handleCancel"
  >
    <n-form
      ref="formRef"
      :model="proxyForm"
      :rules="proxyRules"
      label-placement="left"
      label-width="80"
      require-mark-placement="right-hanging"
    >
      <n-form-item :label="t('settings.network.proxy')" path="protocol">
        <n-select
          v-model:value="proxyForm.protocol"
          :options="[
            { label: 'HTTP', value: 'http' },
            { label: 'HTTPS', value: 'https' },
            { label: 'SOCKS5', value: 'socks5' }
          ]"
        />
      </n-form-item>
      <n-form-item :label="t('settings.network.proxyHost')" path="host">
        <n-input
          v-model:value="proxyForm.host"
          :placeholder="t('settings.network.proxyHostPlaceholder')"
        />
      </n-form-item>
      <n-form-item :label="t('settings.network.proxyPort')" path="port">
        <n-input-number
          v-model:value="proxyForm.port"
          :placeholder="t('settings.network.proxyPortPlaceholder')"
          :min="1"
          :max="65535"
        />
      </n-form-item>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import type { FormRules } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { defineEmits, defineProps, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  config: {
    type: Object,
    default: () => ({
      protocol: 'http',
      host: '127.0.0.1',
      port: 7890
    })
  }
});

const emit = defineEmits(['update:show', 'confirm']);

const { t } = useI18n();
const message = useMessage();
const formRef = ref();

const visible = ref(props.show);
const proxyForm = ref({
  protocol: props.config.protocol || 'http',
  host: props.config.host || '127.0.0.1',
  port: props.config.port || 7890
});

const proxyRules: FormRules = {
  protocol: {
    required: true,
    message: t('settings.validation.selectProxyProtocol'),
    trigger: ['blur', 'change']
  },
  host: {
    required: true,
    message: t('settings.validation.proxyHost'),
    trigger: ['blur', 'change'],
    validator: (_rule, value) => {
      if (!value) return false;
      // 简单的IP或域名验证
      const ipRegex =
        /^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/;
      return ipRegex.test(value);
    }
  },
  port: {
    required: true,
    message: t('settings.validation.portNumber'),
    trigger: ['blur', 'change'],
    validator: (_rule, value) => {
      return value >= 1 && value <= 65535;
    }
  }
};

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

// 同步外部config变化
watch(
  () => props.config,
  (newVal) => {
    proxyForm.value = {
      protocol: newVal.protocol || 'http',
      host: newVal.host || '127.0.0.1',
      port: newVal.port || 7890
    };
  },
  { deep: true }
);

const handleProxyConfirm = async () => {
  try {
    await formRef.value?.validate();
    emit('confirm', { ...proxyForm.value });
    visible.value = false;
    message.success(t('settings.network.messages.proxySuccess'));
  } catch (err) {
    console.error('代理设置验证失败:', err);
    message.error(t('settings.network.messages.proxyError'));
  }
};

const handleCancel = () => {
  visible.value = false;
};
</script>
