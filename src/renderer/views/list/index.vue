<template>
  <div class="list-page h-full w-full">
    <n-scrollbar class="h-full">
      <div class="page-padding pb-32 pt-6 space-y-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
              {{ t('comp.list') }}
            </h1>
            <p class="text-sm text-neutral-500 mt-1">
              {{ pageHint }}
            </p>
          </div>
          <n-button v-if="isElectron && authenticated" quaternary circle @click="reload">
            <template #icon><i class="ri-refresh-line" /></template>
          </n-button>
        </div>

        <!-- 已登录：在线歌单列表（最上方） -->
        <section v-if="authenticated">
          <n-spin :show="loading">
            <n-empty
              v-if="!loading && !playlists.length"
              description="暂无在线歌单"
              class="pt-10"
            />
            <div v-else class="playlist-rows">
              <div
                v-for="item in playlists"
                :key="item.id"
                class="playlist-row chrome-surface"
                @click="openPlaylist(item)"
              >
                <div class="cover">
                  <n-image
                    v-if="item.picUrl"
                    :src="item.picUrl"
                    object-fit="cover"
                    class="w-full h-full"
                    preview-disabled
                  />
                  <div v-else class="cover-fallback">
                    <i class="ri-play-list-2-fill" />
                  </div>
                </div>
                <div class="meta min-w-0">
                  <div class="name truncate">{{ item.name }}</div>
                  <div class="desc truncate">
                    {{
                      item.trackCount != null
                        ? `${item.trackCount} 首`
                        : item.desc || item.creator || ''
                    }}
                  </div>
                </div>
                <i class="ri-arrow-right-s-line chevron" />
              </div>
            </div>
          </n-spin>
        </section>

        <!-- 未登录：不展示在线区，仅本地入口（列表） -->
        <section v-else>
          <div class="playlist-rows">
            <div
              v-for="item in localEntries"
              :key="item.key"
              class="playlist-row chrome-surface"
              @click="router.push(item.path)"
            >
              <div class="cover cover-local">
                <i :class="item.icon" />
              </div>
              <div class="meta min-w-0">
                <div class="name truncate">{{ item.name }}</div>
                <div class="desc truncate">{{ item.desc }}</div>
              </div>
              <i class="ri-arrow-right-s-line chevron" />
            </div>
          </div>
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
  msGetPlaylist,
  msListUserPlaylists,
  type MsPlaylist
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

/** 未登录时展示；登录后用在线「我喜欢」等，不再显示本地我喜欢 */
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

const pageHint = computed(() =>
  authenticated.value ? '在线歌单' : '登录后显示在线歌单 · 当前为本地入口'
);

/**
 * 封面：优先用曲目列表最后一首的 cover，否则 playlist.coverUrl
 */
async function resolveCover(p: MsPlaylist): Promise<string> {
  if (!p.id) return p.coverUrl || '';
  try {
    const detail = await msGetPlaylist(p.id);
    const songs = detail.songs || [];
    if (songs.length) {
      const last = songs[songs.length - 1];
      if (last?.coverUrl) return last.coverUrl;
    }
    return detail.playlist.coverUrl || p.coverUrl || '';
  } catch {
    return p.coverUrl || '';
  }
}

const reload = async () => {
  if (!isMusicSourceAvailable()) {
    authenticated.value = false;
    playlists.value = [];
    return;
  }
  loading.value = true;
  try {
    const auth = await msGetAuthState();
    authenticated.value = !!auth.authenticated;
    if (!auth.authenticated) {
      playlists.value = [];
      return;
    }
    const list = await msListUserPlaylists({ limit: 100 });
    // 列表行需要封面：并发取详情最后一首封面（限制并发感：map + Promise.all）
    const rows = await Promise.all(
      list.map(async (p) => {
        const item = mapMsPlaylistToItem(p);
        item.picUrl = (await resolveCover(p)) || item.picUrl;
        return item;
      })
    );
    playlists.value = rows;
  } catch (error: any) {
    console.error('[list]', error);
    message.error(error?.message || '加载歌单失败');
    playlists.value = [];
    authenticated.value = false;
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

<style scoped>
.playlist-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.playlist-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.15s;
}

.playlist-row:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.cover {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.06);
}

.cover-local {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #22c55e;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 22px;
}

.meta {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--chrome-text, #111827);
}

.desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--chrome-text-muted, #6b7280);
}

.chevron {
  font-size: 20px;
  color: var(--chrome-text-muted, #9ca3af);
  flex-shrink: 0;
}
</style>
