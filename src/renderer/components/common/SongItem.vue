<template>
  <div
    class="song-item"
    :class="{ 'song-mini': mini, 'song-list': list }"
    @contextmenu.prevent="handleContextMenu"
  >
    <div v-if="selectable" class="song-item-select" @click.stop="toggleSelect">
      <n-checkbox :checked="selected" />
    </div>
    <n-image
      v-if="item.picUrl"
      ref="songImg"
      :src="getImgUrl(item.picUrl, '100y100')"
      class="song-item-img"
      preview-disabled
      :img-props="{
        crossorigin: 'anonymous'
      }"
      @load="imageLoad"
    />
    <div class="song-item-content">
      <div v-if="list" class="song-item-content-wrapper">
        <n-ellipsis class="song-item-content-title text-ellipsis" line-clamp="1">{{
          item.name
        }}</n-ellipsis>
        <div class="song-item-content-divider">-</div>
        <n-ellipsis class="song-item-content-name text-ellipsis" line-clamp="1">
          <span v-for="(artists, artistsindex) in item.ar || item.song.artists" :key="artistsindex"
            >{{ artists.name
            }}{{ artistsindex < (item.ar || item.song.artists).length - 1 ? ' / ' : '' }}</span
          >
        </n-ellipsis>
      </div>
      <template v-else>
        <div class="song-item-content-title">
          <n-ellipsis class="text-ellipsis" line-clamp="1">{{ item.name }}</n-ellipsis>
        </div>
        <div class="song-item-content-name">
          <n-ellipsis class="text-ellipsis" line-clamp="1">
            <span
              v-for="(artists, artistsindex) in item.ar || item.song.artists"
              :key="artistsindex"
              >{{ artists.name
              }}{{ artistsindex < (item.ar || item.song.artists).length - 1 ? ' / ' : '' }}</span
            >
          </n-ellipsis>
        </div>
      </template>
    </div>
    <div class="song-item-operating" :class="{ 'song-item-operating-list': list }">
      <div v-if="favorite" class="song-item-operating-like">
        <i
          class="iconfont icon-likefill"
          :class="{ 'like-active': isFavorite }"
          @click.stop="toggleFavorite"
        ></i>
      </div>
      <div
        class="song-item-operating-play bg-gray-300 dark:bg-gray-800 animate__animated"
        :class="{ 'bg-green-600': isPlaying, animate__flipInY: playLoading }"
        @click="playMusicEvent(item)"
      >
        <i v-if="isPlaying && play" class="iconfont icon-stop"></i>
        <i v-else class="iconfont icon-playfill"></i>
      </div>
    </div>
    <n-dropdown
      v-if="isElectron"
      :show="showDropdown"
      :options="dropdownOptions"
      :x="dropdownX"
      :y="dropdownY"
      placement="bottom-start"
      @clickoutside="showDropdown = false"
      @select="handleSelect"
    />
  </div>
</template>

<script lang="ts" setup>
import { cloneDeep } from 'lodash';
import type { MenuOption } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { computed, h, ref, useTemplateRef } from 'vue';
import { useStore } from 'vuex';

import { getSongUrl } from '@/hooks/MusicListHook';
import { audioService } from '@/services/audioService';
import type { SongResult } from '@/type/music';
import { getImgUrl, isElectron } from '@/utils';
import { getImageBackground } from '@/utils/linearColor';

const props = withDefaults(
  defineProps<{
    item: SongResult;
    mini?: boolean;
    list?: boolean;
    favorite?: boolean;
    selectable?: boolean;
    selected?: boolean;
  }>(),
  {
    mini: false,
    list: false,
    favorite: true,
    selectable: false,
    selected: false
  }
);

const store = useStore();
const message = useMessage();

const play = computed(() => store.state.play as boolean);
const playMusic = computed(() => store.state.playMusic);
const playLoading = computed(
  () => playMusic.value.id === props.item.id && playMusic.value.playLoading
);
const isPlaying = computed(() => {
  return playMusic.value.id === props.item.id;
});

const showDropdown = ref(false);
const dropdownX = ref(0);
const dropdownY = ref(0);

const isDownloading = ref(false);

const dropdownOptions = computed<MenuOption[]>(() => [
  {
    label: isDownloading.value ? '下载中...' : `下载 ${props.item.name}`,
    key: 'download',
    icon: () => h('i', { class: 'iconfont ri-download-line' }),
    disabled: isDownloading.value
  }
]);

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  showDropdown.value = true;
  dropdownX.value = e.clientX;
  dropdownY.value = e.clientY;
};

const handleSelect = (key: string | number) => {
  showDropdown.value = false;
  if (key === 'download') {
    downloadMusic();
  }
};

// 下载音乐
const downloadMusic = async () => {
  if (isDownloading.value) {
    message.warning('正在下载中，请稍候...');
    return;
  }

  try {
    isDownloading.value = true;

    const data = (await getSongUrl(props.item.id, cloneDeep(props.item), true)) as any;
    if (!data || !data.url) {
      throw new Error('获取音乐下载地址失败');
    }

    // 构建文件名
    const artistNames = (props.item.ar || props.item.song?.artists)?.map((a) => a.name).join(',');
    const filename = `${props.item.name} - ${artistNames}`;

    // 发送下载请求
    window.electron.ipcRenderer.send('download-music', {
      url: data.url,
      type: data.type,
      filename,
      songInfo: {
        ...cloneDeep(props.item),
        downloadTime: Date.now()
      }
    });

    message.success('已加入下载队列');

    // 监听下载完成事件
    const handleDownloadComplete = (_, result) => {
      if (result.filename === filename) {
        isDownloading.value = false;
        removeListeners();
      }
    };

    // 监听下载错误事件
    const handleDownloadError = (_, result) => {
      if (result.filename === filename) {
        isDownloading.value = false;
        removeListeners();
      }
    };

    // 移除监听器函数
    const removeListeners = () => {
      window.electron.ipcRenderer.removeListener('music-download-complete', handleDownloadComplete);
      window.electron.ipcRenderer.removeListener('music-download-error', handleDownloadError);
    };

    // 添加事件监听器
    window.electron.ipcRenderer.once('music-download-complete', handleDownloadComplete);
    window.electron.ipcRenderer.once('music-download-error', handleDownloadError);

    // 30秒后自动清理监听器（以防下载过程中出现未知错误）
    setTimeout(removeListeners, 30000);
  } catch (error: any) {
    console.error('Download error:', error);
    isDownloading.value = false;
    message.error(error.message || '下载失败');
  }
};

const emits = defineEmits(['play', 'select']);
const songImageRef = useTemplateRef('songImg');

const imageLoad = async () => {
  if (!songImageRef.value) {
    return;
  }
  const { backgroundColor } = await getImageBackground(
    (songImageRef.value as any).imageRef as unknown as HTMLImageElement
  );
  // eslint-disable-next-line vue/no-mutating-props
  props.item.backgroundColor = backgroundColor;
};

// 播放音乐 设置音乐详情 打开音乐底栏
const playMusicEvent = async (item: SongResult) => {
  if (playMusic.value.id === item.id) {
    if (play.value) {
      store.commit('setPlayMusic', false);
      audioService.getCurrentSound()?.pause();
    } else {
      store.commit('setPlayMusic', true);
      audioService.getCurrentSound()?.play();
    }
    return;
  }
  await store.commit('setPlay', item);
  store.commit('setIsPlay', true);
  emits('play', item);
};

// 判断是否已收藏
const isFavorite = computed(() => {
  return store.state.favoriteList.includes(props.item.id);
});

// 切换收藏状态
const toggleFavorite = async (e: Event) => {
  e.stopPropagation();
  if (isFavorite.value) {
    store.commit('removeFromFavorite', props.item.id);
  } else {
    store.commit('addToFavorite', props.item.id);
  }
};

// 切换选择状态
const toggleSelect = () => {
  emits('select', props.item.id, !props.selected);
};
</script>

<style lang="scss" scoped>
// 配置文字不可选中
.text-ellipsis {
  width: 100%;
}

.song-item {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  @apply rounded-3xl p-3 flex items-center transition bg-transparent dark:text-white text-gray-900;

  &:hover {
    @apply bg-gray-100 dark:bg-gray-800;
  }

  &-img {
    @apply w-12 h-12 rounded-2xl mr-4;
  }

  &-content {
    @apply flex-1;

    &-title {
      @apply text-base text-gray-900 dark:text-white;
    }

    &-name {
      @apply text-xs text-gray-500 dark:text-gray-400;
    }
  }

  &-operating {
    @apply flex items-center rounded-full ml-4 border dark:border-gray-700 border-gray-200 bg-light dark:bg-black;

    .iconfont {
      @apply text-xl;
    }

    .icon-likefill {
      @apply text-xl transition text-gray-500 dark:text-gray-400 hover:text-red-500;
    }

    &-like {
      @apply mr-2 cursor-pointer ml-4;
    }

    .like-active {
      @apply text-red-500;
    }

    &-play {
      @apply cursor-pointer rounded-full w-10 h-10 flex justify-center items-center transition
             border dark:border-gray-700 border-gray-200 text-gray-900 dark:text-white;

      &:hover,
      &.bg-green-600 {
        @apply bg-green-500 border-green-500 text-white;
      }
    }

    &-download {
      @apply mr-2 cursor-pointer;

      .iconfont {
        @apply text-xl transition text-gray-500 dark:text-gray-400 hover:text-green-500;
      }
    }
  }

  &-select {
    @apply mr-3 cursor-pointer;
  }
}

.song-mini {
  @apply p-2 rounded-2xl;

  .song-item {
    @apply p-0;

    &-img {
      @apply w-10 h-10 mr-2;
    }

    &-content {
      @apply flex-1;

      &-title {
        @apply text-sm;
      }

      &-name {
        @apply text-xs;
      }
    }

    &-operating {
      @apply pl-2;

      .iconfont {
        @apply text-base;
      }

      &-like {
        @apply mr-1 ml-1;
      }

      &-play {
        @apply w-8 h-8;
      }
    }
  }
}

.song-list {
  @apply p-2 rounded-lg mb-2 border dark:border-gray-800 border-gray-200;

  &:hover {
    @apply bg-gray-50 dark:bg-gray-800;
  }

  .song-item-img {
    @apply w-10 h-10 rounded-lg mr-3;
  }

  .song-item-content {
    @apply flex items-center flex-1;

    &-wrapper {
      @apply flex items-center flex-1 text-sm;
    }

    &-title {
      @apply flex-shrink-0 max-w-[45%] text-gray-900 dark:text-white;
    }

    &-divider {
      @apply mx-2 text-gray-500 dark:text-gray-400;
    }

    &-name {
      @apply flex-1 min-w-0 text-gray-500 dark:text-gray-400;
    }
  }

  .song-item-operating {
    @apply flex items-center gap-2;

    &-like {
      @apply cursor-pointer hover:scale-110 transition-transform;

      .iconfont {
        @apply text-base text-gray-500 dark:text-gray-400 hover:text-red-500;
      }
    }

    &-play {
      @apply w-7 h-7 cursor-pointer hover:scale-110 transition-transform;

      .iconfont {
        @apply text-base;
      }
    }
  }
}
</style>
