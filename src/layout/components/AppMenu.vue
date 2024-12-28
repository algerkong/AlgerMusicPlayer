<template>
  <div>
    <!-- menu -->
    <div class="app-menu" :class="{ 'app-menu-expanded': isText }">
      <div class="app-menu-header">
        <div class="app-menu-logo" @click="isText = !isText">
          <img src="/icon.png" class="w-9 h-9" alt="logo" />
        </div>
      </div>
      <div class="app-menu-list">
        <div v-for="(item, index) in menus" :key="item.path" class="app-menu-item">
          <router-link class="app-menu-item-link" :to="item.path">
            <i class="iconfont app-menu-item-icon" :style="iconStyle(index)" :class="item.meta.icon"></i>
            <span v-if="isText" class="app-menu-item-text ml-3" :class="isChecked(index) ? 'text-green-500' : ''">{{
              item.meta.title
            }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';

const props = defineProps({
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

const isChecked = (index: number) => {
  return path.value === props.menus[index].path;
};

const iconStyle = (index: number) => {
  const style = {
    fontSize: props.size,
    color: isChecked(index) ? props.selectColor : props.color,
  };
  return style;
};

const isText = ref(false);
</script>

<style lang="scss" scoped>
.app-menu {
  @apply flex-col items-center justify-center bg-light dark:bg-black transition-all duration-300 w-[100px] px-1;
}

.app-menu-expanded {
  @apply w-[160px];
  .app-menu-item {
    @apply hover:bg-gray-100 dark:hover:bg-gray-800 rounded mr-4;
  }
}

.app-menu-item-link,
.app-menu-header {
  @apply flex items-center w-[200px] overflow-hidden ml-2 px-5;
}

.app-menu-header {
  @apply ml-1;
}

.app-menu-item-link {
  @apply mb-6 mt-6;
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
    z-index: 999999;
    @apply bg-light dark:bg-black border-t border-gray-200 dark:border-gray-700;

    &-header {
      display: none;
    }

    &-list {
      @apply flex justify-between;
    }

    &-item {
      &-link {
        @apply my-4;
      }
    }
  }
}
</style>
