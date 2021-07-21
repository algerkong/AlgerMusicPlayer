<template>
    <div class="search-box flex">
        <div class="search-box-input flex-1">
            <n-input size="large" round :placeholder="searchKeyword" class="border border-gray-600">
                <template #prefix>
                    <i class="iconfont icon-search"></i>
                </template>
            </n-input>
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
import { getSearchKeyword } from '@/api/home';
import { onMounted, ref } from 'vue';


const searchKeyword = ref<String>("搜索点什么吧...")

const loadSearchKeyword = async () => {
    const { data } = await getSearchKeyword();
    searchKeyword.value = data.data.showKeyword
}

onMounted(() => {
    loadSearchKeyword()
})



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
</style>