<template>
  <n-scrollbar :size="100" :x-scrollable="false">
    <div class="main-page">
      <!-- 推荐歌手 -->
      <top-banner />
      <div class="main-content">
        <!-- 歌单分类列表 -->
        <playlist-type v-if="!isMobile" />
        <!-- 本周最热音乐 -->
        <recommend-songlist />
        <!-- 推荐最新专辑 -->
        <div>
          <favorite-list is-component />
          <recommend-album />
        </div>
      </div>
    </div>
  </n-scrollbar>
</template>

<script lang="ts" setup>
import PlaylistType from '@/components/home/PlaylistType.vue';
import RecommendAlbum from '@/components/home/RecommendAlbum.vue';
import RecommendSonglist from '@/components/home/RecommendSonglist.vue';
import TopBanner from '@/components/home/TopBanner.vue';
import { isMobile } from '@/utils';
import FavoriteList from '@/views/favorite/index.vue';
import { useUserStore } from '@/store/modules/user';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '@/store/modules/player';

// 在setup顶层获取这些对象，避免在事件监听器中调用
const userStore = useUserStore();
const playerStore = usePlayerStore();
const router = useRouter();

// 监听来自主进程的MCP指令
window.ipcRenderer.on('mcp-command', (_, payload) => {
  console.log('收到MCP指令:', payload);
  
  // 安全检查，确保payload存在且有必要的属性
  if (!payload || typeof payload !== 'object') {
    console.warn('MCP指令参数无效:', payload);
    return;
  }
  
  const { method, params } = payload;
  
  if (!method) {
    console.warn('MCP指令缺少method参数:', payload);
    return;
  }

  switch (method) {
    case 'search':
      if (params && params.keyword) {
        userStore.setSearchValue(params.keyword);
        router.push({ name: 'Search', query: { key: params.keyword } });
      }
      break;
    case 'play':
      // 这里的实现依赖于播放器内部的API
      // 假设有一个可以直接播放歌曲ID的action
      if (params && params.songId) {
        // userStore.playSongById(params.songId);
        console.log(`TODO: 实现播放歌曲功能, songId: ${params.songId}`);
      }
      break;
    case 'addToPlaylist':
      if (params && params.song) {
        // userStore.addSongToPlaylist(params.song);
        console.log(`TODO: 实现添加歌曲到播放列表功能, song:`, params.song);
      }
      break;
    case 'like':
      // 假设是喜欢当前播放的歌曲
      // userStore.likeCurrentSong();
      console.log('TODO: 实现喜欢歌曲功能');
      break;
    default:
      console.warn('未知的MCP指令:', method);
  }
});

// 监听来自主进程的MCP工具调用
window.ipcRenderer.on('mcp-tool-call', (payload) => {
  console.log('收到MCP工具调用:', payload);
  
  // 安全检查，确保payload存在且有必要的属性
  if (!payload || typeof payload !== 'object') {
    console.warn('MCP工具调用参数无效:', payload);
    return;
  }
  
  const { name, args } = payload;
  
  if (!name) {
    console.warn('MCP工具调用缺少name参数:', payload);
    return;
  }

  switch (name) {
    case 'search_music':
      if (args && args.query) {
        console.log(`正在搜索音乐: ${args.query}`);
        // 设置搜索关键词到store
        userStore.setSearchValue(args.query);
        // 跳转到搜索页面
        router.push({ 
          path: '/search', 
          query: { 
            keyword: args.query,
            type: 1 // 搜索单曲
          } 
        });
      }
      break;
    
    case 'play_music':
      if (args && args.songId) {
        console.log(`正在播放音乐: ${args.songName || args.songId}`, args);
        // 由于MCP传入的是模拟ID，我们需要先搜索然后播放第一个结果
        if (args.songName) {
          // 如果有歌曲名称，先设置搜索词并跳转到搜索页面
          userStore.setSearchValue(args.songName);
          router.push({ 
            path: '/search', 
            query: { 
              keyword: args.songName,
              type: 1,
              autoplay: 'true' // 添加自动播放标记
            } 
          });
        }
      }
      break;
    
    case 'add_to_playlist':
      if (args && args.songId) {
        console.log(`添加到播放列表: ${args.songId}`, args);
        // 这里需要根据实际的歌曲ID来添加到播放列表
        // 由于是模拟ID，我们可以提示用户
        console.log('TODO: 需要真实的歌曲ID才能添加到播放列表');
      }
      break;
    
    case 'like_music':
      if (args && args.songId) {
        console.log(`喜欢音乐: ${args.songId}`, args);
        // 喜欢当前播放的歌曲
        if (playerStore.playMusic && playerStore.playMusic.id) {
          playerStore.addToFavorite(playerStore.playMusic.id);
          console.log('已将当前播放歌曲添加到喜欢列表');
        } else {
          console.log('当前没有播放歌曲');
        }
      }
      break;
    
    default:
      console.warn('未知的MCP工具:', name);
  }
});

defineOptions({
  name: 'Home'
});
</script>

<style lang="scss" scoped>
.main-page {
  @apply h-full w-full overflow-hidden bg-light dark:bg-black;
}
.main-content {
  @apply mt-6 flex mb-28;
}

.mobile {
  .main-content {
    @apply flex-col mx-4;
  }
  :deep(.favorite-page) {
    @apply p-0 mx-4 h-full;
  }
}

:deep(.favorite-page) {
  @apply p-0 mx-4 h-[300px];
  .favorite-header {
    @apply mb-0 px-0 !important;
    h2 {
      @apply text-lg font-bold text-gray-900 dark:text-white;
    }
  }
  .favorite-list {
    @apply px-0 !important;
  }
}
</style>
