<template>
    <div
        class="recommend-music-list-item"
        :class="setAnimationClass('animate__bounceInUp')"
        :style="setAnimationDelay(index, 200)"
    >
        <img :src="item.picUrl + '?param=200y200'" class="recommend-music-list-item-img" />
        <div class="recommend-music-list-item-content">
            <div class="recommend-music-list-item-content-title">
                <n-ellipsis class="text-ellipsis" line-clamp="1">{{ item.song.name }}</n-ellipsis>
            </div>
            <div class="recommend-music-list-item-content-name">
                <n-ellipsis class="text-ellipsis" line-clamp="1">
                    <span
                        v-for="(artists,index) in item.song.artists"
                        :key="index"
                    >{{ artists.name }}{{ index < item.song.artists.length - 1 ? ' / ' : '' }}</span>
                </n-ellipsis>
            </div>
        </div>
        <div class="recommend-music-list-item-operating">
            <div class="recommend-music-list-item-operating-like">
                <i class="iconfont icon-likefill"></i>
            </div>
            <div
                class="recommend-music-list-item-operating-play bg-black"
                :class="isPlaying ? 'bg-green-600' : ''"
                @click="playMusicEvent(item)"
            >
                <i class="iconfont icon-playfill"></i>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { setAnimationDelay, setAnimationClass } from "@/utils";
import { useStore } from "vuex";
import type { SongResult } from "@/type/music";
import { computed, } from "vue";
import type { PropType } from "vue";


const props = defineProps({
    item: {
        type: Object as PropType<SongResult>,
        required: true
    },
    index: {
        type: Number,
        required: true
    }
})


const store = useStore();

const playMusic = computed(() => store.state.playMusic);


// 判断是否为正在播放的音乐
const isPlaying = computed(() => {
    return playMusic.value.id == props.item.id;
})

// 播放音乐 设置音乐详情 打开音乐底栏
const playMusicEvent = (item: SongResult) => {
    store.commit("setPlay", item);
    store.commit("setIsPlay", true);
};


</script>

<style lang="scss" scoped>
.text-ellipsis {
    width: 100%;
}
.recommend-music-list-item {
    @apply rounded-3xl p-3 flex items-center hover:bg-gray-800 transition;
    &-img {
        @apply w-12 h-12 rounded-2xl mr-4;
    }
    &-content {
        @apply flex-1;
        &-title {
            @apply text-base text-white;
        }
        &-name {
            @apply text-xs;
            @apply text-gray-400;
        }
    }
    &-operating {
        @apply flex items-center pl-4 rounded-full border border-gray-700;
        background-color: #0d0d0d;
        .iconfont {
            @apply text-xl;
        }
        .icon-likefill {
            color: #868686;
            @apply text-xl hover:text-red-600 transition;
        }
        &-like {
            @apply mr-2 cursor-pointer;
        }
        &-play {
            @apply cursor-pointer border border-gray-500 rounded-full w-10 h-10 flex justify-center items-center hover:bg-green-600 transition;
        }
    }
}
</style>
