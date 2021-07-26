<template>
    <div>{{ searchDetail }}</div>
</template>

<script lang="ts" setup>import { getSearch } from "@/api/search";
import { onMounted } from "@vue/runtime-core";
import { useRoute } from "vue-router";
import type { ISearchDetail } from "@/type/search"
import { ref } from "vue";
const route = useRoute();
const keyword = route.query.keyword;
const searchDetail = ref<ISearchDetail>()
const loadSearch = async () => {
    const { data } = await getSearch(keyword);
    searchDetail.value = data;
}
onMounted(() => {
    loadSearch()
})
</script>

<style lang="scss" scoped>
</style>
