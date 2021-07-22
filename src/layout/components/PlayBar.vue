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
                <i class="iconfont icon" :class="play ? 'icon-stop' : 'icon-play'"></i>
            </div>
            <div>
                <i class="iconfont icon-next"></i>
            </div>
        </div>
        <div class="music-time">
            <div class="time">{{ getNowTime }}</div>
            <n-slider v-model:value="timeSlider" :step="0.05" :tooltip="false"></n-slider>
            <div class="time">{{ getAllTime }}</div>
        </div>
        <div class="audio-volume">
            <div>
                <i class="iconfont icon-notificationfill"></i>
            </div>
            <n-slider v-model:value="volumeSlider" :step="0.01" :tooltip="false"></n-slider>
        </div>
        <!-- 播放音乐 -->
        <audio ref="audio" :src="playMusicUrl" :autoplay="play"></audio>
    </div>
</template>

<script lang="ts" setup>
import type { SongResult } from "@/type/music";
import { secondToMinute } from "@/utils";
import { c } from "naive-ui";
import { computed, onBeforeUpdate, onMounted, ref, watch } from "vue";
import { useStore } from 'vuex';

const store = useStore();

// 播放的音乐信息
const playMusic = computed(() => store.state.playMusic as SongResult)
// 是否播放
const play = computed(() => store.state.play as boolean)
// 播放链接
const playMusicUrl = computed(() => store.state.playMusicUrl as string)

// 获取音乐播放Dom
const audio = ref<any>(null)

onMounted(() => {
    // 监听音乐是否播放
    watch(() => play.value, (value, oldValue) => {
        if (value) {
            audio.value.play()
            onAudio(audio.value)
        } else {
            audio.value.pause()
        }
    })

    // 抬起键盘按钮监听
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

const nowTime = ref(0)
const allTime = ref(0)
// 计算属性  获取当前播放时间的进度
const timeSlider = computed({
    get: () => nowTime.value / allTime.value * 100,
    set: (value) => {
        audio.value.currentTime = value * allTime.value / 100
    }
})

// 音量条
const audioVolume = ref(1)
const volumeSlider = computed({
    get: () => audioVolume.value * 100,
    set: (value) => {
        audio.value.volume = value / 100
    }
})
// 获取当前播放时间
const getNowTime = computed(() => {
    return secondToMinute(nowTime.value)
})

// 获取总时间
const getAllTime = computed(() => {
    return secondToMinute(allTime.value)
})

// 监听音乐播放 获取时间
const onAudio = (audio: any) => {
    audio.addEventListener("timeupdate", function () {//监听音频播放的实时时间事件
        // 获取当前播放时间
        nowTime.value = audio.currentTime
        // 获取总时间
        allTime.value = audio.duration
        // 获取音量
        audioVolume.value = audio.volume

    })
}

// 播放暂停按钮事件
const playMusicEvent = async () => {
    if (play.value) {
        store.commit("setPlayMusic", false);
    } else {
        store.commit("setPlayMusic", true);
    }
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
    @apply flex flex-1 items-center;
    .time {
        @apply mx-4 mt-1;
    }
}

.audio-volume {
    width: 180px;
    @apply flex items-center mx-4;
    .iconfont {
        @apply text-2xl hover:text-green-500 transition cursor-pointer mr-4;
    }
}
</style>