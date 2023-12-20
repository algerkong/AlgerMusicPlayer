<template>
  <div class="app">
    <n-config-provider :theme="darkTheme">
      <n-dialog-provider>
        <router-view></router-view>
      </n-dialog-provider>
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
