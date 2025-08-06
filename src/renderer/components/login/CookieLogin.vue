<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getUserDetail } from '@/api/login';
import { useUserStore } from '@/store/modules/user';
import { isElectron, setAnimationClass } from '@/utils';

defineOptions({
  name: 'CookieLogin'
});

const { t } = useI18n();
const message = useMessage();
const router = useRouter();
const userStore = useUserStore();

const token = ref('');

// Token登录
const loginByToken = async () => {
  if (!token.value.trim()) {
    message.error(t('login.message.tokenRequired'));
    return;
  }

  try {
    // 直接设置token到localStorage
    localStorage.setItem('token', token.value.trim());

    // 获取用户信息验证token有效性
    const user = await getUserDetail();
    if (user.data && user.data.profile) {
      userStore.user = user.data.profile;
      localStorage.setItem('user', JSON.stringify(user.data.profile));
      message.success(t('login.message.tokenLoginSuccess'));
      router.push('/user');
    } else {
      // token无效，清除localStorage
      localStorage.removeItem('token');
      message.error(t('login.message.tokenInvalid'));
    }
  } catch (error) {
    // token无效，清除localStorage
    localStorage.removeItem('token');
    message.error(t('login.message.tokenInvalid'));
    console.error('Token登录失败:', error);
  }
};

// 自动获取Cookie
const autoGetCookie = () => {
  if (!isElectron) {
    message.error('此功能仅在桌面版中可用');
    return;
  }

  message.info(t('login.message.autoGetCookieTip'));
  window.electron.ipcRenderer.send('open-login');
};

// 监听Cookie接收
const handleCookieReceived = async (_event: any, cookieValue: string) => {
  try {
    // 设置Cookie到localStorage
    localStorage.setItem('token', cookieValue);

    // 验证Cookie有效性
    const user = await getUserDetail();
    if (user.data && user.data.profile) {
      userStore.user = user.data.profile;
      localStorage.setItem('user', JSON.stringify(user.data.profile));
      message.success(t('login.message.autoGetCookieSuccess'));
      router.push('/user');
    } else {
      localStorage.removeItem('token');
      message.error(t('login.message.autoGetCookieFailed'));
    }
  } catch (error) {
    localStorage.removeItem('token');
    message.error(t('login.message.autoGetCookieFailed'));
    console.error('自动获取Cookie失败:', error);
  }
};

// 在组件挂载时添加监听器
onMounted(() => {
  if (isElectron) {
    window.electron.ipcRenderer.on('send-cookies', handleCookieReceived);
  }
});

// 在组件卸载时移除监听器
onBeforeUnmount(() => {
  if (isElectron) {
    window.electron.ipcRenderer.removeAllListeners('send-cookies');
  }
});
</script>

<template>
  <div class="cookie-login" :class="setAnimationClass('animate__fadeInUp')">
    <div class="login-title">{{ t('login.title.token') }}</div>
    <div class="phone-page">
      <textarea
        v-model="token"
        class="token-input"
        :placeholder="t('login.placeholder.token')"
        rows="4"
      />
    </div>
    <div class="text">{{ t('login.tokenTip') }}</div>
    <n-button class="btn-login" @click="loginByToken()">{{
      t('login.button.tokenLogin')
    }}</n-button>
    <n-button v-if="isElectron" class="btn-auto-cookie" @click="autoGetCookie()" type="info">
      {{ t('login.button.autoGetCookie') }}
    </n-button>
  </div>
</template>

<style lang="scss" scoped>
.cookie-login {
  animation-duration: 0.5s;
  @apply flex flex-col items-center;
}

.login-title {
  @apply text-2xl font-bold mb-6 text-white;
}

.text {
  @apply mt-4 text-white text-xs;
}

.phone-page {
  @apply bg-light dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90;
  width: 250px;
  @apply rounded-2xl overflow-hidden;
  padding: 0;
  border: none;
}

.token-input {
  @apply w-full outline-none resize-none;
  @apply text-gray-900 dark:text-white bg-transparent;
  @apply placeholder-gray-500 dark:placeholder-gray-400;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.4;
  min-height: 100px;
  padding: 16px;
  margin: 0;
  border: none;
  border-radius: inherit;
  box-sizing: border-box;

  &:focus {
    @apply outline-none;
    box-shadow: none;
    border: none;
  }

  &::placeholder {
    @apply text-gray-400 dark:text-gray-500;
  }

  /* 移除浏览器默认样式 */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
}

.btn-login {
  width: 250px;
  height: 40px;
  @apply mt-10 text-white rounded-xl;
  @apply bg-green-600 hover:bg-green-700 transition-colors;
}

.btn-auto-cookie {
  width: 250px;
  height: 40px;
  @apply mt-4 text-white rounded-xl;
  @apply bg-blue-600 hover:bg-blue-700 transition-colors;
}
</style>
