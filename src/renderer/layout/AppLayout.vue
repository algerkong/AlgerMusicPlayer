<template>
  <div class="layout-page">
    <div id="layout-main" class="layout-main">
      <title-bar />
      <div class="layout-main-page">
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
          <play-bottom />
          <app-menu v-if="isMobile && !playerStore.musicFull" class="menu" :menus="menus" />
        </div>
      </div>
      <!-- 底部音乐播放 -->
      <template v-if="!settingsStore.isMiniMode">
        <play-bar
          v-if="!isMobile"
          v-show="isPlay"
          :style="playerStore.musicFull ? 'bottom: 0;' : ''"
        />
        <mobile-play-bar
          v-else
          v-show="isPlay"
          :style="isMobile && playerStore.musicFull ? 'bottom: 0;' : ''"
        />
      </template>
      <!-- 下载管理抽屉 -->
      <download-drawer
        v-if="
          isElectron &&
          (settingsStore.setData?.alwaysShowDownloadButton ||
            settingsStore.showDownloadDrawer ||
            settingsStore.setData?.hasDownloadingTasks)
        "
      />
      <!-- 播放列表抽屉 -->
      <play-list-drawer />
    </div>
    <install-app-modal v-if="!isElectron"></install-app-modal>
    <update-modal v-if="isElectron" />
    <playlist-drawer v-model="showPlaylistDrawer" :song-id="currentSongId" />
    <SleepTimerTop v-if="!isMobile"/>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onMounted, provide, ref } from 'vue';
import { useRoute } from 'vue-router';

import DownloadDrawer from '@/components/common/DownloadDrawer.vue';
import InstallAppModal from '@/components/common/InstallAppModal.vue';
import PlayBottom from '@/components/common/PlayBottom.vue';
import UpdateModal from '@/components/common/UpdateModal.vue';
import homeRouter from '@/router/home';
import otherRouter from '@/router/other';
import { useMenuStore } from '@/store/modules/menu';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { isElectron, isMobile } from '@/utils';
import SleepTimerTop from '@/components/player/SleepTimerTop.vue';

const keepAliveInclude = computed(() => {
  const allRoutes = [...homeRouter, ...otherRouter];
  
  return allRoutes
    .filter((item) => {
      return item.meta?.keepAlive;
    })
    .map((item) => {
      return typeof item.name === 'string' 
        ? item.name.charAt(0).toUpperCase() + item.name.slice(1) 
        : '';
    })
    .filter(Boolean);
});

const AppMenu = defineAsyncComponent(() => import('./components/AppMenu.vue'));
const PlayBar = defineAsyncComponent(() => import('@/components/player/PlayBar.vue'));
const MobilePlayBar = defineAsyncComponent(() => import('@/components/player/MobilePlayBar.vue'));
const SearchBar = defineAsyncComponent(() => import('./components/SearchBar.vue'));
const TitleBar = defineAsyncComponent(() => import('./components/TitleBar.vue'));
const PlayListDrawer = defineAsyncComponent(() => import('@/components/player/PlayListDrawer.vue'));
const PlaylistDrawer = defineAsyncComponent(() => import('@/components/common/PlaylistDrawer.vue'));

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const menuStore = useMenuStore();

const isPlay = computed(() => playerStore.playMusic && playerStore.playMusic.id);
const { menus } = menuStore;
const route = useRoute();

onMounted(() => {
  settingsStore.initializeSettings();
  settingsStore.initializeTheme();
});

const showPlaylistDrawer = ref(false);
const currentSongId = ref<number | undefined>();

// 提供一个方法来打开歌单抽屉
const openPlaylistDrawer = (songId: number) => {
  currentSongId.value = songId;
  showPlaylistDrawer.value = true;
};

// 将方法提供给全局
provide('openPlaylistDrawer', openPlaylistDrawer);
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
    height: calc(100vh - 130px);
    overflow: auto;
    display: block;
    flex: none;
    padding-bottom: 70px;
  }
}
</style>
