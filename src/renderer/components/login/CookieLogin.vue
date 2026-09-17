<script lang="ts" setup>
import { NButton, useMessage } from 'naive-ui';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getUserDetail } from '@/api/login';
import { isElectron, setAnimationClass } from '@/utils';

defineOptions({
  name: 'CookieLogin'
});

interface Emits {
  (e: 'loginSuccess', userProfile: any, loginType: string): void;
  (e: 'loginError', error: string): void;
}

type AutoCookieStatusCode =
  | 'idle'
  | 'request-received'
  | 'opening'
  | 'opened'
  | 'focused-existing'
  | 'cookie-detected'
  | 'closed-without-cookie'
  | 'open-failed'
  | 'load-failed'
  | 'success'
  | 'failed';

interface LoginWindowStatusPayload {
  attemptId?: string;
  status?:
    | 'request-received'
    | 'opening'
    | 'opened'
    | 'focused-existing'
    | 'cookie-detected'
    | 'closed-without-cookie'
    | 'open-failed'
    | 'load-failed';
  phase?: string;
  timestamp?: number;
  error?: string;
  errorCode?: number;
  errorDescription?: string;
  url?: string;
}

interface CookieReceivedPayload {
  value?: string;
  attemptId?: string;
}

const emit = defineEmits<Emits>();

const { t } = useI18n();
const message = useMessage();

const token = ref('');
const autoCookieStatusCode = ref<AutoCookieStatusCode>('idle');
const autoCookieStatusText = ref('');
const activeAutoCookieAttemptId = ref<string | null>(null);
const autoCookieAttemptStartedAt = ref<number | null>(null);
const autoCookieElapsedSeconds = ref(0);
let removeCookieListener: (() => void) | null = null;
let removeLoginWindowStatusListener: (() => void) | null = null;
let autoCookieElapsedTimer: number | null = null;

const autoCookieProgressStatuses = new Set<AutoCookieStatusCode>([
  'request-received',
  'opening',
  'opened',
  'focused-existing',
  'cookie-detected'
]);
const autoCookieElapsedVisibleStatuses = new Set<AutoCookieStatusCode>([
  'opened',
  'focused-existing'
]);

const updateAutoCookieElapsedSeconds = () => {
  if (!autoCookieAttemptStartedAt.value) {
    autoCookieElapsedSeconds.value = 0;
    return;
  }

  autoCookieElapsedSeconds.value = Math.max(
    1,
    Math.floor((Date.now() - autoCookieAttemptStartedAt.value) / 1000)
  );
};

const stopAutoCookieElapsedTimer = () => {
  if (autoCookieElapsedTimer !== null) {
    window.clearInterval(autoCookieElapsedTimer);
    autoCookieElapsedTimer = null;
  }
};

const startAutoCookieElapsedTimer = () => {
  updateAutoCookieElapsedSeconds();
  if (autoCookieElapsedTimer !== null) return;
  autoCookieElapsedTimer = window.setInterval(updateAutoCookieElapsedSeconds, 1000);
};

const syncAutoCookieElapsedState = (status: AutoCookieStatusCode) => {
  if (autoCookieProgressStatuses.has(status)) {
    if (!autoCookieAttemptStartedAt.value) {
      autoCookieAttemptStartedAt.value = Date.now();
    }
    startAutoCookieElapsedTimer();
    return;
  }

  stopAutoCookieElapsedTimer();
  autoCookieAttemptStartedAt.value = null;
  autoCookieElapsedSeconds.value = 0;
};

const displayAutoCookieStatusText = computed(() => {
  if (!autoCookieStatusText.value) return '';
  if (
    !autoCookieElapsedVisibleStatuses.has(autoCookieStatusCode.value) ||
    autoCookieElapsedSeconds.value <= 0
  ) {
    return autoCookieStatusText.value;
  }

  return `${autoCookieStatusText.value} · ${autoCookieElapsedSeconds.value}s`;
});

const setAutoCookieStatus = (status: AutoCookieStatusCode, text: string) => {
  autoCookieStatusCode.value = status;
  autoCookieStatusText.value = text;
  syncAutoCookieElapsedState(status);
};

const getAutoCookieStatusText = (payload: LoginWindowStatusPayload) => {
  switch (payload.status) {
    case 'request-received':
    case 'opening':
      return t('login.message.autoGetCookiePreparing');
    case 'opened':
      return t('login.message.autoGetCookieWindowOpened');
    case 'focused-existing':
      return t('login.message.autoGetCookieWindowFocused');
    case 'cookie-detected':
      return t('login.message.autoGetCookieDetected');
    case 'closed-without-cookie':
      return t('login.message.autoGetCookieClosedWithoutCookie');
    case 'open-failed':
    case 'load-failed':
      return t('login.message.autoGetCookieOpenFailed');
    default:
      return '';
  }
};

const createAutoCookieAttemptId = () =>
  `cookie-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isStaleAutoCookieAttempt = (attemptId?: string | null) =>
  Boolean(
    attemptId && activeAutoCookieAttemptId.value && attemptId !== activeAutoCookieAttemptId.value
  );

const loginByToken = async () => {
  const originalToken = localStorage.getItem('token');

  if (!token.value.trim()) {
    const errorMsg = t('login.message.tokenRequired');
    message.error(errorMsg);
    emit('loginError', errorMsg);
    return;
  }

  try {
    localStorage.setItem('token', token.value.trim());

    const user = await getUserDetail();
    if (user.data && user.data.profile) {
      const successMsg = t('login.message.tokenLoginSuccess');
      message.success(successMsg);
      emit('loginSuccess', user.data.profile, 'cookie');
    } else {
      if (originalToken) localStorage.setItem('token', originalToken);
      else localStorage.removeItem('token');
      const errorMsg = t('login.message.tokenInvalid');
      message.error(errorMsg);
      emit('loginError', errorMsg);
    }
  } catch (error) {
    if (originalToken) localStorage.setItem('token', originalToken);
    else localStorage.removeItem('token');
    const errorMsg = t('login.message.tokenInvalid');
    message.error(errorMsg);
    emit('loginError', errorMsg);
    console.error('Token登录失败:', error);
  }
};

const autoGetCookie = () => {
  if (!isElectron) {
    message.error('此功能仅在桌面版中可用');
    return;
  }

  const attemptId = createAutoCookieAttemptId();
  activeAutoCookieAttemptId.value = attemptId;
  autoCookieAttemptStartedAt.value = Date.now();
  autoCookieElapsedSeconds.value = 0;
  setAutoCookieStatus('opening', t('login.message.autoGetCookiePreparing'));
  message.info(t('login.message.autoGetCookieTip'));
  window.ipcRenderer.send('open-login', { attemptId });
};

const handleLoginWindowStatus = (payload: LoginWindowStatusPayload) => {
  if (!payload?.status) return;
  if (isStaleAutoCookieAttempt(payload.attemptId)) return;

  setAutoCookieStatus(payload.status, getAutoCookieStatusText(payload));

  if (payload.status === 'closed-without-cookie') {
    message.warning(t('login.message.autoGetCookieClosedWithoutCookie'));
    return;
  }

  if (payload.status === 'open-failed' || payload.status === 'load-failed') {
    message.error(t('login.message.autoGetCookieOpenFailed'));
  }
};

const handleCookieReceived = async (payload: string | CookieReceivedPayload) => {
  const cookieValue = typeof payload === 'string' ? payload : payload?.value;
  const attemptId = typeof payload === 'string' ? null : payload?.attemptId || null;
  if (!cookieValue) return;
  if (isStaleAutoCookieAttempt(attemptId)) return;

  const originalToken = localStorage.getItem('token');
  setAutoCookieStatus('cookie-detected', t('login.message.autoGetCookieDetected'));

  try {
    localStorage.setItem('token', cookieValue);

    const user = await getUserDetail();
    if (user.data && user.data.profile) {
      const successMsg = t('login.message.autoGetCookieSuccess');
      setAutoCookieStatus('success', successMsg);
      message.success(successMsg);
      emit('loginSuccess', user.data.profile, 'cookie');
    } else {
      if (originalToken) localStorage.setItem('token', originalToken);
      else localStorage.removeItem('token');
      const errorMsg = t('login.message.autoGetCookieFailed');
      setAutoCookieStatus('failed', errorMsg);
      message.error(errorMsg);
      emit('loginError', errorMsg);
    }
  } catch (error) {
    if (originalToken) localStorage.setItem('token', originalToken);
    else localStorage.removeItem('token');
    const errorMsg = t('login.message.autoGetCookieFailed');
    setAutoCookieStatus('failed', errorMsg);
    message.error(errorMsg);
    emit('loginError', errorMsg);
    console.error('自动获取 Cookie 失败:', error);
  }
};

onMounted(() => {
  if (isElectron) {
    removeCookieListener = window.ipcRenderer.on('send-cookies', handleCookieReceived);
    removeLoginWindowStatusListener = window.ipcRenderer.on(
      'login-window-status',
      handleLoginWindowStatus
    );
  }
});

onBeforeUnmount(() => {
  if (isElectron) {
    removeCookieListener?.();
    removeLoginWindowStatusListener?.();
    removeCookieListener = null;
    removeLoginWindowStatusListener = null;
  }
  stopAutoCookieElapsedTimer();
});
</script>

<template>
  <section
    class="cookie-login"
    :class="setAnimationClass('animate__fadeInUp')"
    aria-labelledby="cookie-login-title"
  >
    <h2 id="cookie-login-title" class="login-title m-0">{{ t('login.title.cookie') }}</h2>
    <div class="phone-page">
      <textarea
        v-model="token"
        class="token-input"
        :placeholder="t('login.placeholder.cookie')"
        aria-labelledby="cookie-login-title"
        aria-describedby="cookie-login-tip"
        rows="4"
      />
    </div>
    <p id="cookie-login-tip" class="text m-0">{{ t('login.tokenTip') }}</p>
    <n-button class="btn-login" attr-type="button" @click="loginByToken()">{{
      t('login.button.cookieLogin')
    }}</n-button>
    <n-button
      v-if="isElectron"
      class="btn-auto-cookie"
      attr-type="button"
      @click="autoGetCookie()"
      type="info"
    >
      {{ t('login.button.autoGetCookie') }}
    </n-button>
    <p
      v-if="autoCookieStatusText"
      class="auto-cookie-status"
      :data-state="autoCookieStatusCode"
      role="status"
      aria-live="polite"
    >
      {{ displayAutoCookieStatusText }}
    </p>
  </section>
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

.auto-cookie-status {
  width: 250px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(15, 23, 42, 0.28);
}

.auto-cookie-status[data-state='request-received'],
.auto-cookie-status[data-state='opening'] {
  background: rgba(59, 130, 246, 0.22);
}

.auto-cookie-status[data-state='opened'],
.auto-cookie-status[data-state='focused-existing'],
.auto-cookie-status[data-state='cookie-detected'],
.auto-cookie-status[data-state='success'] {
  background: rgba(34, 197, 94, 0.24);
}

.auto-cookie-status[data-state='closed-without-cookie'],
.auto-cookie-status[data-state='failed'] {
  background: rgba(245, 158, 11, 0.24);
}

.auto-cookie-status[data-state='open-failed'],
.auto-cookie-status[data-state='load-failed'] {
  background: rgba(239, 68, 68, 0.24);
}
</style>
