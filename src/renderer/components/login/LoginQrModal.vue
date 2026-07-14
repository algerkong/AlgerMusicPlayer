<template>
  <!-- Ui* 别名：避免 kebab-case 与原生 <dialog>/<button> 冲突 -->
  <ui-dialog :open="show" @update:open="onShowChange">
    <dialog-content
      class="login-qr-dialog w-[min(440px,92vw)] sm:max-w-[440px]"
      :show-close-button="!(loggingIn && pollStatus === 'scanned' && !needSms)"
      @pointer-down-outside="onInteractOutside"
      @escape-key-down="onInteractOutside"
    >
      <dialog-header>
        <dialog-title>登录在线账号</dialog-title>
        <dialog-description>
          <template v-if="step === 'notice'"
            >阅读说明后扫码登录（部分账号需短信二次验证）。</template
          >
          <template v-else-if="step === 'mfa'">扫码已确认 · 请完成短信验证</template>
          <template v-else>{{ statusText }}</template>
        </dialog-description>
      </dialog-header>

      <!-- 风险说明 -->
      <div v-if="step === 'notice'" class="space-y-3">
        <div class="notice-banner text-sm">
          非官方音源接入，仅供个人使用。可能违反平台协议，账号风险自负。
        </div>
        <div class="notice-box text-sm leading-relaxed" style="color: var(--chrome-text-muted)">
          <ul class="list-disc pl-5 space-y-1.5">
            <li>与字节跳动 / 汽水音乐无隶属关系。</li>
            <li>登录态仅保存在本机，请勿分享二维码或 Cookie。</li>
            <li>继续即表示你已理解并同意上述风险。</li>
          </ul>
        </div>
      </div>

      <!-- 二维码 -->
      <div v-else-if="step === 'qr'" class="flex flex-col items-center gap-3 py-1">
        <div class="qr-frame">
          <div v-if="loadingQr" class="qr-loading">
            <i class="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <img v-else-if="qrImageSrc" :src="qrImageSrc" alt="登录二维码" class="qr-img" />
          <div v-else class="qr-fallback text-sm text-center px-3">未能生成二维码，请刷新重试</div>
        </div>
        <p
          v-if="pollMessage"
          class="text-xs text-center max-w-full px-1 leading-relaxed"
          style="color: rgb(var(--chrome-accent))"
        >
          {{ pollMessage }}
        </p>
      </div>

      <!-- 扫码后 MFA -->
      <div v-else-if="step === 'mfa'" class="space-y-3">
        <div class="notice-banner text-sm">
          <p>平台要求短信二次验证。</p>
          <p v-if="mfaMobile" class="text-xs mt-1 opacity-90">发送至：{{ mfaMobile }}</p>
        </div>
        <div class="field">
          <label class="field-label">短信验证码</label>
          <input
            v-model="smsCode"
            class="field-input"
            type="text"
            inputmode="numeric"
            maxlength="8"
            placeholder="输入验证码"
            @keydown.enter="submitMfaCode"
          />
        </div>
        <p
          v-if="pollMessage"
          class="text-xs leading-relaxed"
          style="color: rgb(var(--chrome-accent))"
        >
          {{ pollMessage }}
        </p>
      </div>

      <dialog-footer>
        <ui-button
          variant="outline"
          class="chrome-action"
          :disabled="mfaSubmitting"
          @click="onShowChange(false)"
        >
          取消
        </ui-button>

        <template v-if="step === 'notice'">
          <ui-button class="chrome-primary" :disabled="loadingQr" @click="startQrLogin">
            <i v-if="loadingQr" class="ri-loader-4-line animate-spin" />
            获取登录二维码
          </ui-button>
        </template>

        <template v-else-if="step === 'qr'">
          <ui-button
            class="chrome-primary"
            :disabled="loadingQr || (loggingIn && pollStatus === 'scanned' && !needSms)"
            @click="startQrLogin"
          >
            <i v-if="loadingQr" class="ri-loader-4-line animate-spin" />
            {{ pollStatus === 'expired' || pollStatus === 'failed' ? '重新获取' : '刷新二维码' }}
          </ui-button>
        </template>

        <template v-else-if="step === 'mfa'">
          <ui-button
            variant="outline"
            class="chrome-action"
            :disabled="mfaSending || mfaCooldown > 0"
            @click="sendMfaSms"
          >
            {{ mfaSending ? '发送中…' : mfaCooldown > 0 ? `${mfaCooldown}s` : '发送验证码' }}
          </ui-button>
          <ui-button
            class="chrome-primary"
            :disabled="mfaSubmitting || smsCode.replace(/\D/g, '').length < 4"
            @click="submitMfaCode"
          >
            {{ mfaSubmitting ? '验证中…' : '确认登录' }}
          </ui-button>
        </template>
      </dialog-footer>
    </dialog-content>
  </ui-dialog>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import {
  msCreateQrLogin,
  msGetProfile,
  msPollQrLogin,
  type MsQrLoginMfa,
  type MsQrLoginStatus,
  msQrSendMfaSms,
  msQrValidateMfaSms
} from '@/api/musicSource';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useUserStore } from '@/store/modules/user';
import { isElectron } from '@/utils';

defineOptions({ name: 'LoginQrModal' });

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'success'): void;
}>();

const message = useMessage();
const userStore = useUserStore();

const step = ref<'notice' | 'qr' | 'mfa'>('notice');
const loadingQr = ref(false);
const loggingIn = ref(false);
const qrToken = ref('');
const qrcodeRaw = ref('');
const pollStatus = ref<MsQrLoginStatus | null>(null);
const pollMessage = ref('');
const needSms = ref(false);
const mfaInfo = ref<MsQrLoginMfa | null>(null);
const smsCode = ref('');
const mfaSending = ref(false);
const mfaSubmitting = ref(false);
const mfaCooldown = ref(0);
const rateLimitedUntil = ref(0);

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let mfaCdTimer: ReturnType<typeof setInterval> | null = null;

const POLL_MS_WAITING = 8000;
const POLL_MS_SCANNED = 5000;

const qrImageSrc = computed(() => {
  const raw = (qrcodeRaw.value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.replace(/\s/g, '').length > 80) {
    return `data:image/png;base64,${raw.replace(/\s/g, '')}`;
  }
  return '';
});

const statusText = computed(() => {
  switch (pollStatus.value) {
    case 'waiting':
      return '请使用汽水 / 抖音 App 扫描二维码';
    case 'scanned':
      return needSms.value ? '已扫码，需要短信验证' : '已扫码，请在手机上确认';
    case 'confirmed':
      return '登录成功';
    case 'expired':
      return '二维码已过期，请重新获取';
    case 'failed':
      return '登录失败，请重试';
    default:
      return loadingQr.value ? '正在获取二维码…' : '等待扫码';
  }
});

const mfaMobile = computed(() => mfaInfo.value?.mobile || '');

function friendlyError(raw: string): string {
  const msg = (raw || '').trim();
  if (!msg) return '操作失败，请稍后重试';
  if (
    msg.includes('系统繁忙') ||
    msg.includes('2156') ||
    msg.includes('太频繁') ||
    msg.includes('稍后再试') ||
    /rate|frequent/i.test(msg)
  ) {
    return '平台接口繁忙，请等待 1～2 分钟后再试';
  }
  if (msg.includes('NO_HANDLER') || msg.includes('音源服务未就绪')) {
    return '音源服务未就绪，请完全退出后重启应用';
  }
  return msg;
}

function clearPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function clearCd() {
  if (mfaCdTimer) {
    clearInterval(mfaCdTimer);
    mfaCdTimer = null;
  }
}

function resetState() {
  clearPoll();
  clearCd();
  step.value = 'notice';
  loadingQr.value = false;
  loggingIn.value = false;
  qrToken.value = '';
  qrcodeRaw.value = '';
  pollStatus.value = null;
  pollMessage.value = '';
  needSms.value = false;
  mfaInfo.value = null;
  smsCode.value = '';
  mfaSending.value = false;
  mfaSubmitting.value = false;
  mfaCooldown.value = 0;
  rateLimitedUntil.value = 0;
}

function onShowChange(v: boolean) {
  emit('update:show', v);
  if (!v) resetState();
}

function onInteractOutside(e: Event) {
  if (loggingIn.value && pollStatus.value === 'scanned' && !needSms.value) {
    e.preventDefault();
  }
}

watch(
  () => props.show,
  (v) => {
    if (v) resetState();
    else clearPoll();
  }
);

onBeforeUnmount(() => {
  clearPoll();
  clearCd();
});

function applyProfile(p: {
  id: string;
  nickname: string;
  avatarUrl?: string;
  isVip: boolean;
  vipLevel: string;
}) {
  const idNum = Number(p.id);
  userStore.setUser({
    userId: Number.isFinite(idNum) ? idNum : 0,
    user_id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl || '',
    vipType: p.isVip ? 1 : 0,
    vipLevel: p.vipLevel,
    platform: 'qishui'
  });
  userStore.setLoginType('qr');
}

async function finishLogin() {
  try {
    const profile = await msGetProfile();
    applyProfile(profile);
    message.success(`欢迎，${profile.nickname}`);
  } catch {
    applyProfile({
      id: '0',
      nickname: '已登录用户',
      isVip: false,
      vipLevel: 'none'
    });
    message.success('登录成功');
  }
  emit('success');
  emit('update:show', false);
  resetState();
}

function enterMfa(mfa: MsQrLoginMfa, msg?: string) {
  needSms.value = true;
  mfaInfo.value = mfa;
  step.value = 'mfa';
  loggingIn.value = false;
  clearPoll();
  pollMessage.value = msg || '请发送并输入短信验证码';
}

function schedulePoll(delayMs?: number) {
  clearPoll();
  pollTimer = setTimeout(
    () => {
      void doPoll();
    },
    Math.max(500, delayMs ?? POLL_MS_WAITING)
  );
}

function nextPollDelay(result: {
  status?: MsQrLoginStatus | null;
  retryAfterSec?: number;
}): number {
  if (result.retryAfterSec && result.retryAfterSec > 0) {
    return result.retryAfterSec * 1000;
  }
  if (result.status === 'scanned' || needSms.value) return POLL_MS_SCANNED;
  return POLL_MS_WAITING;
}

async function startQrLogin() {
  if (!isElectron) {
    message.warning('扫码登录仅支持桌面客户端');
    return;
  }
  if (Date.now() < rateLimitedUntil.value) {
    message.warning('接口冷却中，请稍后再试');
    return;
  }

  clearPoll();
  loadingQr.value = true;
  loggingIn.value = false;
  needSms.value = false;
  mfaInfo.value = null;
  pollStatus.value = null;
  pollMessage.value = '';
  qrToken.value = '';
  qrcodeRaw.value = '';
  smsCode.value = '';
  step.value = 'qr';

  try {
    const session = await msCreateQrLogin();
    qrToken.value = session.token;
    qrcodeRaw.value = session.qrcode || '';
    if (!session.token) {
      message.error('未获取到登录令牌');
      pollStatus.value = 'failed';
      return;
    }
    pollStatus.value = 'waiting';
    loggingIn.value = true;
    schedulePoll(POLL_MS_WAITING);
  } catch (error: any) {
    const tip = friendlyError(error?.message || '');
    message.error(tip);
    pollStatus.value = 'failed';
    pollMessage.value = tip;
  } finally {
    loadingQr.value = false;
  }
}

async function doPoll() {
  const token = qrToken.value;
  if (!token || !props.show || step.value === 'mfa') return;

  try {
    const result = await msPollQrLogin(token);
    pollStatus.value = result.status;
    pollMessage.value = result.message ? friendlyError(result.message) : '';

    if (result.retryAfterSec && result.retryAfterSec >= 10) {
      rateLimitedUntil.value = Date.now() + result.retryAfterSec * 1000;
    }

    if (result.mfa?.needSms) {
      enterMfa(result.mfa, result.message);
      return;
    }
    if (result.status === 'confirmed') {
      loggingIn.value = false;
      clearPoll();
      await finishLogin();
      return;
    }
    if (result.status === 'expired' || result.status === 'failed') {
      loggingIn.value = false;
      clearPoll();
      return;
    }
    schedulePoll(nextPollDelay(result));
  } catch (error: any) {
    pollMessage.value = friendlyError(error?.message || '轮询失败');
    schedulePoll(POLL_MS_SCANNED);
  }
}

function startMfaCooldown(sec: number) {
  mfaCooldown.value = sec;
  clearCd();
  mfaCdTimer = setInterval(() => {
    mfaCooldown.value -= 1;
    if (mfaCooldown.value <= 0) clearCd();
  }, 1000);
}

async function sendMfaSms() {
  if (!qrToken.value || mfaCooldown.value > 0) return;
  mfaSending.value = true;
  try {
    const r = await msQrSendMfaSms(qrToken.value);
    if (r.ok) {
      message.success(r.message || '验证码已发送');
      pollMessage.value = r.message;
      if (r.mobile) {
        mfaInfo.value = { ...(mfaInfo.value || { needSms: true }), mobile: r.mobile };
      }
      startMfaCooldown(r.retryTime || 60);
    } else {
      message.error(friendlyError(r.message));
      pollMessage.value = friendlyError(r.message);
    }
  } catch (error: any) {
    const tip = friendlyError(error?.message || '');
    message.error(tip);
    pollMessage.value = tip;
  } finally {
    mfaSending.value = false;
  }
}

async function submitMfaCode() {
  if (!qrToken.value) return;
  const code = smsCode.value.replace(/\D/g, '');
  if (code.length < 4) {
    message.warning('请输入验证码');
    return;
  }
  mfaSubmitting.value = true;
  try {
    const r = await msQrValidateMfaSms(qrToken.value, code);
    if (r.ok) await finishLogin();
    else {
      message.error(friendlyError(r.message));
      pollMessage.value = friendlyError(r.message);
    }
  } catch (error: any) {
    const tip = friendlyError(error?.message || '');
    message.error(tip);
    pollMessage.value = tip;
  } finally {
    mfaSubmitting.value = false;
  }
}
</script>

<style scoped>
.notice-banner {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--chrome-accent), 0.14);
  border: 1px solid rgba(var(--chrome-accent), 0.35);
  color: var(--chrome-text);
}

.notice-box {
  max-height: 200px;
  overflow-y: auto;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--chrome-surface);
  border: 1px solid var(--chrome-border);
  backdrop-filter: blur(var(--chrome-blur));
  -webkit-backdrop-filter: blur(var(--chrome-blur));
}

.qr-frame {
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--chrome-border);
  box-shadow: 0 1px 6px rgb(0 0 0 / 8%);
}

.qr-img {
  width: 200px;
  height: 200px;
  object-fit: contain;
}

.qr-fallback {
  width: 100%;
  color: var(--chrome-text-muted);
}

.qr-loading {
  color: rgb(var(--chrome-accent));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  color: var(--chrome-text-muted);
}

.field-input {
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--chrome-border);
  background: var(--chrome-surface);
  color: var(--chrome-text);
  padding: 0 12px;
  outline: none;
}

.field-input:focus {
  border-color: rgb(var(--chrome-accent));
  box-shadow: 0 0 0 2px rgba(var(--chrome-accent), 0.25);
}

:deep(.chrome-action) {
  border-color: var(--chrome-border) !important;
  background: var(--chrome-surface) !important;
  color: var(--chrome-text) !important;
  backdrop-filter: blur(var(--chrome-blur));
}

:deep(.chrome-action:hover) {
  background: var(--chrome-surface-strong) !important;
}

:deep(.chrome-primary) {
  background: rgb(var(--chrome-accent)) !important;
  color: #fff !important;
  border-color: transparent !important;
}

:deep(.chrome-primary:hover) {
  filter: brightness(1.06);
}

:deep(.chrome-primary:disabled),
:deep(.chrome-action:disabled) {
  opacity: 0.55;
}
</style>
