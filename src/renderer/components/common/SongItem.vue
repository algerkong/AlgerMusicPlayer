<template>
  <component 
    :is="renderComponent"
    :item="item"
    :favorite="favorite"
    :selectable="selectable"
    :selected="selected"
    :can-remove="canRemove"
    :is-next="isNext"
    :index="index"
    @play="$emit('play', $event)"
    @select="$emit('select', $event)"
    @remove-song="$emit('remove-song', $event)"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { SongResult } from '@/type/music';

import StandardSongItem from './songItemCom/StandardSongItem.vue';
import MiniSongItem from './songItemCom/MiniSongItem.vue';
import ListSongItem from './songItemCom/ListSongItem.vue';
import CompactSongItem from './songItemCom/CompactSongItem.vue';

const props = withDefaults(
  defineProps<{
    item: SongResult;
    mini?: boolean;
    list?: boolean;
    compact?: boolean;
    favorite?: boolean;
    selectable?: boolean;
    selected?: boolean;
    canRemove?: boolean;
    isNext?: boolean;
    index?: number;
  }>(),
  {
    mini: false,
    list: false,
    compact: false,
    favorite: true,
    selectable: false,
    selected: false,
    canRemove: false,
    isNext: false,
    index: undefined
  }
);

defineEmits(['play', 'select', 'remove-song']);

// 根据属性决定渲染哪个组件
const renderComponent = computed(() => {
  if (props.mini) return MiniSongItem;
  if (props.list) return ListSongItem;
  if (props.compact) return CompactSongItem;
  return StandardSongItem;
});
</script>
