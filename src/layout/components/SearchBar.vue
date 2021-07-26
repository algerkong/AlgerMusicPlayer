<template>
    <div class="search-box flex">
        <div class="search-box-input flex-1">
            <n-input
                size="large"
                round
                v-model:value="searchValue"
                :placeholder="searchKeyword"
                class="border border-gray-600"
                @focus="searchFocus"
                @blur="isSearch = false"
                @keydown.enter="search"
            >
                <template #prefix>
                    <i class="iconfont icon-search"></i>
                </template>
            </n-input>

            <div
                class="hot-search"
                v-if="isSearch"
                :class="setAnimationClass('animate__fadeInDown')"
            >
                <template v-for="(item,index) in hotSearchData?.data">
                    <div class="hot-search-item">
                        <span
                            class="hot-search-item-count"
                            :class="{ 'hot-search-item-count-3': index < 3 }"
                        >{{ index + 1 }}</span>
                        {{ item.searchWord }}
                    </div>
                </template>
            </div>
        </div>
        <div class="user-box">
            <n-popselect v-model:value="value" :options="options" trigger="click" size="small">
                <i class="iconfont icon-xiasanjiaoxing"></i>
            </n-popselect>
            <n-avatar
                class="ml-2"
                circle
                size="large"
                src="https://picsum.photos/200/300?random=1"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { getSearchKeyword, getHotSearch } from '@/api/home';
import type { IHotSearch } from "@/type/search";
import { onMounted, ref } from 'vue';
import { setAnimationClass } from "@/utils";
import { useRouter } from 'vue-router';

const router = useRouter()

const searchKeyword = ref("搜索点什么吧...")
const searchValue = ref("")

const loadSearchKeyword = async () => {
    const { data } = await getSearchKeyword();
    searchKeyword.value = data.data.showKeyword
}

const hotSearchData = ref<IHotSearch>()
const loadHotSearch = async () => {
    const { data } = await getHotSearch();
    hotSearchData.value = data;
}

const searchFocus = () => {
    isSearch.value = true;
    loadHotSearch()
}

onMounted(() => {
    loadSearchKeyword()
})

const isSearch = ref(false)

const search = () => {

    let value = searchValue.value
    if (value == "") {
        searchValue.value = searchKeyword.value
    } else {
        router.push({
            path: "/search",
            query: {
                keyword: value
            }
        })
    }

    isSearch.value = false;
}

const value = 'Drive My Car'
const options = [
    {
        label: 'Girl',
        value: 'Girl'
    },
    {
        label: 'In My Life',
        value: 'In My Life'
    },
    {
        label: 'Wait',
        value: 'Wait'
    }
]

</script>

<style lang="scss" scoped>
.user-box {
    @apply ml-6 flex text-lg justify-center items-center rounded-full pl-3 border border-gray-600;
    background: #1a1a1a;
}

.search-box-input {
    @apply relative;
    .hot-search {
        @apply absolute mt-3  left-0 w-full z-10 shadow-lg border rounded-xl border-2 overflow-hidden grid grid-cols-3;
        background: #1a1a1a;
        border-color: #63e2b7;
        animation-duration: 0.2s;
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
}
</style>