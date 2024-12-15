<template>
  <div class="layout-page">
    <div
      id="layout-main"
      class="layout-main"
      :style="{
        background: backgroundColor,
        width: mainWidth + 'px',
        height: mainHeight + 'px',
        minWidth: '1200px',
        minHeight: '780px',
      }"
    >
      <!-- 拖动手柄 -->
      <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
      <div class="resize-handle bottom" @mousedown="startResize('bottom', $event)"></div>
      <div class="resize-handle corner" @mousedown="startResize('corner', $event)"></div>

      <title-bar v-if="!isMobile" />
      <div class="layout-main-page">
        <!-- 侧边菜单栏 -->
        <app-menu v-if="!isMobile" class="menu" :menus="menus" />
        <div class="main">
          <!-- 搜索栏 -->
          <search-bar />
          <!-- 主页面路由 -->
          <div class="main-content" :native-scrollbar="false">
            <n-message-provider>
              <router-view
                v-slot="{ Component }"
                class="main-page"
                :class="route.meta.noScroll && !isMobile ? 'pr-3' : ''"
              >
                <keep-alive :include="keepAliveInclude">
                  <component :is="Component" />
                </keep-alive>
              </router-view>
            </n-message-provider>
          </div>
          <play-bottom height="5rem" />
          <app-menu v-if="isMobile" class="menu" :menus="menus" />
        </div>
      </div>
      <!-- 底部音乐播放 -->
      <play-bar v-if="isPlay" />
    </div>
    <install-app-modal></install-app-modal>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';

import InstallAppModal from '@/components/common/InstallAppModal.vue';
import PlayBottom from '@/components/common/PlayBottom.vue';
import { isElectron } from '@/hooks/MusicHook';
import homeRouter from '@/router/home';
import { isMobile } from '@/utils';

const keepAliveInclude = computed(() =>
  homeRouter
    .filter((item) => {
      return item.meta.keepAlive;
    })
    .map((item) => {
      // return item.name;
      // 首字母大写
      return item.name.charAt(0).toUpperCase() + item.name.slice(1);
    }),
);

const AppMenu = defineAsyncComponent(() => import('./components/AppMenu.vue'));
const PlayBar = defineAsyncComponent(() => import('./components/PlayBar.vue'));
const SearchBar = defineAsyncComponent(() => import('./components/SearchBar.vue'));
const TitleBar = defineAsyncComponent(() => import('./components/TitleBar.vue'));

const store = useStore();

const isPlay = computed(() => store.state.isPlay as boolean);
const { menus } = store.state;
const route = useRoute();

const backgroundColor = ref('#000');
const windowSize = JSON.parse(localStorage.getItem('windowSize') || '{}');
const mainWidth = ref(windowSize.width || document.documentElement.clientWidth * 0.8); // 初始宽度
const mainHeight = ref(windowSize.height || document.documentElement.clientHeight * 0.85); // 初始高度
let isResizing = false;

const startResize = (direction: string, event: MouseEvent) => {
  if (isElectron.value) return;
  isResizing = true;
  document.body.style.cursor =
    direction === 'right' ? 'ew-resize' : direction === 'bottom' ? 'ns-resize' : 'nwse-resize';
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = mainWidth.value;
  const startHeight = mainHeight.value;

  const doResize = (moveEvent: MouseEvent) => {
    if (!isResizing) return;
    requestAnimationFrame(() => {
      if (direction === 'right' || direction === 'corner') {
        mainWidth.value = Math.max(300, startWidth + (moveEvent.clientX - startX)); // 设置最小宽度
      }
      if (direction === 'bottom' || direction === 'corner') {
        mainHeight.value = Math.max(200, startHeight + (moveEvent.clientY - startY)); // 设置最小高度
      }

      localStorage.setItem('windowSize', JSON.stringify({ width: mainWidth.value, height: mainHeight.value }));
    });
  };

  const stopResize = () => {
    isResizing = false;
    document.body.style.cursor = 'default'; // 恢复鼠标样式
    window.removeEventListener('mousemove', doResize);
    window.removeEventListener('mouseup', stopResize);
  };

  window.addEventListener('mousemove', doResize);
  window.addEventListener('mouseup', stopResize);
};
</script>

<style lang="scss" scoped>
.layout-page {
  width: 100vw;
  height: 100vh;
  @apply flex justify-center items-center overflow-hidden bg-black;
}

.layout-main {
  @apply text-white shadow-xl flex flex-col relative transition-all;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
  border: 2px solid #ccc; // 添加可见边框
  &-page {
    @apply flex flex-1 overflow-hidden;
  }
  .main {
    @apply flex-1 box-border flex flex-col overflow-hidden;
    height: 100%;
    &-content {
      @apply box-border flex-1 overflow-hidden;
    }
  }
  // :deep(.n-scrollbar-content) {
  //   @apply pr-3;
  // }
}

.resize-handle {
  position: absolute;
  background: transparent; // 添加背景色以便可见
  z-index: 9999999999;
  &.right {
    top: 0;
    right: 0;
    width: 5px;
    height: 100%;
    cursor: ew-resize;
  }
  &.bottom {
    bottom: 0;
    left: 0;
    width: 100%;
    height: 5px;
    cursor: ns-resize;
  }
  &.corner {
    bottom: 0;
    right: 0;
    width: 8px;
    height: 8px;
    cursor: nwse-resize;
  }
}

.mobile {
  .layout-main {
    &-page {
      @apply pt-4;
    }
  }
}

// 如果屏幕宽度 大于 1440px 则设置布局为 70% 85%
@media (min-width: 1240px) {
  .noElectron {
    .layout-main {
      width: 70%;
      height: 85%;
      @apply rounded-2xl border-2 border-gray-500 shadow-xl;
    }
  }
}

@media (max-width: 1240px) {
  .layout-main {
    width: 100% !important;
    height: 100% !important;
    border: none !important;
  }
}
</style>
