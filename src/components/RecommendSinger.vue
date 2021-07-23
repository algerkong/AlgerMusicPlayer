<template>
    <!-- 推荐歌手 -->
    <div class="recommend-singer">
        <div class="recommend-singer-list">
            <div
                class="recommend-singer-item relative"
                :class="setAnimationClass('animate__backInRight')"
                v-for="(item, index) in hotSingerData?.artists"
                :style="setAnimationDelay(index, 100)"
                :key="item.id"
            >
                <div
                    :style="setBackgroundImg(item.picUrl + '?param=500y500')"
                    class="recommend-singer-item-bg"
                ></div>
                <div
                    class="recommend-singer-item-count p-2 text-base text-gray-200 z-10"
                >{{ item.musicSize }}首</div>
                <div class="recommend-singer-item-info z-10">
                    <div class="recommend-singer-item-info-play">
                        <i class="iconfont icon-playfill text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <div class="recommend-singer-item-info-name">{{ item.name }}</div>
                        <div class="recommend-singer-item-info-name">{{ item.name }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { setBackgroundImg, setAnimationDelay, setAnimationClass } from "@/utils";
import { onMounted, ref } from "vue";
import { getHotSinger } from "@/api/home";
import type { IHotSinger } from "@/type/singer";

// 歌手信息
const hotSingerData = ref<IHotSinger>();

//加载推荐歌手
const loadSingerList = async () => {
    const { data } = await getHotSinger({ offset: 0, limit: 5 });
    hotSingerData.value = data;
};
// 页面初始化
onMounted(() => {
    loadSingerList();
});
</script>

<style lang="scss" scoped>
.recommend-singer {
    &-list {
        @apply flex;
        height: 350px;
    }
    &-item {
        @apply flex-1 h-full rounded-3xl p-5 mr-5 flex flex-col justify-between;
        &-bg {
            @apply bg-gray-900 bg-no-repeat bg-cover bg-center rounded-3xl absolute w-full h-full top-0 left-0 z-0;
            filter: brightness(80%);
        }
        &-info {
            @apply flex items-center p-2;
            &-play {
                @apply w-12 h-12 bg-green-500 rounded-full flex justify-center items-center hover:bg-green-600 cursor-pointer;
            }
        }
    }
}
</style>
