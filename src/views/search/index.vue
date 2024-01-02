<template>
    <div class="search-page">
        <n-layout
            class="hot-search"
            :class="setAnimationClass('animate__fadeInDown')"
            :native-scrollbar="false"
        >
            <div class="title">热搜列表</div>
           <div class="hot-search-list">
            <template v-for="(item, index) in hotSearchData?.data">
                <div
                    :class="setAnimationClass('animate__bounceInLeft')"
                    :style="setAnimationDelay(index, 10)"
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
        </n-layout>
        <!-- 搜索到的歌曲列表 -->
        <n-layout
            class="search-list"
            :class="setAnimationClass('animate__fadeInUp')"
            :native-scrollbar="false"
        >
            <div class="title">{{ hotKeyword }}</div>
            <div class="search-list-box">
              <template v-if="searchDetail">
                <div
                    v-for="(item, index) in searchDetail?.songs"
                    :key="item.id"
                    :class="setAnimationClass('animate__bounceInRight')"
                    :style="setAnimationDelay(index, 50)"
                >
                    <SongItem :item="item" @play="handlePlay"/>
                </div>
                <template v-for="(list, key) in searchDetail">
                  <template v-if="key.toString() !== 'songs'">
                    <div
                      v-for="(item, index) in list"
                      :key="item.id"
                      :class="setAnimationClass('animate__bounceInRight')"
                      :style="setAnimationDelay(index, 50)"
                    >
                        <SearchItem :item="item"/>
                    </div>
                  </template>
                </template>
               
            </template>
            </div>
        </n-layout>
    </div>
</template>

<script lang="ts" setup>
import { getSearch } from "@/api/search";
import type { IHotSearch } from "@/type/search";
import { getHotSearch } from "@/api/home";
import { useRoute, useRouter } from "vue-router";
import { setAnimationClass, setAnimationDelay } from "@/utils";
import { onMounted, ref, watch } from "vue";
import SongItem from "@/components/common/SongItem.vue";
import { useStore } from "vuex";
import { useDateFormat } from '@vueuse/core'

const route = useRoute();
const router = useRouter();
const searchDetail = ref<any>();
const searchType = ref(Number(route.query.type) || 1);

// 热搜列表
const hotSearchData = ref<IHotSearch>();
const loadHotSearch = async () => {
    const { data } = await getHotSearch();
    hotSearchData.value = data;
};


onMounted(() => {
    loadHotSearch();
});

const hotKeyword = ref(route.query.keyword || "搜索列表");
const clickHotKeyword = (keyword: string) => {
    hotKeyword.value = keyword;
    router.push({
        path: "/search",
        query: {
            keyword: keyword,
            type: 1
        },
    });
    // isHotSearchList.value = false;
};

const dateFormat = (time:any) => useDateFormat(time, 'YYYY.MM.DD').value
const loadSearch = async (keywords: any) => {
    hotKeyword.value = keywords;
    searchDetail.value = undefined;
    if (!keywords) return;
    const { data } = await getSearch({keywords, type:searchType.value});

    const songs = data.result.songs || [];
    const albums = data.result.albums || [];

    // songs map 替换属性
    songs.map((item: any) => {
        item.picUrl = item.al.picUrl;
        item.song = item;
        item.artists = item.ar;
    });
    albums.map((item: any) => {
        item.desc = `${item.artist.name } ${ item.company } ${dateFormat(item.publishTime)}`;
    });
    searchDetail.value = {
      songs,
      albums
    }
};

loadSearch(route.query.keyword);

watch(
    () => route.query,
    async newParams => {
        searchType.value = Number(newParams.type || 1)
        loadSearch(newParams.keyword);
    }
)

const store = useStore()

const handlePlay = (item: any) => {
  const tracks = searchDetail.value?.songs || []
  store.commit('setPlayList', tracks)
}
</script>

<style lang="scss" scoped>
.search-page {
    @apply flex h-full;
}
.hot-search {
    @apply mt-3 mr-4 rounded-xl  flex-1 overflow-hidden;
    background-color: #0d0d0d;
    animation-duration: 0.2s;
    min-width: 400px;
    height: 100%;
    &-list{
      @apply pb-28;
    }
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
    @apply mt-3 flex-1 rounded-xl;
    background-color: #0d0d0d;
    height: 100%;
    &-box{
      @apply pb-28;
    }
}

.title {
    @apply text-gray-200 text-xl font-bold my-2 mx-4;
}
</style>
