<template>
  <div class="layout-page">
    <div class="layout-main">
      <title-bar v-if="isElectron" />
      <div class="layout-main-page" :class="isElectron ? '' : 'pt-6'">
        <!-- 侧边菜单栏 -->
        <app-menu class="menu" :menus="menus" />
        <div class="main">
          <!-- 搜索栏 -->
          <search-bar />
          <!-- 主页面路由 -->
          <div class="main-content bg-black pb-" :native-scrollbar="false" :class="isPlay ? 'pb-20' : ''">
            <n-message-provider>
              <router-view v-slot="{ Component }" class="main-page" :class="route.meta.noScroll ? 'pr-3' : ''">
                <template v-if="route.meta.noScroll">
                  <keep-alive v-if="!route.meta.noKeepAlive">
                    <component :is="Component" />
                  </keep-alive>
                  <component :is="Component" v-else />
                </template>
                <template v-else>
                  <n-scrollbar>
                    <keep-alive v-if="!route.meta.noKeepAlive">
                      <component :is="Component" />
                    </keep-alive>
                    <component :is="Component" v-else />
                  </n-scrollbar>
                </template>
              </router-view>
            </n-message-provider>
          </div>
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

const windowData = window as any;
const isElectron = computed(() => {
  return !!windowData.electronAPI;
});

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
  // 按下键盘按钮监听
  document.onkeydown = (e) => {
    switch (e.code) {
      case 'Space':
        return false;
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
  .menu {
    width: 90px;
  }
  .main {
    @apply flex-1 box-border flex flex-col;
    height: 100%;
    &-content {
      @apply box-border flex-1 overflow-hidden;
    }
  }
  :deep(.n-scrollbar-content) {
    @apply pr-3;
  }
}
</style>
