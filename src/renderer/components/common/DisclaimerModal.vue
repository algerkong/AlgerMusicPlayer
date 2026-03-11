<template>
  <Teleport to="body">
    <Transition name="disclaimer-modal">
      <div
        v-if="showDisclaimer"
        class="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-md"
      >
        <div
          class="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div class="h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"></div>
          <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white px-6 mt-10">
            {{ t('comp.disclaimer.title') }}
          </h2>

          <div class="px-6 py-6">
            <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              <div
                class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              >
                <div class="flex items-start gap-3">
                  <i class="ri-alert-line text-amber-500 text-xl flex-shrink-0 mt-0.5"></i>
                  <p class="text-amber-700 dark:text-amber-300">
                    {{ t('comp.disclaimer.warning') }}
                  </p>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-start gap-3">
                  <div
                    class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="ri-book-2-line text-blue-500 text-sm"></i>
                  </div>
                  <p>{{ t('comp.disclaimer.item1') }}</p>
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="ri-time-line text-green-500 text-sm"></i>
                  </div>
                  <p>{{ t('comp.disclaimer.item2') }}</p>
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="ri-shield-check-line text-purple-500 text-sm"></i>
                  </div>
                  <p>{{ t('comp.disclaimer.item3') }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 pb-8 space-y-3">
            <button
              @click="handleAgree"
              class="w-full py-4 rounded-2xl text-base font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-green-500/25"
            >
              <span class="flex items-center justify-center gap-2">
                <i class="ri-check-line text-lg"></i>
                {{ t('comp.disclaimer.agree') }}
              </span>
            </button>

            <button
              @click="handleDisagree"
              class="w-full py-3 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {{ t('comp.disclaimer.disagree') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="donate-modal">
      <div
        v-if="showDonate"
        class="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-md"
      >
        <div
          class="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div class="h-2 bg-gradient-to-r from-pink-400 via-rose-500 to-red-500"></div>

          <div class="flex justify-center pt-8 pb-4">
            <div
              class="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg"
            >
              <i class="ri-heart-3-fill text-4xl text-white"></i>
            </div>
          </div>

          <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white px-6">
            {{ t('comp.donate.title') }}
          </h2>

          <p class="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 px-6">
            {{ t('comp.donate.subtitle') }}
          </p>

          <div class="px-6 py-6">
            <div
              class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 mb-6"
            >
              <div class="flex items-start gap-3">
                <i class="ri-gift-line text-rose-500 text-xl flex-shrink-0 mt-0.5"></i>
                <p class="text-rose-700 dark:text-rose-300 text-sm">
                  {{ t('comp.donate.tip') }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <button
                @click="openDonateLink('wechat')"
                class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <div class="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <i class="ri-wechat-fill text-2xl text-white"></i>
                </div>
                <span class="text-sm font-medium text-green-700 dark:text-green-300">{{
                  t('comp.donate.wechat')
                }}</span>
              </button>

              <button
                @click="openDonateLink('alipay')"
                class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <i class="ri-alipay-fill text-2xl text-white"></i>
                </div>
                <span class="text-sm font-medium text-blue-700 dark:text-blue-300">{{
                  t('comp.donate.alipay')
                }}</span>
              </button>
            </div>
          </div>

          <div class="px-6 pb-8">
            <button
              @click="handleEnterApp"
              class="w-full py-4 rounded-2xl text-base font-medium text-white bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 hover:from-gray-800 hover:to-gray-950 active:scale-[0.98] transition-all duration-200 shadow-lg"
            >
              <span class="flex items-center justify-center gap-2">
                <i class="ri-arrow-right-line text-lg"></i>
                {{ t('comp.donate.enterApp') }}
              </span>
            </button>

            <p class="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
              {{ t('comp.donate.noForce') }}
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="qrcode-modal">
      <div
        v-if="showQRCode"
        class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/70 backdrop-blur-md"
        @click.self="closeQRCode"
      >
        <div
          class="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div
            class="h-2"
            :class="
              qrcodeType === 'wechat'
                ? 'bg-gradient-to-r from-green-400 to-green-600'
                : 'bg-gradient-to-r from-blue-400 to-blue-600'
            "
          ></div>

          <div class="flex items-center justify-between px-6 py-4">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ qrcodeType === 'wechat' ? t('comp.donate.wechatQR') : t('comp.donate.alipayQR') }}
            </h3>
            <button
              @click="closeQRCode"
              class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <i class="ri-close-line text-xl"></i>
            </button>
          </div>

          <div class="px-6 pb-6">
            <div class="bg-white p-4 rounded-2xl">
              <img
                :src="qrcodeType === 'wechat' ? wechatQRCode : alipayQRCode"
                :alt="qrcodeType === 'wechat' ? 'WeChat QR Code' : 'Alipay QR Code'"
                class="w-full rounded-xl"
              />
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
              {{ t('comp.donate.scanTip') }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import alipayQRCode from '@/assets/alipay.png';
import wechatQRCode from '@/assets/wechat.png';
import { isElectron, isLyricWindow } from '@/utils';

import config from '../../../../package.json';

const { t } = useI18n();

const DISCLAIMER_AGREED_KEY = 'disclaimer_agreed_timestamp';
const DONATION_SHOWN_VERSION_KEY = 'donation_shown_version';

const showDisclaimer = ref(false);
const showDonate = ref(false);
const showQRCode = ref(false);
const qrcodeType = ref<'wechat' | 'alipay'>('wechat');
const isTransitioning = ref(false);

const shouldShowDisclaimer = () => {
  return !localStorage.getItem(DISCLAIMER_AGREED_KEY);
};

const shouldShowDonateAfterUpdate = () => {
  if (!localStorage.getItem(DISCLAIMER_AGREED_KEY)) return false;
  const shownVersion = localStorage.getItem(DONATION_SHOWN_VERSION_KEY);
  return shownVersion !== config.version;
};

const handleAgree = () => {
  if (isTransitioning.value) return;
  isTransitioning.value = true;

  showDisclaimer.value = false;
  setTimeout(() => {
    showDonate.value = true;
    isTransitioning.value = false;
  }, 300);
};

const handleDisagree = () => {
  if (isTransitioning.value) return;
  isTransitioning.value = true;

  if (isElectron) {
    window.api?.quitApp?.();
  } else {
    window.close();
  }
  isTransitioning.value = false;
};

const openDonateLink = (type: 'wechat' | 'alipay') => {
  if (isTransitioning.value) return;

  qrcodeType.value = type;
  showQRCode.value = true;
};

const closeQRCode = () => {
  showQRCode.value = false;
};

const handleEnterApp = () => {
  if (isTransitioning.value) return;
  isTransitioning.value = true;

  localStorage.setItem(DISCLAIMER_AGREED_KEY, Date.now().toString());
  localStorage.setItem(DONATION_SHOWN_VERSION_KEY, config.version);
  showDonate.value = false;

  setTimeout(() => {
    isTransitioning.value = false;
  }, 300);
};

onMounted(() => {
  if (isLyricWindow.value) return;

  if (shouldShowDisclaimer()) {
    showDisclaimer.value = true;
    return;
  }

  if (shouldShowDonateAfterUpdate()) {
    showDonate.value = true;
  }
});
</script>

<style scoped>
.disclaimer-modal-enter-active,
.disclaimer-modal-leave-active {
  transition: opacity 0.3s ease;
}

.disclaimer-modal-enter-from,
.disclaimer-modal-leave-to {
  opacity: 0;
}

.donate-modal-enter-active,
.donate-modal-leave-active {
  transition: opacity 0.3s ease;
}

.donate-modal-enter-from,
.donate-modal-leave-to {
  opacity: 0;
}

.qrcode-modal-enter-active,
.qrcode-modal-leave-active {
  transition: opacity 0.3s ease;
}

.qrcode-modal-enter-from,
.qrcode-modal-leave-to {
  opacity: 0;
}
</style>
