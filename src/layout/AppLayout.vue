<template>
    <div class="layout-page">
        <div class="layout-main">
            <app-menu class="menu" :menus="menus" />
            <div class="main">
                <div class="search-box flex">
                    <div class="search-box-input flex-1">
                        <n-input
                            size="large"
                            round
                            :placeholder="searchKeyword"
                            class="border border-gray-600"
                        >
                            <template #prefix>
                                <i class="iconfont icon-search"></i>
                            </template>
                        </n-input>
                    </div>
                    <div class="user-box">
                        <n-popselect
                            v-model:value="value"
                            :options="options"
                            trigger="click"
                            size="small"
                        >
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
                <router-view></router-view>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useStore } from 'vuex';
import { AppMenu } from './components';
import { getSearchKeyword } from '@/api/home';
import { ref, onMounted } from 'vue';

const store = useStore();
const menus = store.state.menus;


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

const searchKeyword = ref<String>("搜索点什么吧...")

const loadSearchKeyword = async () => {
    const { data } = await getSearchKeyword();
    searchKeyword.value = data.data.showKeyword
}

onMounted(() => {
    loadSearchKeyword()
})

</script>

<style lang="scss" scoped>
.layout-page {
    width: 100vw;
    height: 100vh;
    @apply flex justify-center items-center overflow-hidden;
}

.layout-main {
    @apply bg-black rounded-lg mb-10 text-white shadow-xl flex;
    height: 900px;
    width: 1500px;
    overflow: hidden;
    min-width: 1500px;
    .menu {
        width: 90px;
    }
    .main {
        @apply pt-6 pr-6 pb-6;
        flex: 1;
    }

    .user-box {
        @apply ml-6 flex text-lg justify-center items-center rounded-full pl-3 border border-gray-600;
        background: #1a1a1a;
    }
}
</style>