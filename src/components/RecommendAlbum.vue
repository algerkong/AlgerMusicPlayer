<template>
    <div class="recommend-album">
        <div class="title" :class="setAnimationClass('animate__fadeInLeft')">最新专辑</div>
        <div class="recommend-album-list">
            <template v-for="(item,index) in albumData?.albums" :key="item.id">
                <div
                    v-if="index < 6"
                    class="recommend-album-list-item"
                    :class="setAnimationClass('animate__backInUp')"
                    :style="setAnimationDelay(index, 100)"
                >
                    <n-image
                        class="recommend-album-list-item-img"
                        :src="getImgUrl( item.blurPicUrl, '200y200')"
                        lazy
                        preview-disabled
                    />
                    <div class="recommend-album-list-item-content">{{ item.name }}</div>
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { getNewAlbum } from "@/api/home"
import { ref, onMounted } from "vue";
import type { IAlbumNew } from "@/type/album"
import { setAnimationClass, setAnimationDelay, getImgUrl } from "@/utils";


const albumData = ref<IAlbumNew>()
const loadAlbumList = async () => {
    const { data } = await getNewAlbum();
    albumData.value = data
}

onMounted(() => {
    loadAlbumList()
})
</script>

<style lang="scss" scoped>
.recommend-album {
    @apply flex-1 mx-5;
    .title {
        @apply text-lg font-bold mb-4;
    }

    .recommend-album-list {
        @apply grid grid-cols-2 grid-rows-3 gap-2;
        &-item {
            @apply rounded-xl overflow-hidden relative;
            &-img {
                @apply rounded-xl transition w-full h-full;
            }
            &:hover img {
                filter: brightness(50%);
            }
            &-content {
                @apply w-full h-full opacity-0 transition absolute z-10 top-0 left-0 p-4 text-xl bg-opacity-60 bg-black;
            }
            &-content:hover {
                opacity: 1;
            }
        }
    }
}
</style>
