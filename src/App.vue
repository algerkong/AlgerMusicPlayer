<template>
  <div class="app">
    <n-config-provider :theme="darkTheme">
      <router-view></router-view>
    </n-config-provider>
  </div>
</template>

<script lang="ts" setup>
import { darkTheme } from 'naive-ui'


</script>

<style lang="scss" scoped >
div {
  box-sizing: border-box;
}
.app {
  user-select: none;
}
</style>
