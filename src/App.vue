<template>
  <div class="app" :class="isMobile ? 'mobile' : ''">
    <audio id="MusicAudio" ref="audioRef" :src="playMusicUrl" :autoplay="play"></audio>
    <n-config-provider :theme="darkTheme">
      <n-dialog-provider>
        <keep-alive>
          <router-view></router-view>
        </keep-alive>
      </n-dialog-provider>
    </n-config-provider>
  </div>
</template>

<script lang="ts" setup>
import { darkTheme } from 'naive-ui';

import store from '@/store';

import { isMobile } from './utils';

const playMusicUrl = computed(() => store.state.playMusicUrl as string);
// 是否播放
const play = computed(() => store.state.play as boolean);
const windowData = window as any;
onMounted(() => {
  if (windowData.electron) {
    const setData = windowData.electron.ipcRenderer.getStoreValue('set');
    store.commit('setSetData', setData);
  }
});
</script>

<style lang="scss" scoped>
div {
  box-sizing: border-box;
}
.app {
  user-select: none;
}

.mobile {
  .text-base {
    font-size: 14px !important;
  }
}

.html:has(.mobile) {
  font-size: 14px;
}
</style>
