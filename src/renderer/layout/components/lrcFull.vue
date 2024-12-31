<template>
  <div class="lrc-full">
    {{ lrcIndex }}
  </div>
</template>

<script setup lang="ts">
defineProps({
  lrcList: {
    type: Array,
    default: () => []
  },
  lrcIndex: {
    type: Number,
    default: 0
  },
  lrcTime: {
    type: Number,
    default: 0
  }
});
</script>

<style scoped lang="scss"></style>
