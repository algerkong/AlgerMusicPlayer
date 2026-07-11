<template>
  <div class="list-page h-full w-full">
    <n-scrollbar class="h-full">
      <div class="page-padding pb-32 pt-6 space-y-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
              {{ t('comp.list') }}
            </h1>
            <p class="text-sm text-neutral-500 mt-1">
              {{ authHint }}
            </p>
          </div>
          <n-button v-if="isElectron" quaternary circle @click="reload">
            <template #icon><i class="ri-refresh-line" /></template>
          </n-button>
        </div>

        <!-- 本地入口：收藏 / 历史（原侧栏项，做成歌单卡片） -->
        <section>
          <h2 class="text-sm font-semibold text-neutral-500 mb-3">本地</h2>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <div
              v-for="item in localEntries"
              :key="item.key"
              class="cursor-pointer group"
              @click="router.push(item.path)"
            >
              <div
                class="aspect-square rounded-2xl overflow-hidden chrome-surface flex items-center justify-center"
              >
                <i :class="item.icon" class="text-4xl text-primary opacity-90" />
              </div>
              <div class="mt-2 text-sm font-medium truncate text-neutral-900 dark:text-white">
                {{ item.name }}
              </div>
              <div class="text-xs text-neutral-500 truncate">{{ item.desc }}</div>
            </div>
          </div>
        </section>

        <!-- 在线：我的歌单 -->
        <section>
          <h2 class="text-sm font-semibold text-neutral-500 mb-3">在线歌单</h2>
          <n-spin :show="loading">
            <n-empty v-if="!loading && !playlists.length" :description="emptyText" class="pt-10" />
            <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <div
                v-for="item in playlists"
                :key="item.id"
                class="cursor-pointer group"
                @click="openPlaylist(item)"
              >
                <div
                  class="aspect-square rounded-2xl overflow-hidden bg-neutral-100/50 dark:bg-neutral-900/50"
                >
                  <n-image
                    v-if="item.picUrl"
                    :src="item.picUrl"
                    object-fit="cover"
                    class="w-full h-full"
                    preview-disabled
                  />
                </div>
                <div class="mt-2 text-sm font-medium truncate text-neutral-900 dark:text-white">
                  {{ item.name }}
                </div>
                <div class="text-xs text-neutral-500 truncate">
                  {{ item.trackCount != null ? `${item.trackCount} 首` : item.desc }}
                </div>
              </div>
            </div>
          </n-spin>
        </section>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NButton, NEmpty, NImage, NScrollbar, NSpin, useMessage } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import {
  isMusicSourceAvailable,
  mapMsPlaylistToItem,
  msGetAuthState,
  msListUserPlaylists
} from '@/api/musicSource';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { isElectron } from '@/utils';

defineOptions({ name: 'List' });

const { t } = useI18n();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const playlists = ref<any[]>([]);
const authenticated = ref(false);

const localEntries = [
  {
    key: 'favorite',
    name: '我喜欢',
    desc: '本地收藏',
    icon: 'ri-heart-3-fill',
    path: '/history'
  },
  {
    key: 'history',
    name: '播放历史',
    desc: '本地记录',
    icon: 'ri-history-line',
    path: '/history'
  }
];

const authHint = computed(() =>
  authenticated.value ? '汽水 · 我的歌单' : '导入会话后可查看在线歌单'
);

const emptyText = computed(() => {
  if (!isMusicSourceAvailable()) return '在线歌单仅支持桌面端';
  if (!authenticated.value) return '请先在设置中导入汽水 Cookie / 会话';
  return '暂无在线歌单';
});

const reload = async () => {
  if (!isMusicSourceAvailable()) return;
  loading.value = true;
  try {
    const auth = await msGetAuthState();
    authenticated.value = !!auth.authenticated;
    if (!auth.authenticated) {
      playlists.value = [];
      return;
    }
    const list = await msListUserPlaylists({ limit: 100 });
    playlists.value = list.map(mapMsPlaylistToItem);
  } catch (error: any) {
    console.error('[list]', error);
    message.error(error?.message || '加载歌单失败');
    playlists.value = [];
  } finally {
    loading.value = false;
  }
};

const openPlaylist = (item: any) => {
  navigateToMusicList(router, {
    id: item.id,
    type: 'playlist',
    name: item.name,
    listInfo: { ...item, source: 'qishui' },
    source: 'qishui'
  });
};

onMounted(() => {
  void reload();
});
</script>
