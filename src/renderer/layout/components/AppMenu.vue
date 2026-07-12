<template>
  <div class="app-menu-shell">
    <!-- 侧栏固定窄条 + 附着背景，防封面色冲掉图标 -->
    <div class="app-menu chrome-surface-strong">
      <div class="app-menu-list">
        <!-- 滑动高亮：同 SearchBar 顶栏 tabs 的弹一下手感，竖/横都能跟 -->
        <div class="menu-slider-bg" :style="sliderStyle" />
        <div
          v-for="(item, index) in menus"
          :key="item.path"
          :ref="(el) => setItemRef(el as HTMLElement | null, index)"
          class="app-menu-item"
        >
          <n-tooltip :delay="200" :disabled="isMobile" placement="right">
            <template #trigger>
              <router-link
                class="app-menu-item-link"
                :class="isChecked(index) ? 'is-on' : 'is-off'"
                :to="item.path"
                @click.stop
              >
                <i
                  class="iconfont app-menu-item-icon"
                  :style="{ fontSize: size }"
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
import { computed, nextTick, onMounted, ref, watch } from 'vue';
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
/** 强制在 DOM 量完后再算滑块，避免首屏/路由切完 offset 还是 0 */
const sliderTick = ref(0);

const bumpSlider = async () => {
  await nextTick();
  sliderTick.value += 1;
};

watch(
  () => route.path,
  async (newParams) => {
    path.value = newParams;
    await bumpSlider();
  }
);

watch(
  () => props.menus?.length,
  () => {
    bumpSlider();
  }
);

onMounted(() => {
  bumpSlider();
});

const { t } = useI18n();

const isChecked = (index: number) => {
  return path.value === props.menus[index]?.path;
};

const activeIndex = computed(() =>
  props.menus.findIndex((item: { path: string }) => item.path === path.value)
);

const itemEls = ref<(HTMLElement | null)[]>([]);
const setItemRef = (el: HTMLElement | null, index: number) => {
  if (el) itemEls.value[index] = el;
};

const sliderStyle = computed(() => {
  // 依赖 tick，确保 remount / 路由后重新读几何
  void sliderTick.value;
  const el = itemEls.value[activeIndex.value];
  if (!el) return { opacity: '0' };
  const inset = 6;
  return {
    transform: `translate(${el.offsetLeft + inset}px, ${el.offsetTop + inset}px)`,
    width: `${Math.max(0, el.offsetWidth - inset * 2)}px`,
    height: `${Math.max(0, el.offsetHeight - inset * 2)}px`,
    opacity: '1'
  };
});
</script>

<style lang="scss" scoped>
.app-menu-shell {
  @apply h-full flex items-stretch;
  padding: 8px 6px 12px;
  box-sizing: border-box;
}

.app-menu {
  @apply flex-col items-center justify-start w-[56px] py-2;
  border-radius: 16px;
  height: 100%;
  box-sizing: border-box;
}

.app-menu-list {
  position: relative;
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

.menu-slider-bg {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 14px;
  background: #22c55e;
  box-shadow: 0 1px 6px rgba(34, 197, 94, 0.35);
  transition:
    transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    width 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    height 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    opacity 0.18s ease;
  pointer-events: none;
  z-index: 0;
}

.app-menu-item {
  position: relative;
  z-index: 1;
}

.app-menu-item-link {
  @apply flex items-center justify-center w-full overflow-hidden py-4;
  transition: color 0.2s;
}

.app-menu-item-icon {
  @apply transition-all duration-200;
  color: var(--chrome-text-muted, #9ca3af);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.28));
}

.app-menu-item-link.is-off:hover .app-menu-item-icon {
  @apply text-green-500 scale-105;
}

.app-menu-item-link.is-on .app-menu-item-icon {
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18));
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
