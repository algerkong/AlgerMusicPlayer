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

      <div class="p-6 rounded-lg shadow-lg bg-light dark:bg-gray-800">
        <div class="flex gap-10">
          <div class="flex flex-col items-center gap-2">
            <n-image
              :src="alipayQR"
              alt="支付宝收款码"
              class="w-32 h-32 rounded-lg cursor-none"
              preview-disabled
            />
            <span class="text-sm text-gray-700 dark:text-gray-200">支付宝</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <n-image
              :src="wechatQR"
              alt="微信收款码"
              class="w-32 h-32 rounded-lg cursor-none"
              preview-disabled
            />
            <span class="text-sm text-gray-700 dark:text-gray-200">微信支付</span>
          </div>
        </div>

        <div class="mt-4">
          <p
            class="text-sm text-gray-700 dark:text-gray-200 text-center cursor-pointer hover:text-green-500"
            @click="copyQQ"
          >
            QQ群：789288579
          </p>
        </div>
      </div>
    </n-popover>
  </div>
</template>

<script setup>
import { NButton, NImage, NPopover } from 'naive-ui';

const message = useMessage();
const copyQQ = () => {
  navigator.clipboard.writeText('789288579');
  message.success('已复制到剪贴板');
};

defineProps({
  alipayQR: {
    type: String,
    required: true
  },
  wechatQR: {
    type: String,
    required: true
  }
});
</script>
