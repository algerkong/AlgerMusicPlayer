<template>
  <div class="layout-page">
    <div class="layout-main">
      <title-bar v-if="isElectron" />
      <div class="layout-main-page" :class="isElectron ? '' : 'pt-6'">
        <!-- 侧边菜单栏 -->
        <app-menu v-if="!isMobile" class="menu" :menus="menus" />
        <div class="main">
          <!-- 搜索栏 -->
          <search-bar />
          <!-- 主页面路由 -->
          <div class="main-content bg-black" :native-scrollbar="false">
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
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';

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
const play = computed(() => store.state.play as boolean);

const route = useRoute();

const audio = {
  value: document.querySelector('#MusicAudio') as HTMLAudioElement,
};

onMounted(() => {
  // 监听音乐是否播放
  watch(
    () => play.value,
    (value) => {
      if (value && audio.value) {
        audioPlay();
      } else {
        audioPause();
      }
    },
  );

  document.onkeyup = (e) => {
    switch (e.code) {
      case 'Space':
        playMusicEvent();
        break;
      default:
    }
  };
});

const audioPlay = () => {
  if (audio.value) {
    audio.value.play();
  }
};

const audioPause = () => {
  if (audio.value) {
    audio.value.pause();
  }
};

const playMusicEvent = async () => {
  if (play.value) {
    store.commit('setPlayMusic', false);
  } else {
    store.commit('setPlayMusic', true);
  }
};
</script>

<style lang="scss" scoped>
.layout-page {
  width: 100vw;
  height: 100vh;
  @apply flex justify-center items-center overflow-hidden;
}

.layout-main {
  @apply bg-black  text-white shadow-xl flex flex-col relative;
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
