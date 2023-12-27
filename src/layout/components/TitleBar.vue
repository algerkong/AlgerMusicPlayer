<template>
  <div id="title-bar" @mousedown="drag">
    <div id="title">Alger Music</div>
    <div id="buttons">
      <button @click="minimize">
        <i class="iconfont icon-minisize"></i>
      </button>
      <!-- <button @click="maximize">
        <i class="iconfont icon-maxsize"></i>
      </button> -->
      <button @click="close">
        <i class="iconfont icon-close"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDialog } from 'naive-ui'

const dialog = useDialog()

const minimize = () => {
  window.electronAPI.minimize()
}

const maximize = () => {
  window.electronAPI.maximize()
}

const close = () => {
  dialog.warning({
    title: '提示',
    content: '确定要退出吗？',
    positiveText: '最小化',
    negativeText: '关闭',
    onPositiveClick: () => {
      window.electronAPI.miniTray()
    },
    onNegativeClick: () => {
      window.electronAPI.close()
    }
  })
}

const drag = (event: HTMLElement) => {
  window.electronAPI.dragStart(event)
}
</script>

<style scoped lang="scss">
#title-bar {
  -webkit-app-region: drag;
  @apply flex justify-between text-white px-6 py-2 select-none relative;
  z-index: 9999999;
}

#buttons {
  @apply flex gap-4;
  -webkit-app-region: no-drag;
}

button {
  @apply hover:text-green-500;
}
</style>
