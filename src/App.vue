<template>
  <div class="app">
    <audio id="MusicAudio" ref="audioRef" :src="playMusicUrl" :autoplay="play"></audio>
    <n-config-provider :theme="darkTheme">
      <n-dialog-provider>
        <router-view></router-view>
      </n-dialog-provider>
    </n-config-provider>
  </div>
</template>

<script lang="ts" setup>
import { darkTheme } from 'naive-ui'
import { ref, computed } from 'vue'
import { useStore } from 'vuex'

const audio = ref<HTMLAudioElement | null>(null)

const store = useStore()
const playMusicUrl = computed(() => store.state.playMusicUrl as string)
// 是否播放
const play = computed(() => store.state.play as boolean)

</script>

<style lang="scss" scoped >
div {
  box-sizing: border-box;
}
.app {
  user-select: none;
}
</style>
