<template>
  <history-item
    :image-url="getImgUrl(item.coverImgUrl || item.picUrl || '', '100y100')"
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
import type { PlaylistHistoryItem } from '@/store/modules/playHistory';
import { getImgUrl } from '@/utils';

const props = withDefaults(
  defineProps<{
    item: PlaylistHistoryItem;
    showCount?: boolean;
    showDelete?: boolean;
  }>(),
  {
    showCount: false,
    showDelete: false
  }
);

const emit = defineEmits<{
  click: [item: PlaylistHistoryItem];
  delete: [item: PlaylistHistoryItem];
}>();

const { t } = useI18n();

const getDescription = () => {
  const parts: string[] = [];
  if (props.item.trackCount !== undefined)
    parts.push(t('user.playlist.trackCount', { count: props.item.trackCount }));
  if (props.item.creator?.nickname) parts.push(props.item.creator.nickname);
  return parts.join(' · ') || t('history.noDescription');
};
</script>
