<template>
  <n-config-provider :theme="darkTheme">
    <router-view></router-view>
  </n-config-provider>
</template>

<script lang="ts" setup>
import { darkTheme } from 'naive-ui'


</script>

<style lang="scss" scoped >
div {
  box-sizing: border-box;
}
</style>
