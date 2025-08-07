<template>
  <div class="relative inline-block">
    <n-popover trigger="hover" placement="top" :show-arrow="true" :raw="true" :delay="100">
      <template #trigger>
        <slot>
          <n-button
            quaternary
            class="inline-flex items-center gap-2 px-4 py-2 transition-all duration-300 hover:-translate-y-0.5"
          >
            {{ t('comp.coffee.title') }}
          </n-button>
        </slot>
      </template>

      <div class="p-6 rounded-lg shadow-lg bg-light dark:bg-gray-800">
        <div class="flex gap-10">
          <div class="flex flex-col items-center gap-2">
            <n-image
              :src="alipayQR"
              :alt="t('comp.coffee.alipayQR')"
              class="w-32 h-32 rounded-lg cursor-none"
              preview-disabled
            />
            <span class="text-sm text-gray-700 dark:text-gray-200">{{
              t('comp.coffee.alipay')
            }}</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <n-image
              :src="wechatQR"
              :alt="t('comp.coffee.wechatQR')"
              class="w-32 h-32 rounded-lg cursor-none"
              preview-disabled
            />
            <span class="text-sm text-gray-700 dark:text-gray-200">{{
              t('comp.coffee.wechat')
            }}</span>
          </div>
        </div>

        <div class="mt-4">
          <p
            class="text-sm text-gray-700 dark:text-gray-200 text-center cursor-pointer hover:text-green-500"
            @click="copyText"
          >
            {{ t('comp.coffee.groupText') }}
          </p>
        </div>
        <div class="mt-4">
          <!-- 赞赏列表地址 -->
          <p
            class="text-sm text-green-600 dark:text-gray-200 text-center cursor-pointer hover:text-green-500"
            @click="toDonateList"
          >
            {{ t('comp.coffee.donateList') }}
          </p>
        </div>
      </div>
    </n-popover>
  </div>
</template>

<script setup>
import { NButton, NImage, NPopover, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';

import alipay from '@/assets/alipay.png';
import wechat from '@/assets/wechat.png';

const { t } = useI18n();

const message = useMessage();
const copyText = () => {
  navigator.clipboard.writeText('AlgerMusic');
  message.success(t('common.copySuccess'));
};

const toDonateList = () => {
  window.open('http://donate.alger.fun/download', '_blank');
};

defineProps({
  alipayQR: {
    type: String,
    default: alipay
  },
  wechatQR: {
    type: String,
    default: wechat
  }
});
</script>
