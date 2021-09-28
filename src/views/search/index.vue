<template>
    <div class="search-page">
        <div class="hot-search" :class="setAnimationClass('animate__fadeInDown')">
            <template v-for="(item, index) in hotSearchData?.data">
                <div
                    :class="setAnimationClass('animate__bounceInLeft')"
                    :style="setAnimationDelay(index, 100)"
                    class="hot-search-item"
                    @click.stop="clickHotKeyword(item.searchWord)"
                >
                    <span
                        class="hot-search-item-count"
                        :class="{ 'hot-search-item-count-3': index < 3 }"
                    >{{ index + 1 }}</span>
                    {{ item.searchWord }}
                </div>
            </template>
        </div>
        <!-- 搜索到的歌曲列表 -->
        <div class="search-list">
            <template v-if="searchDetail">
                <div
                    v-for="(item, index) in searchDetail?.result.song.songs"
                    :key="item.id"
                    :class="setAnimationClass('animate__bounceInRight')"
                    :style="setAnimationDelay(index, 100)"
                >
                    <SongItem :item="item" />
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { getSearch } from "@/api/search";
import type { IHotSearch } from "@/type/search";
import { getHotSearch } from "@/api/home";
import { useRoute, useRouter } from "vue-router";
import { setAnimationClass, setAnimationDelay } from "@/utils";
import type { ISearchDetail } from "@/type/search";
import { onMounted, ref, watch } from "vue";
import SongItem from "@/components/common/SongItem.vue";


const route = useRoute();
const router = useRouter();
const searchDetail = ref<ISearchDetail>();

// 热搜列表
const hotSearchData = ref<IHotSearch>();
const loadHotSearch = async () => {
    const { data } = await getHotSearch();
    hotSearchData.value = data;
};


onMounted(() => {
    loadHotSearch();
});

const clickHotKeyword = (keyword: string) => {
    router.push({
        path: "/search",
        query: {
            keyword: keyword,
        },
    });
    // isHotSearchList.value = false;
};




const loadSearch = async (keyword: any) => {
    searchDetail.value = undefined;
    if (!keyword) return;
    const { data } = await getSearch(keyword);
    const songs = data.result.song.songs;
    // songs map 替换属性
    songs.map((item: any) => {
        item.picUrl = item.al.picUrl;
        item.song = item;
        item.artists = item.ar;
    });
    data.result.song.songs = songs;
    searchDetail.value = data;
};

loadSearch(route.query.keyword);

watch(
    () => route.query,
    async newParams => {
        console.log(newParams);
        loadSearch(newParams.keyword);
    }
)
</script>

<style lang="scss" scoped>
.search {
    height: 750px;
    background-color: #333;
}
.search-page {
    @apply flex;
}
.hot-search {
    @apply mt-3 mr-4 rounded-xl  flex-1 overflow-hidden;
    animation-duration: 0.2s;
    min-width: 400px;
    &-item {
        @apply px-4 py-3 text-lg hover:bg-gray-700 rounded-xl cursor-pointer;
        &-count {
            @apply text-green-500 inline-block ml-3 w-8;
            &-3 {
                @apply text-red-600 font-bold inline-block ml-3 w-8;
            }
        }
    }
}

.search-list {
    @apply mt-3 flex-1;
}
</style>
