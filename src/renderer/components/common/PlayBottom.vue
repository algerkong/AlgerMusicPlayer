<template>
  <div v-if="isPlay" class="bottom" :style="{ height }"></div>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';

const store = useStore();
const isPlay = computed(() => store.state.isPlay as boolean);
defineProps({
  height: {
    type: String,
    default: undefined
  }
});
</script>

<style lang="scss" scoped>
.bottom {
  @apply h-28;
}
</style>
