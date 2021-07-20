<template>
  <div>
    <!-- menu -->
    <div class="app-menu">
      <div class="app-menu-header">
        <div class="app-menu-logo">
          <img src="@/assets/logo.png" class="w-9 h-9 mt-2" alt="logo" />
        </div>
      </div>
      <div class="app-menu-list">
        <div class="app-menu-item" v-for="(item,index) in menus" :key="index">
          <router-link class="app-menu-item-link" :to="item.href">
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
import type { PropType } from "vue";

interface AppMenuItem {
  href: string;
  icon: string;
  text: string;
}

const props = defineProps({
  isText: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: '26px'
  },
  color: {
    type: String,
    default: '#aaa'
  },
  menus: {
    type: Array as PropType<AppMenuItem[]>,
    default: []
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
  @apply flex-col items-center justify-center p-6;
  max-width: 100px;
}
.app-menu-item-link,
.app-menu-header {
  @apply flex items-center justify-center;
}

.app-menu-item-link {
  @apply mb-6 mt-6;
}

.app-menu-item-icon:hover {
  color: #fff !important;
  transform: scale(1.05);
  transition: 0.2s ease-in-out;
}
</style>