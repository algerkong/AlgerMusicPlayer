<template>
  <div class="layout-page">
    <div id="layout-main" class="layout-main" :style="{ background: backgroundColor }">
      <title-bar v-if="isElectron" />
      <div class="layout-main-page" :class="isElectron ? '' : 'pt-6'">
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

.mobile {
  .layout-main {
    &-page {
      @apply pt-4;
    }
  }
}
</style>
