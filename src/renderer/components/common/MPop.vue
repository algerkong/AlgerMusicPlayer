<script lang="ts" setup>
import { setAnimationClass } from '@/utils';

const props = defineProps({
  showPop: {
    type: Boolean,
    default: false
  },
  showClose: {
    type: Boolean,
    default: true
  }
});

const musicFullClass = computed(() => {
  if (props.showPop) {
    return setAnimationClass('animate__fadeInUp');
  }
  return setAnimationClass('animate__fadeOutDown');
});
</script>

<template>
  <div v-show="props.showPop" class="pop-page" :class="musicFullClass">
    <i v-if="props.showClose" class="iconfont icon-icon_error close"></i>
    <img src="http://code.myalger.top/2000*2000.jpg,f054f0,0f2255" />
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.pop-page {
  height: 800px;
  @apply absolute top-4 left-0 w-full;
  background-color: #000000f0;
  .close {
    @apply absolute top-4 right-4 cursor-pointer text-white text-3xl;
  }
}
</style>
