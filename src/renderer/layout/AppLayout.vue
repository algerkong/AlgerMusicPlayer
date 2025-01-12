<template>
  <div class="layout-page">
    <div id="layout-main" class="layout-main">
      <title-bar v-if="isElectron" />
      <div class="layout-main-page" :class="isElectron ? '' : 'pt-6'">
        <!-- 侧边菜单栏 -->
        <app-menu v-if="!isMobile" class="menu" :menus="menus" />
        <div class="main">
          <!-- 搜索栏 -->
          <search-bar />
          <!-- 主页面路由 -->
          <div class="main-content" :native-scrollbar="false">
            <router-view
              v-slot="{ Component }"
              class="main-page"
              :class="route.meta.noScroll && !isMobile ? 'pr-3' : ''"
            >
              <keep-alive :include="keepAliveInclude">
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </div>
          <play-bottom height="5rem" />
          <app-menu v-if="isMobile && !store.state.musicFull" class="menu" :menus="menus" />
        </div>
      </div>
      <!-- 底部音乐播放 -->
      <play-bar v-if="isPlay" :style="isMobile && store.state.musicFull ? 'bottom: 0;' : ''" />
      <!-- 下载管理抽屉 -->
      <download-drawer v-if="isElectron" />
    </div>
    <install-app-modal v-if="!isElectron"></install-app-modal>
    <update-modal v-if="isElectron" />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';

import DownloadDrawer from '@/components/common/DownloadDrawer.vue';
import InstallAppModal from '@/components/common/InstallAppModal.vue';
import PlayBottom from '@/components/common/PlayBottom.vue';
import UpdateModal from '@/components/common/UpdateModal.vue';
import homeRouter from '@/router/home';
import { isElectron, isMobile } from '@/utils';

const keepAliveInclude = computed(() =>
  homeRouter
    .filter((item) => {
      return item.meta.keepAlive;
    })
    .map((item) => {
      return item.name.charAt(0).toUpperCase() + item.name.slice(1);
    })
);

const AppMenu = defineAsyncComponent(() => import('./components/AppMenu.vue'));
const PlayBar = defineAsyncComponent(() => import('./components/PlayBar.vue'));
const SearchBar = defineAsyncComponent(() => import('./components/SearchBar.vue'));
const TitleBar = defineAsyncComponent(() => import('./components/TitleBar.vue'));

const store = useStore();

const isPlay = computed(() => store.state.isPlay as boolean);
const { menus } = store.state;
const route = useRoute();

onMounted(() => {
  store.dispatch('initializeSettings');
  store.dispatch('initializeTheme');
});
</script>

<style lang="scss" scoped>
.layout-page {
  @apply w-screen h-screen overflow-hidden bg-light dark:bg-black;
}

.layout-main {
  @apply w-full h-full relative  text-gray-900 dark:text-white;
}

.layout-main-page {
  @apply flex h-full;
}

.menu {
  @apply h-full;
}

.main {
  @apply overflow-hidden flex-1 flex flex-col;
}

.main-content {
  @apply flex-1 overflow-hidden;
}

.main-page {
  @apply h-full;
}

.mobile {
  .main-content {
    height: calc(100vh - 146px);
    overflow: auto;
    display: block;
    flex: none;
  }
}
</style>
