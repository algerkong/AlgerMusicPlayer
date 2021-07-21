<template>
    <div class="layout-page">
        <div class="layout-main">
            <div class="flex">
                <!-- 侧边菜单栏 -->
                <app-menu class="menu" :menus="menus" />
                <div class="main">
                    <!-- 搜索栏 -->
                    <search-bar />
                    <!-- 主页面路由 -->
                    <router-view class="main-content"></router-view>
                </div>
            </div>
            <!-- 底部音乐播放 -->
            <play-bar v-if="isPlay" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { SongResult } from '@/type/music';
import { computed } from 'vue';
import { useStore } from 'vuex';
import { AppMenu, PlayBar, SearchBar } from './components';

const store = useStore();

const playMusic = computed(() => store.state.playMusic as SongResult)
const isPlay = computed(() => store.state.isPlay as boolean)
const menus = store.state.menus;

</script>

<style lang="scss" scoped>
.layout-page {
    width: 100vw;
    height: 100vh;
    @apply flex justify-center items-center overflow-hidden;
}

.layout-main {
    @apply bg-black rounded-lg mb-10 text-white shadow-xl flex-col relative;
    height: 900px;
    width: 1500px;
    overflow: hidden;
    min-width: 1500px;
    .menu {
        width: 90px;
    }
    .main {
        @apply pt-6 pr-6 flex-1 box-border;
        .main-content {
            @apply rounded-2xl;
            height: 810px;
        }
    }
}
</style>