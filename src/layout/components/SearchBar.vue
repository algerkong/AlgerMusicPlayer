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
                <template #suffix>
                  <div class="w-20 px-3 flex justify-between items-center">
                    <div>{{ searchTypeOptions.find(item => item.key === searchType)?.label }}</div>
                    <n-dropdown trigger="hover" @select="selectSearchType" :options="searchTypeOptions">
                      <i class="iconfont icon-xiasanjiaoxing"></i>
                    </n-dropdown>
                  </div>
                </template>
            </n-input>
        </div>
        <div class="user-box">
            <n-dropdown trigger="hover" @select="selectItem" :options="userSetOptions">
                <i class="iconfont icon-xiasanjiaoxing"></i>
            </n-dropdown>
            <n-avatar
                class="ml-2 cursor-pointer"
                circle
                size="medium"
                :src="getImgUrl(store.state.user.avatarUrl)"
                v-if="store.state.user"
            />
            <div class="mx-2 rounded-full cursor-pointer text-sm" v-else @click="toLogin">登录</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { getSearchKeyword } from '@/api/home';
import { getUserDetail, logout } from '@/api/login';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import request from '@/utils/request_mt'
import { getImgUrl } from '@/utils';
import {USER_SET_OPTIONS, SEARCH_TYPES} from '@/const/bar-const'

const router = useRouter()
const store = useStore();
const userSetOptions = ref(USER_SET_OPTIONS)


// 推荐热搜词
const hotSearchKeyword = ref("搜索点什么吧...")
const hotSearchValue = ref("")
const loadHotSearchKeyword = async () => {
    const { data } = await getSearchKeyword();
    hotSearchKeyword.value = data.data.showKeyword
    hotSearchValue.value = data.data.realkeyword
}

watchEffect(() => {
    const user = localStorage.getItem('user')
    store.state.user = user ? JSON.parse(user) : null
    if(!user){
      userSetOptions.value = USER_SET_OPTIONS.filter(item => item.key !== 'logout')
    }
})

const loadPage = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
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
const searchType = ref(1)
const search = () => {
    let value = searchValue.value
    if (value == "") {
        searchValue.value = hotSearchValue.value
    } else {
        router.push({
            path: "/search",
            query: {
                keyword: value,
                type: searchType.value
            }
        })
    }
}

const selectSearchType = (key: any) => {
    searchType.value = key
}


const searchTypeOptions = ref(SEARCH_TYPES)

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
        case 'set':
            router.push("/set")
            break;
    }
}

</script>

<style lang="scss" scoped>
.user-box {
    @apply ml-4 flex text-lg justify-center items-center rounded-full pl-3 border border-gray-600;
    background: #1a1a1a;
}
.search-box{
    @apply pb-4 pr-4;
}
.search-box-input {
    @apply relative;
}
</style>