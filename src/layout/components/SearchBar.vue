<template>
    <div class="search-box flex">
        <div class="search-box-input flex-1">
            <n-input
                size="medium"
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
                size="medium"
                :src="getImgUrl(store.state.user.avatarUrl)"
                v-if="store.state.user"
            />
            <n-avatar
                class="ml-2 cursor-pointer"
                circle
                size="medium"
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
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import request from '@/utils/request_mt'
import { getImgUrl } from '@/utils';

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

store.state.user = JSON.parse(localStorage.getItem('user') || '{}')

const loadPage = async () => {
    const { data } = await getUserDetail()
    store.state.user = data.profile
    localStorage.setItem('user', JSON.stringify(data.profile))
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
        label: '打卡',
        key: 'card'
    },
    {
        label: '听歌升级',
        key: 'card_music'
    },
    {
        label: '歌曲次数',
        key: 'listen'
    },
    {
        label: '登录',
        key: 'login'
    },
    {
        label: '退出登录',
        key: 'logout'
    }
]

const selectItem = async (key: any) => {
    // switch 判断
    switch (key) {
        case 'card':
            await request.get('/?do=sign')
                .then(res => {
                    console.log(res)
                })
            break;
        case 'card_music':
            await request.get('/?do=daka')
                .then(res => {
                    console.log(res)
                })
            break;
        case 'listen':
            await request.get('/?do=listen&id=1885175990&time=300')
                .then(res => {
                    console.log(res)
                })
            break;
        case 'logout':
            logout().then(() => {
                store.state.user = null
                localStorage.clear()
            })
            break;
        case 'login':
            router.push("/login")
            break;
    }
}

</script>

<style lang="scss" scoped>
.user-box {
    @apply ml-4 flex text-lg justify-center items-center rounded-full pl-3 border border-gray-600;
    background: #1a1a1a;
}

.search-box-input {
    @apply relative;
}
</style>