<template>
    <div class="search-page">
        <div
            class="hot-search"
            style="height:750px"
            :class="setAnimationClass('animate__fadeInDown')"
        >
            <n-layout style="height:750px" :native-scrollbar="false">
                <template v-for="(item,index) in hotSearchData?.data">
                    <div class="hot-search-item" @click.stop="clickHotKeyword(item.searchWord)">
                        <span
                            class="hot-search-item-count"
                            :class="{ 'hot-search-item-count-3': index < 3 }"
                        >{{ index + 1 }}</span>
                        {{ item.searchWord }}
                    </div>
                </template>
            </n-layout>
        </div>
        <div>
            <!-- 搜索到的歌曲列表 -->
            <div class="search-song-list">
                <template v-for="(item,index) in searchDetail?.result.song.songs">
                    <div class="search-song-item">
                        <img :src="item.al.picUrl + '?param=100y100'" alt />
                        <div>{{ item.name }}</div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { getSearch } from "@/api/search";
import type { IHotSearch } from "@/type/search";

import { getHotSearch } from '@/api/home';
import { onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import { setAnimationClass } from "@/utils";
import type { ISearchDetail } from "@/type/search"
import { onBeforeMount, onMounted, ref } from "vue";

const route = useRoute();
const router = useRouter()
const searchDetail = ref<ISearchDetail>()
const loadSearch = async (keyword: any) => {
    if (!keyword) return;
    const { data } = await getSearch(keyword);
    searchDetail.value = data;
}

// 热搜列表
const hotSearchData = ref<IHotSearch>()
const loadHotSearch = async () => {
    const { data } = await getHotSearch();
    hotSearchData.value = data;
}

onBeforeMount(() => {
    loadSearch(route.params.keyword)
    loadHotSearch();
})


const clickHotKeyword = (keyword: string) => {
    router.push({
        path: "/search",
        query: {
            keyword: keyword
        }
    })
    // isHotSearchList.value = false;
}


// 监听路由参数变化
onBeforeRouteUpdate(to => {
    let value = to.query.keyword?.toString()
    loadSearch(value);
})


</script>

<style lang="scss" scoped>
.search-page {
    @apply flex;
}
.hot-search {
    @apply mt-3 mr-4 border rounded-xl border-2 flex-1 overflow-hidden;
    background: #1a1a1a;
    border-color: #63e2b7;
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
</style>
