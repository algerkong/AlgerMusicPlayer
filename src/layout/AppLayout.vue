<template>
    <div class="layout-page">
        <div class="layout-main">
            <div class="flex">
                <app-menu class="menu" :menus="menus" />
                <div class="main">
                    <div class="search-box flex">
                        <div class="search-box-input flex-1">
                            <n-input
                                size="large"
                                round
                                :placeholder="searchKeyword"
                                class="border border-gray-600"
                            >
                                <template #prefix>
                                    <i class="iconfont icon-search"></i>
                                </template>
                            </n-input>
                        </div>
                        <div class="user-box">
                            <n-popselect
                                v-model:value="value"
                                :options="options"
                                trigger="click"
                                size="small"
                            >
                                <i class="iconfont icon-xiasanjiaoxing"></i>
                            </n-popselect>
                            <n-avatar
                                class="ml-2"
                                circle
                                size="large"
                                src="https://picsum.photos/200/300?random=1"
                            />
                        </div>
                    </div>
                    <router-view class="main-content"></router-view>
                </div>
            </div>
            <div class="music-play-bar" v-show="isPlay">
                <img :src="playMusic.picUrl" width="50" height="50" />
                <div class="music-name"></div>
                <div class="music-singer"></div>
                <div class="music-time"></div>
                <!-- 播放音乐 -->
                <audio :src="playMusicUrl" autoplay></audio>
                <n-button @click="playMusicEvent">playMusicEvent</n-button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useStore } from 'vuex';
import { AppMenu } from './components';
import { getSearchKeyword } from '@/api/home';
import { ref, onMounted, computed } from 'vue';
import type { SongResult } from "@/type/music";
import { getMusicUrl } from '@/api/music';

const store = useStore();
const menus = store.state.menus;
const playMusic = computed(() => store.state.playMusic as SongResult)
const isPlay = computed(() => store.state.isPlay)

const playMusicUrl = ref("");

const playMusicEvent = async () => {
    console.log(playMusic);

    const { data } = await getMusicUrl(playMusic.value.id);
    console.log(data);

    playMusicUrl.value = data.data[0].url;
}

const value = 'Drive My Car'
const options = [
    {
        label: 'Girl',
        value: 'Girl'
    },
    {
        label: 'In My Life',
        value: 'In My Life'
    },
    {
        label: 'Wait',
        value: 'Wait'
    }
]

const searchKeyword = ref<String>("搜索点什么吧...")

const loadSearchKeyword = async () => {
    const { data } = await getSearchKeyword();
    searchKeyword.value = data.data.showKeyword
}

onMounted(() => {
    loadSearchKeyword()
})

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

    .user-box {
        @apply ml-6 flex text-lg justify-center items-center rounded-full pl-3 border border-gray-600;
        background: #1a1a1a;
    }

    .music-play-bar {
        @apply h-20 w-full absolute bottom-0 left-0 flex rounded-t-2xl overflow-hidden border border-gray-600 box-border px-4 py-2;
        background-color: #1a1a1a;
    }
}
</style>