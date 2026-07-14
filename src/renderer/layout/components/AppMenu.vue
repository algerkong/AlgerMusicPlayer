<template>
  <div class="app-menu-shell">
    <!-- 侧栏固定窄条 + 附着背景，防封面色冲掉图标 -->
    <div class="app-menu chrome-surface-strong">
      <!-- 需要返回的页面：返回键住侧栏顶；显隐带过渡，别硬切 -->
      <Transition
        name="menu-back"
        @after-enter="bumpSlider"
        @after-leave="bumpSlider"
        @enter="onBackTransitionFrame"
        @leave="onBackTransitionFrame"
      >
        <div v-if="showBack" key="menu-back" class="menu-back-slot">
          <n-tooltip :delay="200" :disabled="isMobile" placement="right">
            <template #trigger>
              <button type="button" class="menu-back-btn" @click="goBack">
                <i class="ri-arrow-left-line" />
              </button>
            </template>
            <div>{{ t('common.back') }}</div>
          </n-tooltip>
        </div>
      </Transition>

      <scroll-area class="app-menu-list">
        <!-- 滑动高亮绿底 -->
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
                :class="isMenuActive(item.path) ? 'is-on' : 'is-off'"
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
      </scroll-area>

      <!-- 设置钉在侧栏底部（桌面）；移动端仍用顶栏入口 -->
      <div v-if="!isMobile" class="menu-footer">
        <n-tooltip :delay="200" placement="right">
          <template #trigger>
            <router-link
              class="menu-footer-btn"
              :class="isSettingsActive ? 'is-on' : 'is-off'"
              to="/set"
              @click.stop
            >
              <i class="ri-settings-3-line" :style="{ fontSize: size }" />
            </router-link>
          </template>
          <div>{{ t('comp.settings') }}</div>
        </n-tooltip>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { ScrollArea } from '@/components/ui/scroll-area';
import { isMobile } from '@/utils';

const props = defineProps({
  size: {
    type: String,
    default: '26px'
  },
  menus: {
    type: Array as any,
    default: () => []
  }
});

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

/** 强制在 DOM 量完后再算滑块，避免首屏/路由切完 offset 还是 0 */
const sliderTick = ref(0);

const bumpSlider = async () => {
  await nextTick();
  requestAnimationFrame(() => {
    sliderTick.value += 1;
  });
};

const currentPath = computed(() => route.path || '/');

/** 设置在主导航之外：在 /set 时主列表不应再有选中 */
const isSettingsActive = computed(
  () => currentPath.value === '/set' || currentPath.value.startsWith('/set/')
);

const isMenuActive = (menuPath: string) => {
  if (isSettingsActive.value) return false;
  if (menuPath === '/') return currentPath.value === '/';
  return currentPath.value === menuPath || currentPath.value.startsWith(`${menuPath}/`);
};

watch(
  () => route.path,
  async () => {
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

/**
 * 桌面侧栏显示返回；移动端走 MobileHeader，底栏不塞返回。
 * 注意：utils 的 isMobile 是 computed，必须 .value，否则对象恒为真会把返回键永久藏起来。
 */
const showBack = computed(() => {
  if (isMobile.value) return false;
  return route.meta.back === true;
});

const goBack = () => {
  router.back();
};

/** 过渡中间多刷几次滑块，避免菜单高亮突然跳位 */
const onBackTransitionFrame = () => {
  bumpSlider();
  window.setTimeout(() => bumpSlider(), 80);
  window.setTimeout(() => bumpSlider(), 160);
  window.setTimeout(() => bumpSlider(), 280);
};

const activeIndex = computed(() => {
  if (isSettingsActive.value) return -1;
  return props.menus.findIndex((item: { path: string }) => isMenuActive(item.path));
});

const itemEls = ref<(HTMLElement | null)[]>([]);
const setItemRef = (el: HTMLElement | null, index: number) => {
  itemEls.value[index] = el;
};

const sliderStyle = computed(() => {
  void sliderTick.value;
  const idx = activeIndex.value;
  if (idx < 0) return { opacity: '0', width: '0px', height: '0px' };
  const wrap = itemEls.value[idx];
  if (!wrap) return { opacity: '0', width: '0px', height: '0px' };
  // 对准内部 40×40 的 link，而不是整行宽
  const link = wrap.querySelector('.app-menu-item-link') as HTMLElement | null;
  const target = link || wrap;
  return {
    transform: `translate(${target.offsetLeft + wrap.offsetLeft}px, ${target.offsetTop + wrap.offsetTop}px)`,
    width: `${target.offsetWidth}px`,
    height: `${target.offsetHeight}px`,
    opacity: '1'
  };
});
</script>

<style lang="scss" scoped>
.app-menu-shell {
  @apply h-full flex items-stretch;
  /* 底要抬过固定播放条，否则设置键被挡住 */
  padding: 8px 6px calc(10px + var(--play-bar-height, 5rem));
  box-sizing: border-box;
}

.app-menu {
  @apply flex flex-col items-center justify-start w-[56px] py-2;
  border-radius: 16px;
  height: 100%;
  box-sizing: border-box;
}

.menu-back-slot {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  width: 100%;
  margin-bottom: 4px;
  overflow: hidden;
}

.menu-back-btn {
  @apply flex items-center justify-center flex-shrink-0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--chrome-text-muted, #9ca3af);
  font-size: 20px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    transform 0.15s;

  &:hover {
    color: var(--primary-color, #22c55e);
    background: var(--chrome-surface, rgba(255, 255, 255, 0.1));
    transform: scale(1.05);
  }
}

/* 出现：从上轻弹入；消失：缩回淡出，高度一起收 */
.menu-back-enter-active,
.menu-back-leave-active {
  transition:
    opacity 0.22s ease,
    max-height 0.3s cubic-bezier(0.34, 1.4, 0.64, 1),
    margin 0.28s ease,
    transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
  max-height: 48px;
}

.menu-back-enter-from,
.menu-back-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  transform: translateY(-10px) scale(0.82);
}

.menu-back-enter-to,
.menu-back-leave-from {
  opacity: 1;
  max-height: 48px;
  margin-bottom: 4px;
  transform: translateY(0) scale(1);
}

.app-menu-list {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  padding-bottom: 8px;
}

.menu-slider-bg {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 14px;
  background: var(--primary-color, #22c55e);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
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
  display: flex;
  justify-content: center;
}

.app-menu-item-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 4px 0;
  border-radius: 14px;
  overflow: visible;
  transition:
    color 0.15s,
    transform 0.15s;
}

.app-menu-item-icon {
  position: relative;
  z-index: 2;
  transition: color 0.15s;
  /* 未选中：偏亮，封面底上也能看清 */
  color: rgba(255, 255, 255, 0.78);
  line-height: 1;
}

:global(.theme-light) .app-menu-item-icon {
  color: rgba(17, 24, 39, 0.55);
}

.app-menu-item-link.is-off:hover {
  transform: scale(1.05);
}

.app-menu-item-link.is-off:hover .app-menu-item-icon {
  color: var(--primary-color, #22c55e) !important;
}

/* 选中只改图标为白；绿底交给滑动块 */
.app-menu-item-link.is-on .app-menu-item-icon {
  color: #ffffff !important;
}

.menu-footer {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 8px;
  margin-top: auto;
  z-index: 2;
}

.menu-footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.72);
  transition:
    color 0.15s,
    background 0.15s,
    transform 0.15s;

  &:hover,
  &.is-off:hover {
    color: var(--primary-color, #22c55e);
    background: var(--chrome-surface, rgba(255, 255, 255, 0.1));
    transform: scale(1.05);
  }

  &.is-on {
    color: #ffffff !important;
    background: var(--primary-color, #22c55e);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
}

:global(.theme-light) .menu-footer-btn {
  color: rgba(17, 24, 39, 0.55);
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
