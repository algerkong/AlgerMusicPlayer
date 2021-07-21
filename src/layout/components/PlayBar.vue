<template>
    <div class="music-play-bar">
        <img class="play-bar-img" :src="playMusic.picUrl" />
        <div class="music-content">
            <div class="music-content-title">
                <n-ellipsis class="text-ellipsis" line-clamp="1">{{ playMusic.song.name }}</n-ellipsis>
            </div>
            <div class="music-content-name">
                <n-ellipsis class="text-ellipsis" line-clamp="1">
                    <span
                        v-for="(item,index) in playMusic.song.artists"
                        :key="index"
                    >{{ item.name }}{{ index < playMusic.song.artists.length - 1 ? ' / ' : '' }}</span>
                </n-ellipsis>
            </div>
        </div>
        <div class="music-buttons">
            <div>
                <i class="iconfont icon-prev"></i>
            </div>
            <div class="music-buttons-play" @click="playMusicEvent">
                <i class="iconfont icon" :class="playMusicUrl ? 'icon-stop' : 'icon-play'"></i>
            </div>
            <div>
                <i class="iconfont icon-next"></i>
            </div>
        </div>
        <div class="music-time">
            <n-time :time="86400000" :to="86400000" format="mm:ss" />
            <n-slider v-model:value="value" :step="0.1" />
            <n-time :time="time" format="mm:ss" />
        </div>
        <!-- 播放音乐 -->
        <div ref="aaaaaaa">123123</div>
        <audio ref="audio" :src="playMusicUrl" autoplay></audio>
        <n-button @click="playMusicEvent">playMusicEvent</n-button>
    </div>
</template>

<script lang="ts" setup>
import type { SongResult } from "@/type/music";
import { computed, getCurrentInstance, onMounted, ref, watch } from "vue";
import { useStore } from 'vuex';

const store = useStore();

const playMusic = computed(() => store.state.playMusic as SongResult)
const isPlay = computed(() => store.state.isPlay as boolean)
const playMusicUrl = computed(() => store.state.playMusicUrl as string)


console.log(playMusicUrl.value);
console.log(isPlay);

// 获取音乐播放Dom
const audio = ref<any>(null)
const aaaaaaa = ref(null)



onMounted(() => {
    console.log(audio);
    console.log(aaaaaaa);

    watch(() => isPlay.value, (value, oldValue) => {
        console.log(value);
        if (value) {
            audio.play()
        } else {
            audio.pause()
        }
    })
})



const time = new Date()

const value = ref(0)





const playMusicEvent = async () => {

}

</script>

<style lang="scss" scoped>
.text-ellipsis {
    width: 100%;
}

.music-play-bar {
    @apply h-20 w-full absolute bottom-0 left-0 flex items-center rounded-t-2xl overflow-hidden box-border px-6 py-2;
    background-color: #212121;
}

.play-bar-img {
    @apply w-14 h-14 rounded-2xl;
}

.music-content {
    width: 200px;
    @apply ml-4;
    &-title {
        @apply text-base text-white;
    }
    &-name {
        @apply text-xs mt-1;
        @apply text-gray-400;
    }
}

.music-buttons {
    @apply mx-6;
    .iconfont {
        @apply text-2xl hover:text-green-500 transition;
    }
    .icon {
        @apply text-xl hover:text-white;
    }
    @apply flex items-center;
    > div {
        @apply cursor-pointer;
    }
    &-play {
        @apply flex justify-center items-center w-12 h-12 rounded-full mx-4 hover:bg-green-500 transition;
        background: #383838;
    }
}

.music-time {
    @apply flex flex-1;
}
</style>