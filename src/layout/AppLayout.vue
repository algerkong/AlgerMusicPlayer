<template>
    <div class="layout-page">
        <div class="layout-main">
            <title-bar />
            <div class="flex">
                <!-- 侧边菜单栏 -->
                <app-menu class="menu" :menus="menus" />
                <div class="main">
                    <!-- 搜索栏 -->
                    <search-bar />
                    <!-- 主页面路由 -->
                    <div class="main-content bg-black" :native-scrollbar="false">
                        <n-message-provider>
                            <router-view class="main-page" v-slot="{ Component }">
                                <keep-alive>
                                    <component :is="Component" />
                                </keep-alive>
                                <!-- <component :is="Component" v-if="!$route.meta.keepAlive" />

                                <component :is="Component" /> -->
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
import type { SongResult } from '@/type/music';
import { useStore } from 'vuex';
const AppMenu = defineAsyncComponent(() => import('./components/AppMenu.vue'));
const PlayBar = defineAsyncComponent(() => import('./components/PlayBar.vue'));
const SearchBar = defineAsyncComponent(() => import('./components/SearchBar.vue'));
const TitleBar = defineAsyncComponent(() => import('./components/TitleBar.vue'));


const store = useStore();

const isPlay = computed(() => store.state.isPlay as boolean)
const menus = store.state.menus;
const play = computed(() => store.state.play as boolean)

const audio = {
  value: document.querySelector('#MusicAudio') as HTMLAudioElement
}

onMounted(() => {
  // 监听音乐是否播放
  watch(
    () => play.value,
    value => {
      if (value && audio.value) {
        audioPlay()
      } else {
        audioPause()
      }
    }
  )

  document.onkeyup = (e) => {
    switch (e.code) {
      case 'Space':
        playMusicEvent()
    }
  }
  // 按下键盘按钮监听
  document.onkeydown = (e) => {
    switch (e.code) {
      case 'Space':
        return false
    }
  }
})

const audioPlay = () => {
  if (audio.value) {
    audio.value.play()
  }
}

const audioPause = () => {
  if (audio.value) {
    audio.value.pause()
  }
}

const playMusicEvent = async () => {
  if (play.value) {
    store.commit('setPlayMusic', false)
  } else {
    store.commit('setPlayMusic', true)
  }
}
</script>

<style lang="scss" scoped>
.layout-page {
    width: 100vw;
    height: 100vh;
    @apply flex justify-center items-center overflow-hidden;
}

.layout-main {
    @apply bg-black rounded-lg  text-white shadow-xl flex-col relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
    .menu {
        width: 90px;
    }
    .main {
        @apply pr-6 flex-1 box-border;
        height: 100vh;
        &-content {
            @apply rounded-2xl pb-28 box-border;
            height: 100vh;
        }
        &-page {
            margin: 20px 0;
        }
    }
}
</style>