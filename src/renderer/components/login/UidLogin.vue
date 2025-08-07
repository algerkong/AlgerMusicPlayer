<template>
  <div class="uid-login">
    <div class="login-title">{{ t('login.title.uid') }}</div>
    <div class="uid-page">
      <input
        v-model="uid"
        class="uid-input"
        type="text"
        :placeholder="t('login.placeholder.uid')"
        @keyup.enter="handleLogin"
      />
    </div>
    <div class="text">{{ t('login.uidTip') }}</div>
    <div class="warning-text">
      {{ t('login.uidWarning') }}
    </div>
    <n-button class="btn-login" :loading="loading" @click="handleLogin">
      {{ t('login.button.login') }}
    </n-button>
  </div>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';

import { loginByUid } from '@/api/login';

defineOptions({
  name: 'UidLogin'
});

// Props
interface Props {
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

// Emits
interface Emits {
  (e: 'loginSuccess', userProfile: any, loginType: string): void;
  (e: 'loginError', error: string): void;
}

const emit = defineEmits<Emits>();

const { t } = useI18n();
const message = useMessage();

// 状态
const uid = ref('');
const loading = ref(false);

// UID登录处理
const handleLogin = async () => {
  if (props.disabled || loading.value) return;

  if (!uid.value.trim()) {
    const errorMsg = t('login.message.uidRequired');
    message.error(errorMsg);
    emit('loginError', errorMsg);
    return;
  }

  try {
    loading.value = true;
    const { data } = await loginByUid(uid.value);

    if (data && data.profile) {
      const successMsg = t('login.message.uidLoginSuccess');
      message.success(successMsg);
      emit('loginSuccess', data.profile, 'uid');
    } else {
      const errorMsg = t('login.message.uidInvalid');
      message.error(errorMsg);
      emit('loginError', errorMsg);
    }
  } catch (error: any) {
    console.error('UID登录失败:', error);
    let errorMsg = t('login.message.uidLoginFailed');

    if (error.response?.status === 404 || error.response?.data?.code === 404) {
      errorMsg = t('login.message.uidInvalid');
    }

    message.error(errorMsg);
    emit('loginError', errorMsg);
  } finally {
    loading.value = false;
  }
};

// 重置表单
const reset = () => {
  uid.value = '';
  loading.value = false;
};

// 暴露方法给父组件
defineExpose({
  reset
});
</script>

<style lang="scss" scoped>
.uid-login {
  animation-duration: 0.5s;
  width: 250px;

  .login-title {
    @apply text-2xl font-bold mb-6 text-white;
  }

  .text {
    @apply mt-4 text-white text-xs;
  }

  .warning-text {
    @apply mt-2 text-orange-400 text-xs text-center max-w-xs;
    line-height: 1.4;
  }

  .uid-page {
    @apply bg-light dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90;
    @apply rounded-2xl overflow-hidden;
  }

  .uid-input {
    height: 40px;
    @apply w-full px-4 outline-none;
    @apply text-gray-900 dark:text-white bg-transparent;
    @apply border-b border-gray-200 dark:border-gray-700;
    @apply placeholder-gray-500 dark:placeholder-gray-400;

    &:focus {
      @apply border-green-500;
    }
  }

  .btn-login {
    width: 250px;
    height: 40px;
    @apply mt-10 text-white rounded-xl;
    @apply bg-green-600 hover:bg-green-700 transition-colors;
  }
}
</style>
