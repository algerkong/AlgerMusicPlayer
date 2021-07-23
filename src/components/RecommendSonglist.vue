<template>
    <div class="recommend-music">
        <div class="title" :class="setAnimationClass('animate__fadeInLeft')">本周最热音乐</div>
        <div
            class="recommend-music-list"
            :class="setAnimationClass('animate__bounceInUp')"
            v-show="recommendMusic?.result"
        >
            <!-- 推荐音乐列表 -->
            <template v-for="(item, index) in recommendMusic?.result" :key="item.id">
                <song-item :item="item" :index="index" />
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { getRecommendMusic } from "@/api/home";
import type { IRecommendMusic } from "@/type/music";
import { setAnimationClass } from "@/utils";
import SongItem from "./common/SongItem.vue";
// 推荐歌曲
const recommendMusic = ref<IRecommendMusic>();

// 加载推荐歌曲
const loadRecommendMusic = async () => {
    const { data } = await getRecommendMusic({ limit: 10 });
    recommendMusic.value = data;
};

// 页面初始化
onMounted(() => {
    loadRecommendMusic();
});
</script>

<style lang="scss" scoped>
.title {
    @apply text-lg font-bold mb-4;
}
.recommend-music {
    @apply flex-auto;
    // width: 530px;
    .text-ellipsis {
        width: 100%;
    }
    &-list {
        @apply rounded-3xl p-2 w-full border border-gray-700;
        background-color: #0d0d0d;
    }
}
</style>