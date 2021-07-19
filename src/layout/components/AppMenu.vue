<template>
  <div>
    <!-- menu -->
    <div class="app-menu">
      <div class="app-menu-header">
        <div class="app-menu-logo">
          <img src="@/assets/logo.png" class="w-10 h-10" alt="logo" />
        </div>
      </div>
      <div class="app-menu-list">
        <div class="app-menu-item" v-for="(item,index) in menus" :key="index">
          <router-link class="app-menu-item-link mb-4 mt-4" :to="item.href">
            <i class="iconfont app-menu-item-icon" :style="iconStyle" :class="item.icon"></i>
            <span v-if="isText" class="app-menu-item-text ml-3">{{ item.text }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "@vue/runtime-core";

const props = defineProps({
  isText: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: '30px'
  },
  color: {
    type: String,
    default: '#fff'
  },
  menus: {
    type: Array,
    default: () => []
  }
})

let iconStyle = ref({})
onMounted(() => {
  // 初始化
  iconStyle.value = {
    fontSize: props.size,
    color: props.color
  }
})
</script>

<style lang="scss" scoped>
.app-menu {
  @apply flex-col items-center justify-center p-4;
  max-width: 100px;
}
.app-menu-item-link,
.app-menu-header {
  @apply flex items-center justify-center;
}

img {
  color: #fff;
}
</style>