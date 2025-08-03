<template>
  <n-modal
    v-model:show="visible"
    preset="dialog"
    :title="t('settings.network.token')"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    :show-icon="false"
    @positive-click="handleTokenConfirm"
    @negative-click="handleCancel"
  >
    <n-form
      ref="formRef"
      :model="tokenForm"
      :rules="tokenRules"
      label-placement="left"
      label-width="80"
      require-mark-placement="right-hanging"
    >
      <n-form-item :label="t('settings.network.token')" path="token">
        <n-input
          v-model:value="tokenForm.token"
          type="textarea"
          :placeholder="t('settings.network.tokenPlaceholder')"
          :rows="4"
          show-count
          :maxlength="10000"
        />
      </n-form-item>
      <div class="token-tip">
        <i class="ri-information-line"></i>
        <span>{{ t('settings.network.tokenTip') }}</span>
      </div>
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
  }
});

const emit = defineEmits(['update:show', 'confirm']);

const { t } = useI18n();
const message = useMessage();
const formRef = ref();

const visible = ref(props.show);
const tokenForm = ref({
  token: ''
});

const tokenRules: FormRules = {
  token: {
    required: true,
    message: t('settings.validation.tokenRequired'),
    trigger: ['blur', 'change'],
    validator: (_rule, value) => {
      if (!value || value.trim() === '') {
        return false;
      }
      // 简单的token格式验证（至少包含一些关键字符）
      const tokenRegex = /[a-zA-Z0-9=_\-\.]+/;
      return tokenRegex.test(value.trim());
    }
  }
};

// 同步外部show属性变化
watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal;
    if (newVal) {
      // 打开弹窗时，从localStorage获取当前token
      const currentToken = localStorage.getItem('token') || '';
      tokenForm.value.token = currentToken;
    }
  }
);

// 同步内部visible变化
watch(
  () => visible.value,
  (newVal) => {
    emit('update:show', newVal);
  }
);

const handleTokenConfirm = async () => {
  try {
    await formRef.value?.validate();
    const token = tokenForm.value.token.trim();
    console.log(token);
    // 保存token到localStorage
    localStorage.setItem('token', token);
    console.log('实际长度：', tokenForm.value.token.trim().length);
    emit('confirm', { token });
    visible.value = false;
    
    // 显示成功消息和重启提示
    message.success(t('settings.network.messages.tokenSuccess'));
    message.info(t('settings.network.messages.restartRequired'));
  } catch (err) {
    console.error('Token设置验证失败:', err);
    message.error(t('settings.network.messages.tokenError'));
  }
};

const handleCancel = () => {
  visible.value = false;
};
</script>

<style lang="scss" scoped>
.token-tip {
  @apply flex items-start gap-2 mt-3 p-3 rounded-lg;
  @apply bg-blue-50 dark:bg-blue-900/20;
  @apply text-blue-600 dark:text-blue-400;
  @apply text-sm;

  i {
    @apply mt-0.5 flex-shrink-0;
  }
}
</style> 