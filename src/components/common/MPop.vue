<script lang="ts" setup>
import { computed, ref } from 'vue';
import { setAnimationClass, setAnimationDelay } from "@/utils";

const props = defineProps({
  showPop: {
    type: Boolean,
    default: false
  },
  showClose: {
    type: Boolean,
    default: true
  },
})

const musicFullClass = computed(() => {
  if (props.showPop) {
    return setAnimationClass('animate__fadeInUp')
  } else {
    return setAnimationClass('animate__fadeOutDown')
  }
})

</script>

<template>
  <div class="pop-page" v-show="props.showPop" :class="musicFullClass">
    <i class="iconfont icon-icon_error close" v-if="props.showClose" @click="close()"></i>
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.pop-page {
  height: 800px;
  @apply relative;
  .close {
    @apply absolute top-4 right-4 cursor-pointer text-white text-3xl;
  }
}
</style>