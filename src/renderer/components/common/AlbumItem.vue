<template>
  <history-item
    :image-url="getImgUrl(item.picUrl || '', '100y100')"
    :name="item.name"
    :description="getDescription()"
    :count="item.count"
    :show-count="showCount"
    :show-delete="showDelete"
    @click="emit('click', item)"
    @delete="emit('delete', item)"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import HistoryItem from '@/components/common/HistoryItem.vue';
import type { AlbumHistoryItem } from '@/store/modules/playHistory';
import { getImgUrl } from '@/utils';

const props = withDefaults(
  defineProps<{
    item: AlbumHistoryItem;
    showCount?: boolean;
    showDelete?: boolean;
  }>(),
  {
    showCount: false,
    showDelete: false
  }
);

const emit = defineEmits<{
  click: [item: AlbumHistoryItem];
  delete: [item: AlbumHistoryItem];
}>();

const { t } = useI18n();

const getDescription = () => {
  const parts: string[] = [];
  if (props.item.artist?.name) parts.push(props.item.artist.name);
  if (props.item.size !== undefined) parts.push(t('common.songCount', { count: props.item.size }));
  return parts.join(' · ') || t('history.noDescription');
};
</script>
