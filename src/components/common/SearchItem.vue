<template>
  <div class="search-item">
    <div class="search-item-img">
      <n-image
        :src="getImgUrl(item.picUrl, 'album')"
        lazy
        preview-disabled
      />
    </div>
    <div class="search-item-info">
      <div class="search-item-name">{{ item.name }}</div>
      <div class="search-item-artist">{{ item.desc}}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getImgUrl } from '@/utils'
import type {Album}  from '@/type/album'
const props = defineProps<{
  item: {
    picUrl: string
    name: string
    desc: string
  }
}>()

</script>

<style scoped lang="scss">

.search-item{
  @apply rounded-3xl p-3 flex items-center hover:bg-gray-800 transition;
  margin: 0 10px;
  .search-item-img{
    @apply w-12 h-12 mr-4 rounded-2xl overflow-hidden;
  }
  .search-item-info{
    &-name{
      @apply text-white text-sm text-center;
    }
    &-artist{
      @apply text-gray-400 text-xs text-center;
    }
  }


}

</style>