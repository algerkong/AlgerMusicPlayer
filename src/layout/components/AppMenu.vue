<template>
  <div>
    <!-- menu -->
    <div class="app-menu">
      <div class="app-menu-header">
        <div class="app-menu-logo">
          <img src="/icon.png" class="w-9 h-9" alt="logo" />
        </div>
      </div>
      <div class="app-menu-list">
        <div v-for="(item, index) in menus" :key="item.path" class="app-menu-item">
          <router-link class="app-menu-item-link" :to="item.path">
            <i class="iconfont app-menu-item-icon" :style="iconStyle(index)" :class="item.meta.icon"></i>
            <span v-if="isText" class="app-menu-item-text ml-3">{{ item.meta.title }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';

const props = defineProps({
  isText: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: '26px',
  },
  color: {
    type: String,
    default: '#aaa',
  },
  selectColor: {
    type: String,
    default: '#10B981',
  },
  menus: {
    type: Array as any,
    default: () => [],
  },
});

const route = useRoute();
const path = ref(route.path);
watch(
  () => route.path,
  async (newParams) => {
    path.value = newParams;
  },
);

const iconStyle = (index: number) => {
  const style = {
    fontSize: props.size,
    color: path.value === props.menus[index].path ? props.selectColor : props.color,
  };
  return style;
};
</script>

<style lang="scss" scoped>
.app-menu {
  @apply flex-col items-center justify-center px-6;
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
  color: #10b981 !important;
  transform: scale(1.05);
  transition: 0.2s ease-in-out;
}
</style>
