<template>
  <n-scrollbar>
    <div class="set-page">
      <div v-if="isElectron" class="set-item">
        <div>
          <div class="set-item-title">代理</div>
          <div class="set-item-content">无法听音乐时打开</div>
        </div>
        <n-switch v-model:value="setData.isProxy" />
      </div>
      <div class="set-item">
        <div>
          <div class="set-item-title">关闭动画效果</div>
        </div>
        <n-switch v-model:value="setData.noAnimate" />
      </div>
      <div class="set-item">
        <div>
          <div class="set-item-title">动画速度</div>
          <div class="set-item-content">调节动画播放速度</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">{{ setData.animationSpeed }}x</span>
          <div class="w-40">
            <n-slider
              v-model:value="setData.animationSpeed"
              :min="0.1"
              :max="3"
              :step="0.1"
              :marks="{
                0.1: '极慢',
                1: '正常',
                3: '极快',
              }"
              :disabled="setData.noAnimate"
              class="w-40"
            />
          </div>
        </div>
      </div>
      <div class="set-item">
        <div>
          <div class="set-item-title">版本</div>
          <div class="set-item-content">当前已是最新版本</div>
        </div>
        <div>{{ config.version }}</div>
      </div>
      <div class="set-item cursor-pointer hover:text-green-500 hover:bg-green-950 transition-all" @click="openAuthor">
        <div>
          <div class="set-item-title">作者</div>
          <div class="set-item-content">algerkong github</div>
        </div>
        <div>{{ setData.author }}</div>
      </div>

      <div class="set-action">
        <n-button class="w-40 h-10" @click="handelCancel">取消</n-button>
        <n-button type="primary" class="w-40 h-10" @click="handleSave">{{
          isElectron ? '保存并重启' : '保存'
        }}</n-button>
      </div>

      <div class="p-6 bg-black rounded-lg shadow-lg mt-20">
        <div class="text-gray-100 text-base text-center">支持作者</div>
        <div class="flex gap-60">
          <div class="flex flex-col items-center gap-2 cursor-pointer hover:scale-[2] transition-all z-10 bg-black">
            <n-image :src="alipayQR" alt="支付宝收款码" class="w-32 h-32 rounded-lg" preview-disabled />
            <span class="text-sm text-gray-100">支付宝</span>
          </div>
          <div class="flex flex-col items-center gap-2 cursor-pointer hover:scale-[2] transition-all z-10 bg-black">
            <n-image :src="wechatQR" alt="微信收款码" class="w-32 h-32 rounded-lg" preview-disabled />
            <span class="text-sm text-gray-100">微信支付</span>
          </div>
        </div>
      </div>
    </div>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import config from '@/../package.json';
import store from '@/store';

defineOptions({
  name: 'Setting',
});

const alipayQR = 'https://github.com/algerkong/algerkong/blob/main/alipay.jpg?raw=true';
const wechatQR = 'https://github.com/algerkong/algerkong/blob/main/wechat.jpg?raw=true';

const isElectron = ref((window as any).electronAPI !== undefined);
const router = useRouter();

// 使用计算属性来获取和设置数据
const setData = computed({
  get: () => store.state.setData,
  set: (value) => store.commit('setSetData', value),
});

const handelCancel = () => {
  router.back();
};

const handleSave = () => {
  store.commit('setSetData', setData.value);
  if (isElectron.value) {
    (window as any).electronAPI.restart();
  }
  router.back();
};

const openAuthor = () => {
  window.open(setData.value.authorUrl, '_blank');
};
</script>

<style scoped lang="scss">
.set-page {
  @apply flex flex-col justify-center items-center pt-8;
}
.set-item {
  @apply w-3/5 flex justify-between items-center mb-2 px-4 py-2 rounded-lg;
  .set-item-title {
    @apply text-gray-200 text-base;
  }
  .set-item-content {
    @apply text-gray-400 text-sm;
  }
}
.set-action {
  @apply flex gap-3 mt-4;
}
</style>
