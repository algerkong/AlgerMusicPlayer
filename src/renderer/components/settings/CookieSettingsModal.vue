<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

defineOptions({
  name: 'CookieSettingsModal'
});

interface Props {
  show: boolean;
  initialValue?: string;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'save', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: ''
});

const emit = defineEmits<Emits>();

const { t } = useI18n();
const message = useMessage();

const tokenInput = ref('');
const isLoading = ref(false);

// 监听显示状态变化，重置输入框
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      tokenInput.value = props.initialValue;
    }
  }
);

// 监听初始值变化
watch(
  () => props.initialValue,
  (newValue) => {
    if (props.show) {
      tokenInput.value = newValue;
    }
  }
);

// 关闭弹窗
const handleClose = () => {
  emit('update:show', false);
};

// 保存Cookie
const handleSave = async () => {
  const trimmedToken = tokenInput.value.trim();

  if (!trimmedToken) {
    message.error(t('settings.cookie.validation.required'));
    return;
  }

  // 简单验证Cookie格式
  if (!trimmedToken.includes('MUSIC_U=')) {
    message.warning(t('settings.cookie.validation.format'));
  }

  try {
    isLoading.value = true;
    emit('save', trimmedToken);
    message.success(t('settings.cookie.message.saveSuccess'));
    handleClose();
  } catch (error) {
    console.error('保存Cookie失败:', error);
    message.error(t('settings.cookie.message.saveError'));
  } finally {
    isLoading.value = false;
  }
};

// 清空输入框
const handleClear = () => {
  tokenInput.value = '';
};

// 从剪贴板粘贴
const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      tokenInput.value = text;
      message.success(t('settings.cookie.message.pasteSuccess'));
    }
  } catch (error) {
    console.error('粘贴失败:', error);
    message.error(t('settings.cookie.message.pasteError'));
  }
};
</script>

<template>
  <n-modal
    :show="show"
    preset="dialog"
    :title="t('settings.cookie.title')"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="ri-key-line"></i>
        <span>{{ t('settings.cookie.title') }}</span>
      </div>
    </template>

    <div class="space-y-4">
      <div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {{ t('settings.cookie.description') }}
        </div>

        <div class="relative">
          <n-input
            v-model:value="tokenInput"
            type="textarea"
            :placeholder="t('settings.cookie.placeholder')"
            :rows="6"
            :autosize="{ minRows: 4, maxRows: 8 }"
            style="font-family: monospace; font-size: 12px"
            class="cookie-input"
          />

          <!-- 工具按钮 -->
          <div class="absolute top-2 right-2 flex gap-1">
            <n-button
              size="tiny"
              quaternary
              @click="handlePaste"
              :title="t('settings.cookie.action.paste')"
            >
              <i class="ri-clipboard-line"></i>
            </n-button>
            <n-button
              size="tiny"
              quaternary
              @click="handleClear"
              :title="t('settings.cookie.action.clear')"
            >
              <i class="ri-delete-bin-line"></i>
            </n-button>
          </div>
        </div>
      </div>

      <!-- 帮助信息 -->
      <div class="text-xs text-gray-500 space-y-1">
        <p>• {{ t('settings.cookie.help.format') }}</p>
        <p>• {{ t('settings.cookie.help.source') }}</p>
        <p>• {{ t('settings.cookie.help.storage') }}</p>
      </div>

      <!-- Cookie长度提示 -->
      <div v-if="tokenInput" class="text-xs text-gray-400">
        {{ t('settings.cookie.info.length', { length: tokenInput.length }) }}
      </div>
    </div>

    <template #action>
      <div class="flex gap-2">
        <n-button @click="handleClose">
          {{ t('common.cancel') }}
        </n-button>
        <n-button
          type="primary"
          @click="handleSave"
          :disabled="!tokenInput.trim()"
          :loading="isLoading"
        >
          {{ t('settings.cookie.action.save') }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style lang="scss" scoped>
.cookie-input {
  :deep(.n-input__textarea) {
    font-family:
      'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Droid Sans Mono', 'Consolas',
      monospace;
    line-height: 1.4;
  }
}
</style>
