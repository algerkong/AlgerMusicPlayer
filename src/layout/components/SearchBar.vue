<template>
    <div class="search-box flex">
        <div class="search-box-input flex-1">
            <n-input
                size="large"
                round
                v-model:value="searchValue"
                :placeholder="hotSearchKeyword"
                class="border border-gray-600"
                @keydown.enter="search"
            >
                <template #prefix>
                    <i class="iconfont icon-search"></i>
                </template>
            </n-input>
        </div>
        <div class="user-box">
            <n-dropdown trigger="hover" @select="selectItem" :options="options">
                <i class="iconfont icon-xiasanjiaoxing"></i>
            </n-dropdown>
            <n-avatar
                class="ml-2 cursor-pointer"
                circle
                size="large"
                :src="store.state.user.avatarUrl"
                v-if="store.state.user"
            />
            <n-avatar
                class="ml-2 cursor-pointer"
                circle
                size="large"
                src="https://picsum.photos/200/300?random=1"
                @click="toLogin()"
                v-else
            >登录</n-avatar>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { getSearchKeyword, getHotSearch } from '@/api/home';
import { getUserDetail, logout } from '@/api/login';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

const router = useRouter()
const store = useStore();

// 推荐热搜词
const hotSearchKeyword = ref("搜索点什么吧...")
const hotSearchValue = ref("")
const loadHotSearchKeyword = async () => {
    const { data } = await getSearchKeyword();
    hotSearchKeyword.value = data.data.showKeyword
    hotSearchValue.value = data.data.realkeyword
}
const loadPage = async () => {
    const { data } = await getUserDetail()
    store.state.user = data.profile
}

const toLogin = () => {
    router.push('/login')
}



// 页面初始化
onMounted(() => {
    loadHotSearchKeyword()
    loadPage()
})


// 搜索词
const searchValue = ref("")
const search = () => {

    let value = searchValue.value
    if (value == "") {
        searchValue.value = hotSearchValue.value
    } else {
        router.push({
            path: "/search",
            query: {
                keyword: value
            }
        })
    }
}

const value = 'Drive My Car'
const options = [
    {
        label: 'Girl',
        key: 'Girl'
    },
    {
        label: 'In My Life',
        key: 'In My Life'
    },
    {
        label: '退出登录',
        key: 'logout'
    }
]

const selectItem = (key: any) => {
    // switch 判断
    switch (key) {
        case 'logout':
            logout().then(() => {
                store.state.user = null
                localStorage.clear()
            })
            break;
    }
}

</script>

<style lang="scss" scoped>
.user-box {
    @apply ml-6 flex text-lg justify-center items-center rounded-full pl-3 border border-gray-600;
    background: #1a1a1a;
}

.search-box-input {
    @apply relative;
}
</style>