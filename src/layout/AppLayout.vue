<template>
    <div class="layout-page">
        <div class="layout-main">
            <app-menu class="menu" :menus="menus" />
            <router-view class="main"></router-view>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from '@vue/reactivity';
import { AppMenu } from './components';
let menus = ref([
    {
        href: '/',
        icon: "icon-homefill",
        text: "hello"
    },
    {
        href: '/main',
        icon: "icon-peoplefill",
        text: "hello"
    },
    {
        href: '/',
        icon: "icon-homefill",
        text: "hello"
    },
    {
        href: '/main',
        icon: "icon-peoplefill",
        text: "hello"
    },
    {
        href: '/',
        icon: "icon-homefill",
        text: "hello"
    },
    {
        href: '/main',
        icon: "icon-peoplefill",
        text: "hello"
    },
    {
        href: '/',
        icon: "icon-homefill",
        text: "hello"
    },
    {
        href: '/main',
        icon: "icon-peoplefill",
        text: "hello"
    },
    {
        href: '/',
        icon: "icon-homefill",
        text: "hello"
    },
    {
        href: '/main',
        icon: "icon-peoplefill",
        text: "hello"
    },
    {
        href: '/',
        icon: "icon-videofill",
        text: "hello"
    },
    {
        href: '/',
        icon: "icon-videofill",
        text: "hello"
    },
    {
        href: '/',
        icon: "icon-videofill",
        text: "hello"
    },
    {
        href: '/',
        icon: "icon-videofill",
        text: "hello"
    }
])
</script>

<style lang="scss" scoped>
.layout-page {
    width: 100vw;
    height: 100vh;
    @apply flex justify-center items-center;
}

.layout-main {
    @apply bg-black rounded-lg mb-10 text-white shadow-xl flex;
    height: 800px;
    width: 1400px;
    .menu {
        width: 70px;
    }
    .main {
        @apply p-4;
        flex: 1;
    }
}
</style>