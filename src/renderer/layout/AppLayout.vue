<template>
  <!-- 移动端使用专用布局（平板模式下使用 PC 布局） -->
  <mobile-layout v-if="isPhone && !settingsStore.setData?.tabletMode" :is-phone="isPhone" />

  <!-- PC 端 / 浏览器移动端 / 平板模式 保持原有布局 -->
  <div
    v-else
    class="layout-page"
    :class="{ mobile: settingsStore.isMobile, 'has-cover-bg': hasCoverBg }"
  >
    <!-- 双层背景交叉淡入，封面取色切换时渐变过渡 -->
    <div class="layout-bg-layer" :class="{ 'is-on': bgActive === 0 }" :style="bgLayer0Style" />
    <div class="layout-bg-layer" :class="{ 'is-on': bgActive === 1 }" :style="bgLayer1Style" />
    <div id="layout-main" class="layout-main">
      <title-bar />
      <div class="layout-main-page">
        <!-- 侧边菜单栏 -->
        <app-menu v-if="!settingsStore.isMobile" class="menu" :menus="menuStore.menus" />
        <div class="main">
          <!-- 搜索 / 登录已并入 TitleBar，与窗口按钮同一行 -->
          <!-- 主页面路由 -->
          <div class="main-content" :class="{ 'mobile-content': !shouldShowMobileMenu }">
            <router-view
              v-slot="{ Component }"
              class="main-page"
              :class="route.meta.noScroll && !settingsStore.isMobile ? 'pr-3' : ''"
            >
              <keep-alive :include="keepAliveInclude">
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </div>
          <play-bottom />
          <!-- 移动端底部菜单（浏览器模拟移动端时使用） -->
          <app-menu v-if="shouldShowMobileMenu" class="menu mobile-menu" :menus="menuStore.menus" />
        </div>
      </div>
      <!-- 底部音乐播放 -->
      <template v-if="!settingsStore.isMiniMode">
        <play-bar
          v-if="!settingsStore.isMobile"
          v-show="isPlay"
          :style="playerStore.musicFull ? 'bottom: 0;' : ''"
        />
        <mobile-play-bar
          v-else
          v-show="isPlay"
          :style="settingsStore.isMobile && playerStore.musicFull ? 'bottom: 0;' : ''"
        />
      </template>
    </div>
    <update-modal v-if="isElectron" />
    <playlist-drawer v-model="showPlaylistDrawer" :song-id="currentSongId" />
    <!-- 播放列表抽屉 -->
    <playing-list-drawer />
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  ref,
  watch
} from 'vue';
import { useRoute } from 'vue-router';

import PlayBottom from '@/components/common/PlayBottom.vue';
import UpdateModal from '@/components/common/UpdateModal.vue';
import MobilePlayBar from '@/components/player/MobilePlayBar.vue';
// 关键布局组件同步导入（始终可见，避免加载闪烁 / 播放条消失）
import PlayBar from '@/components/player/PlayBar.vue';
import homeRouter from '@/router/home';
import otherRouter from '@/router/other';
import { useMenuStore } from '@/store/modules/menu';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { isElectron } from '@/utils';
import { applyCoverChromeToRoot, buildCoverChromeVars } from '@/utils/coverChrome';

import AppMenu from './components/AppMenu.vue';
import TitleBar from './components/TitleBar.vue';
// 移动端专用布局
import MobileLayout from './MobileLayout.vue';

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

const PlayingListDrawer = defineAsyncComponent(
  () => import('@/components/player/PlayingListDrawer.vue')
);
const PlaylistDrawer = defineAsyncComponent(() => import('@/components/common/PlaylistDrawer.vue'));

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const menuStore = useMenuStore();

// 兼容 string id / 仅有 playMusicUrl 的本地曲
const isPlay = computed(() => {
  const m = playerStore.playMusic as any;
  return !!(m && (m.id || m.playMusicUrl || playerStore.playMusicUrl));
});
const route = useRoute();

/** 封面取色 → 布局背景与 chrome token */
const coverBackground = computed(() => {
  const m = playerStore.playMusic as any;
  return (m?.backgroundColor as string) || '';
});

const coverPrimary = computed(() => {
  const m = playerStore.playMusic as any;
  return (m?.primaryColor as string) || '';
});

const coverChromeVars = computed(() =>
  buildCoverChromeVars(coverBackground.value, coverPrimary.value)
);

// 含「暂无新取色、仍保留上一层」的情况
const hasCoverBg = computed(() => !!(coverBackground.value || bgLayer0.value || bgLayer1.value));

/** 双层交叉淡入：渐变 background 本身难 transition，用两层 opacity 过渡 */
const bgLayer0 = ref('');
const bgLayer1 = ref('');
const bgActive = ref(0);
const bgLayer0Style = computed(() => (bgLayer0.value ? { background: bgLayer0.value } : undefined));
const bgLayer1Style = computed(() => (bgLayer1.value ? { background: bgLayer1.value } : undefined));

watch(
  coverBackground,
  (bg) => {
    const next = (bg || '').trim();
    // 新曲尚未取色时保留上一首背景，避免闪纯黑
    if (!next) return;
    const cur = bgActive.value === 0 ? bgLayer0.value : bgLayer1.value;
    if (cur === next) return;
    const other = bgActive.value === 0 ? 1 : 0;
    if (other === 0) bgLayer0.value = next;
    else bgLayer1.value = next;
    requestAnimationFrame(() => {
      bgActive.value = other;
    });
  },
  { immediate: true }
);

// 同步到 html；无新 token 时保留旧 chrome，勿清空导致闪黑
watch(
  coverChromeVars,
  (vars) => {
    if (!vars) return;
    try {
      applyCoverChromeToRoot(vars);
    } catch (error) {
      console.error('[cover-chrome] watch apply failed', error);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  try {
    applyCoverChromeToRoot(null);
  } catch {
    /* 忽略 */
  }
});

// 判断当前路由是否应该在移动端显示AppMenu
const shouldShowMobileMenu = computed(() => {
  // 过滤出在menus中定义的路径
  const menuPaths = menuStore.menus.map((item: any) => item.path);
  // 检查当前路由路径是否在menus中
  return menuPaths.includes(route.path) && settingsStore.isMobile && !playerStore.musicFull;
});

provide('shouldShowMobileMenu', shouldShowMobileMenu);

// 使用 settingsStore.isMobile 进行移动端检测而不是 Capacitor 设备检测
const isPhone = computed(() => settingsStore.isMobile);

onMounted(() => {
  settingsStore.initializeSettings();
  settingsStore.initializeTheme();

  // Mini 模式下点了"添加到歌单"会记录歌曲并恢复主窗口，这里接力打开抽屉（#504）
  const pendingSongId = localStorage.getItem('pendingAddToPlaylistSongId');
  if (pendingSongId) {
    localStorage.removeItem('pendingAddToPlaylistSongId');
    nextTick(() => {
      openPlaylistDrawer(Number(pendingSongId));
    });
  }
});

const showPlaylistDrawer = ref(false);
const currentSongId = ref<number | undefined>();

// 提供一个方法来打开歌单抽屉
const openPlaylistDrawer = (songId: number, isOpen: boolean = true) => {
  currentSongId.value = songId;
  showPlaylistDrawer.value = isOpen;
  playerStore.setMusicFull(false);
  playerStore.setPlayListDrawerVisible(!isOpen);
};

// 将方法提供给全局
provide('openPlaylistDrawer', openPlaylistDrawer);
</script>

<style lang="scss" scoped>
.layout-page {
  @apply w-screen h-screen overflow-hidden bg-light dark:bg-black;
  position: relative;
}

.layout-bg-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.55s ease;
  background-size: cover;
  background-position: center;
}
.layout-bg-layer.is-on {
  opacity: 1;
}

.layout-page.has-cover-bg {
  color: var(--chrome-text);
}

.layout-page.has-cover-bg .menu,
.layout-page.has-cover-bg .main,
.layout-page.has-cover-bg .layout-main,
.layout-page.has-cover-bg .main-content,
.layout-page.has-cover-bg .main-page,
.layout-page.has-cover-bg :deep(#title-bar) {
  background: transparent !important;
}

.layout-page.has-cover-bg :deep(.app-menu),
.layout-page.has-cover-bg :deep(.app-menu-list) {
  background: transparent !important;
}

.layout-main {
  @apply w-full h-full relative text-gray-900 dark:text-white;
  display: flex;
  flex-direction: column;
  min-height: 0;
  z-index: 1;
}

.layout-main-page {
  @apply flex;
  flex: 1 1 0;
  min-height: 0;
  /* 侧栏 ↔ 主区：走全局 --layout-col-gap，不跟页面里赛 padding */
  gap: var(--layout-col-gap, 0);
  /* 播放条占位交给 PlayBottom（--play-bar-height），这里再垫会透出一条空带 */
  box-sizing: border-box;
}

.menu {
  @apply h-full flex-shrink-0;
  background: transparent;
  z-index: 20;
}

.main {
  @apply overflow-hidden flex-1 flex flex-col;
  min-width: 0;
  min-height: 0;
  background: transparent;
  position: relative;
  z-index: 1;
}

.main-content {
  @apply flex-1 overflow-hidden;
  min-height: 0;
  background: transparent;
}

.main-page {
  @apply h-full;
  background: transparent;
}

.mobile {
  .main-content {
    height: calc(100vh - 130px);
    overflow: hidden;
    display: block;
    flex: none;
    position: relative;
  }

  .mobile-content {
    height: calc(100vh - 75px);
    position: relative;
  }
}
</style>
