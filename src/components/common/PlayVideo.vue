<template>
  <n-drawer :show="show" height="100vh" placement="bottom" :z-index="999999999">
    <div class="mv-detail">
      <video :src="url" controls autoplay></video>
      <div class="mv-detail-title">
        <div class="title">{{ title }}</div>
        <button @click="close">
          <i class="iconfont icon-xiasanjiaoxing"></i>
        </button>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';

import { audioService } from '@/services/audioService';

const props = defineProps<{
  show: boolean;
  title: string;
  url: string;
}>();

const store = useStore();

watch(
  () => props.show,
  (val) => {
    if (val) {
      store.commit('setIsPlay', false);
      store.commit('setPlayMusic', false);
      audioService.getCurrentSound()?.pause();
    }
  },
);

const emit = defineEmits(['update:show']);

const close = () => {
  emit('update:show', false);
};
</script>

<style scoped lang="scss">
.mv-detail {
  @apply w-full h-full bg-black relative;

  &-title {
    @apply absolute w-full left-0 flex justify-between h-16 px-6 py-2 text-xl font-bold items-center z-50 transition-all duration-300 ease-in-out -top-24;
    background: linear-gradient(0, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
    button .icon-xiasanjiaoxing {
      @apply text-3xl;
    }

    button:hover {
      @apply text-green-400;
    }
  }

  video {
    @apply w-full h-full;
  }
  video:hover + .mv-detail-title {
    @apply top-0;
  }

  .mv-detail-title:hover {
    @apply top-0;
  }
}
</style>
