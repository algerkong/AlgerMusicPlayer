<template>
  <div>
    <!-- 侧栏固定窄条，不再支持展开/缩放 -->
    <div class="app-menu">
      <div class="app-menu-list">
        <div v-for="(item, index) in menus" :key="item.path" class="app-menu-item">
          <n-tooltip :delay="200" :disabled="isMobile" placement="right">
            <template #trigger>
              <router-link class="app-menu-item-link" :to="item.path">
                <i
                  class="iconfont app-menu-item-icon"
                  :style="iconStyle(index)"
                  :class="item.meta.icon"
                ></i>
              </router-link>
            </template>
            <div>{{ t(item.meta.title) }}</div>
          </n-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { isMobile } from '@/utils';

const props = defineProps({
  size: {
    type: String,
    default: '26px'
  },
  color: {
    type: String,
    default: '#aaa'
  },
  selectColor: {
    type: String,
    default: '#22c55e'
  },
  menus: {
    type: Array as any,
    default: () => []
  }
});

const route = useRoute();
const path = ref(route.path);
watch(
  () => route.path,
  async (newParams) => {
    path.value = newParams;
  }
);

const { t } = useI18n();

const isChecked = (index: number) => {
  return path.value === props.menus[index].path;
};

const iconStyle = (index: number) => {
  return {
    fontSize: props.size,
    color: isChecked(index) ? props.selectColor : props.color
  };
};
</script>

<style lang="scss" scoped>
.app-menu {
  @apply flex-col items-center justify-start transition-all duration-300 w-[72px] px-1 pt-2;
}

.app-menu-list {
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  padding-bottom: 20px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent;
  }

  &:hover {
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;

    &::-webkit-scrollbar-thumb {
      background-color: rgba(156, 163, 175, 0.5);
    }
  }
}

.app-menu-item-link {
  @apply flex items-center justify-center w-full overflow-hidden py-4;
}

.app-menu-item-icon {
  @apply transition-all duration-200 text-gray-500 dark:text-gray-400;

  &:hover {
    @apply text-green-500 scale-105 !important;
  }
}

.mobile {
  .app-menu {
    max-width: 100%;
    width: 100vw;
    position: relative;
    bottom: 0;
    left: 0;
    z-index: 99999;
    @apply bg-light dark:bg-black border-none;

    &-list {
      @apply flex justify-between px-4;
      max-height: none !important;
      overflow: visible !important;
    }

    &-item {
      &-link {
        @apply my-2 w-auto px-2 py-2;
        width: auto !important;
      }
    }
  }
}
</style>
