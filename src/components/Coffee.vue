<template>
  <div class="relative inline-block">
    <n-popover trigger="hover" placement="top" :show-arrow="true" :raw="true" :delay="100">
      <template #trigger>
        <slot>
          <n-button
            quaternary
            class="inline-flex items-center gap-2 px-4 py-2 transition-all duration-300 hover:-translate-y-0.5"
          >
            请我喝咖啡
          </n-button>
        </slot>
      </template>

      <div class="p-6 bg-black rounded-lg shadow-lg">
        <div class="flex gap-6">
          <div class="flex flex-col items-center gap-2">
            <n-image :src="alipayQR" alt="支付宝收款码" class="w-32 h-32 rounded-lg" preview-disabled />
            <span class="text-sm text-gray-100">支付宝</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <n-image :src="wechatQR" alt="微信收款码" class="w-32 h-32 rounded-lg" preview-disabled />
            <span class="text-sm text-gray-100">微信支付</span>
          </div>
        </div>
      </div>
    </n-popover>
  </div>
</template>

<script setup>
import { NButton, NImage, NPopover } from 'naive-ui';

defineProps({
  alipayQR: {
    type: String,
    required: true,
  },
  wechatQR: {
    type: String,
    required: true,
  },
});
</script>
