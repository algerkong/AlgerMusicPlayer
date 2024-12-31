<!--  -->
<template>
  <div v-if="isShow" class="loading-box">
    <div class="mask"></div>
    <div class="loading-content-box">
      <n-spin size="small" />
      <div :style="{ color: textColor }" class="tip">{{ tip }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NSpin } from 'naive-ui';
import { ref } from 'vue';

defineProps({
  tip: {
    type: String,
    default() {
      return '加载中...';
    }
  },
  maskBackground: {
    type: String,
    default() {
      return 'rgba(0, 0, 0, 0.05)';
    }
  },
  loadingColor: {
    type: String,
    default() {
      return 'rgba(255, 255, 255, 1)';
    }
  },
  textColor: {
    type: String,
    default() {
      return 'rgba(255, 255, 255, 1)';
    }
  }
});

const isShow = ref(false);
const show = () => {
  isShow.value = true;
};
const hide = () => {
  isShow.value = false;
};
defineExpose({
  show,
  hide,
  isShow
});
</script>
<style lang="scss" scoped>
.loading-box {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 9999;
  .n-spin {
    // color: #ccc;
  }
  .mask {
    width: 100%;
    height: 100%;
    @apply bg-light-100 bg-opacity-50 dark:bg-dark-100 dark:bg-opacity-50;
  }
  .loading-content-box {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .tip {
    font-size: 14px;
    margin-top: 8px;
  }
}
</style>
