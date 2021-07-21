<template>
    <div class="music-play-bar" v-if="isPlay && playMusic">
        <img class="play-bar-img" :src="playMusic.picUrl" />
        <div class="music-content">
            <div class="music-content-title">{{ playMusic.name }}</div>
            <div class="music-content-name">{{ playMusic.song.artists[0].name }}</div>
        </div>
        <div class="music-time"></div>
        <!-- 播放音乐 -->
        <audio :src="playMusicUrl" autoplay></audio>
        <n-button @click="playMusicEvent">playMusicEvent</n-button>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useStore } from 'vuex';
import type { SongResult } from "@/type/music";
import { getMusicUrl } from '@/api/music';

const store = useStore();
const playMusic = computed(() => store.state.playMusic as SongResult)
console.log(playMusic.value);

const isPlay = computed(() => store.state.isPlay)

const playMusicUrl = ref("");

const playMusicEvent = async () => {
    console.log(playMusic);

    const { data } = await getMusicUrl(playMusic.value.id);
    console.log(data);

    playMusicUrl.value = data.data[0].url;
}

</script>

<style lang="scss" scoped>
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
</style>