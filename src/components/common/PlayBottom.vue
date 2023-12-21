<template>
  <div class="bottom" v-if="isPlay"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
const store = useStore()
const isPlay = computed(() => store.state.isPlay as boolean)
</script>

<style lang="scss" scoped>
.bottom{
  @apply h-28;
}
</style>