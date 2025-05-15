<template>
  <div
    class="song-item"
    :class="{ 'song-mini': mini, 'song-list': list, 'song-compact': compact }"
    @contextmenu.prevent="handleContextMenu"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div v-if="compact && index !== undefined" class="song-item-index" :class="{ 'text-green-500': isPlaying }">
      {{ index + 1 }}
    </div>
    <div v-if="selectable" class="song-item-select" @click.stop="toggleSelect">
      <n-checkbox :checked="selected" />
    </div>
    <n-image
      v-if="item.picUrl && !compact"
      ref="songImg"
      :src="getImgUrl(item.picUrl, '100y100')"
      class="song-item-img"
      preview-disabled
      :img-props="{
        crossorigin: 'anonymous'
      }"
      @load="imageLoad"
    />
    <div class="song-item-content" :class="{ 'song-item-content-compact': compact }">
      <div v-if="list" class="song-item-content-wrapper">
        <n-ellipsis class="song-item-content-title text-ellipsis" line-clamp="1" :class="{ 'text-green-500': isPlaying }">{{
          item.name
        }}</n-ellipsis>
        <div class="song-item-content-divider">-</div>
        <n-ellipsis class="song-item-content-name text-ellipsis" line-clamp="1">
          <template v-for="(artist, index) in artists" :key="index">
            <span
              class="cursor-pointer hover:text-green-500"
              @click.stop="handleArtistClick(artist.id)"
              >{{ artist.name }}</span
            >
            <span v-if="index < artists.length - 1"> / </span>
          </template>
        </n-ellipsis>
      </div>
      <template v-else-if="compact">
        <div class="song-item-content-compact-wrapper">
          <div class="w-60 flex-shrink-0 flex items-center" @dblclick="playMusicEvent(item)">
            <n-ellipsis class="song-item-content-title text-ellipsis" line-clamp="1" :class="{ 'text-green-500': isPlaying }">
              {{ item.name }}
            </n-ellipsis>
          </div>
          <div class="w-40 flex-shrink-0 song-item-content-compact-artist flex items-center">
            <n-ellipsis line-clamp="1">
              <template v-for="(artist, index) in artists" :key="index">
                <span
                  class="cursor-pointer hover:text-green-500"
                  @click.stop="handleArtistClick(artist.id)"
                  >{{ artist.name }}</span
                >
                <span v-if="index < artists.length - 1"> / </span>
              </template>
            </n-ellipsis>
          </div>
        </div>
        <div class="song-item-content-album flex items-center">
          <n-ellipsis line-clamp="1">{{ item.al?.name || '-' }}</n-ellipsis>
        </div>
        <div class="song-item-content-duration flex items-center">
          {{ formatDuration(getDuration(item)) }}
        </div>
      </template>
      <template v-else>
        <div class="song-item-content-title" @dblclick="playMusicEvent(item)">
          <n-ellipsis class="text-ellipsis" line-clamp="1" :class="{ 'text-green-500': isPlaying }">{{ item.name }}</n-ellipsis>
        </div>
        <div class="song-item-content-name">
          <n-ellipsis class="text-ellipsis" line-clamp="1">
            <template v-for="(artist, index) in artists" :key="index">
              <span
                class="cursor-pointer hover:text-green-500"
                @click.stop="handleArtistClick(artist.id)"
                >{{ artist.name }}</span
              >
              <span v-if="index < artists.length - 1"> / </span>
            </template>
          </n-ellipsis>
        </div>
      </template>
    </div>
    <div class="song-item-operating" :class="{ 
      'song-item-operating-list': list,
      'song-item-operating-compact': compact 
    }">
      <div v-if="favorite" class="song-item-operating-like" :class="{ 'opacity-0': compact && !isHovering && !isFavorite }">
        <i
          class="iconfont icon-likefill"
          :class="{ 'like-active': isFavorite }"
          @click.stop="toggleFavorite"
        ></i>
      </div>
      <n-tooltip v-if="isNext" trigger="hover" :z-index="9999999" :delay="400">
        <template #trigger>
          <div class="song-item-operating-next" @click.stop="handlePlayNext">
            <i class="iconfont ri-skip-forward-fill"></i>
          </div>
        </template>
        {{ t('songItem.menu.playNext') }}
      </n-tooltip>
      <div
        class="song-item-operating-play bg-gray-300 dark:bg-gray-800 animate__animated"
        :class="{ 'bg-green-600': isPlaying, 'animate__flipInY': playLoading, 'opacity-0': compact && !isHovering && !isPlaying }"
        @click="playMusicEvent(item)"
      >
        <i v-if="isPlaying && play" class="iconfont icon-stop"></i>
        <i v-else class="iconfont icon-playfill"></i>
      </div>
      <div v-if="compact" class="song-item-operating-menu" @click.stop="handleMenuClick" :class="{ 'opacity-0': compact && !isHovering && !isPlaying }">
        <i class="iconfont ri-more-fill"></i>
      </div>
    </div>
    <n-dropdown
      v-if="isElectron"
      :show="showDropdown"
      :x="dropdownX"
      :y="dropdownY"
      :options="dropdownOptions"
      :z-index="99999"
      placement="bottom-start"
      @clickoutside="showDropdown = false"
      @select="handleSelect"
    />
  </div>
</template>

<script lang="ts" setup>
import { cloneDeep } from 'lodash';
import type { MenuOption } from 'naive-ui';
import { NEllipsis, NImage, useMessage } from 'naive-ui';
import { computed, h, inject, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';

import { getSongUrl } from '@/hooks/MusicListHook';
import { useArtist } from '@/hooks/useArtist';
import { audioService } from '@/services/audioService';
import { usePlayerStore } from '@/store';
import type { SongResult } from '@/type/music';
import { getImgUrl, isElectron } from '@/utils';
import { getImageBackground } from '@/utils/linearColor';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    item: SongResult;
    mini?: boolean;
    list?: boolean;
    compact?: boolean;
    favorite?: boolean;
    selectable?: boolean;
    selected?: boolean;
    canRemove?: boolean;
    isNext?: boolean;
    index?: number;
  }>(),
  {
    mini: false,
    list: false,
    compact: false,
    favorite: true,
    selectable: false,
    selected: false,
    canRemove: false,
    isNext: false,
    index: undefined
  }
);

const playerStore = usePlayerStore();

const message = useMessage();

const play = computed(() => playerStore.isPlay);
const playMusic = computed(() => playerStore.playMusic);
const playLoading = computed(
  () => playMusic.value.id === props.item.id && playMusic.value.playLoading
);
const isPlaying = computed(() => {
  return playMusic.value.id === props.item.id;
});

const showDropdown = ref(false);
const dropdownX = ref(0);
const dropdownY = ref(0);
const isHovering = ref(false);

const isDownloading = ref(false);

const openPlaylistDrawer = inject<(songId: number | string) => void>('openPlaylistDrawer');

const { navigateToArtist } = useArtist();

const renderSongPreview = () => {
  return h(
    'div',
    {
      class: 'flex items-center gap-3 px-2 py-1 dark:border-gray-800'
    },
    [
      h(NImage, {
        src: getImgUrl(props.item.picUrl || props.item.al?.picUrl, '100y100'),
        class: 'w-10 h-10 rounded-lg flex-shrink-0',
        previewDisabled: true,
        imgProps: {
          crossorigin: 'anonymous'
        }
      }),
      h(
        'div',
        {
          class: 'flex-1 min-w-0 py-1 overflow-hidden'
        },
        [
          h(
            'div',
            {
              class: 'mb-1 overflow-hidden'
            },
            [
              h(
                NEllipsis,
                {
                  lineClamp: 1,
                  depth: 1,
                  class: 'text-sm font-medium w-full',
                  style: 'max-width: 150px; min-width: 120px;'
                },
                {
                  default: () => props.item.name
                }
              )
            ]
          ),
          h(
            'div',
            {
              class: 'text-xs text-gray-500 dark:text-gray-400 overflow-hidden'
            },
            [
              h(
                NEllipsis,
                {
                  lineClamp: 1,
                  style: 'max-width: 150px;'
                },
                {
                  default: () => {
                    const artistNames = (props.item.ar || props.item.song?.artists)?.map((a) => a.name).join(' / ');
                    return artistNames || '未知艺术家';
                  }
                }
              )
            ]
          )
        ]
      )
    ]
  );
};

const dropdownOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [
    {
      key: 'header',
      type: 'render',
      render: renderSongPreview
    },
    {
      key: 'divider1',
      type: 'divider'
    },
    {
      label: t('songItem.menu.play'),
      key: 'play',
      icon: () => h('i', { class: 'iconfont ri-play-circle-line' })
    },
    {
      label: t('songItem.menu.playNext'),
      key: 'playNext',
      icon: () => h('i', { class: 'iconfont ri-play-list-2-line' })
    },
    {
      type: 'divider',
      key: 'd1'
    },
    {
      label: t('songItem.menu.download'),
      key: 'download',
      icon: () => h('i', { class: 'iconfont ri-download-line' })
    },
    {
      label: t('songItem.menu.addToPlaylist'),
      key: 'addToPlaylist',
      icon: () => h('i', { class: 'iconfont ri-folder-add-line' })
    },
    {
      label: isFavorite.value ? t('songItem.menu.unfavorite') : t('songItem.menu.favorite'),
      key: 'favorite',
      icon: () =>
        h('i', {
          class: `iconfont ${isFavorite.value ? 'ri-heart-fill text-red-500' : 'ri-heart-line'}`
        })
    }
  ];

  if (props.canRemove) {
    options.push(
      {
        type: 'divider',
        key: 'd2'
      },
      {
        label: t('songItem.menu.removeFromPlaylist'),
        key: 'remove',
        icon: () => h('i', { class: 'iconfont ri-delete-bin-line' })
      }
    );
  }

  return options;
});

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  showDropdown.value = true;
  dropdownX.value = e.clientX;
  dropdownY.value = e.clientY;
};

const handleMenuClick = (e: MouseEvent) => {
  e.preventDefault();
  showDropdown.value = true;
  dropdownX.value = e.clientX;
  dropdownY.value = e.clientY;
};

const handleSelect = (key: string | number) => {
  showDropdown.value = false;
  if (key === 'download') {
    downloadMusic();
  } else if (key === 'playNext') {
    handlePlayNext();
  } else if (key === 'addToPlaylist') {
    openPlaylistDrawer?.(props.item.id);
  } else if (key === 'favorite') {
    toggleFavorite(new Event('click'));
  } else if (key === 'play') {
    playMusicEvent(props.item);
  } else if (key === 'remove') {
    emits('remove-song', props.item.id);
  }
};

// 下载音乐
const downloadMusic = async () => {
  if (isDownloading.value) {
    message.warning(t('songItem.message.downloading'));
    return;
  }

  try {
    isDownloading.value = true;

    const data = (await getSongUrl(props.item.id as number, cloneDeep(props.item), true)) as any;
    if (!data || !data.url) {
      throw new Error(t('songItem.message.getUrlFailed'));
    }

    // 构建文件名
    const artistNames = (props.item.ar || props.item.song?.artists)?.map((a) => a.name).join(',');
    const filename = `${props.item.name} - ${artistNames}`;
    console.log('props.item', props.item);

    const songData = cloneDeep(props.item);
    songData.ar = songData.ar || songData.song?.artists;
    // 发送下载请求
    window.electron.ipcRenderer.send('download-music', {
      url: data.url,
      type: data.type,
      filename,
      songInfo: {
        ...songData,
        downloadTime: Date.now()
      }
    });

    message.success(t('songItem.message.downloadQueued'));

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
    message.error(error.message || t('songItem.message.downloadFailed'));
  }
};

const emits = defineEmits(['play', 'select', 'remove-song']);
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
  // 如果是当前正在播放的音乐，则切换播放/暂停状态
  if (playMusic.value.id === item.id) {
    if (play.value) {
      playerStore.setPlayMusic(false);
      audioService.getCurrentSound()?.pause();
    } else {
      playerStore.setPlayMusic(true);
      audioService.getCurrentSound()?.play();
    }
    return;
  }

  try {
    // 使用store的setPlay方法，该方法已经包含了B站视频URL处理逻辑
    const result = await playerStore.setPlay(item);
    if (!result) {
      throw new Error('播放失败');
    }
    playerStore.isPlay = true;
    emits('play', item);
  } catch (error) {
    console.error('播放出错:', error);
  }
};

// 判断是否已收藏
const isFavorite = computed(() => {
  // 将id转换为number，兼容B站视频ID
  const numericId = typeof props.item.id === 'string' ? parseInt(props.item.id, 10) : props.item.id;
  return playerStore.favoriteList.includes(numericId);
});

// 切换收藏状态
const toggleFavorite = async (e: Event) => {
  e.stopPropagation();
  // 将id转换为number，兼容B站视频ID
  const numericId = typeof props.item.id === 'string' ? parseInt(props.item.id, 10) : props.item.id;

  if (isFavorite.value) {
    playerStore.removeFromFavorite(numericId);
  } else {
    playerStore.addToFavorite(numericId);
  }
};

// 切换选择状态
const toggleSelect = () => {
  emits('select', props.item.id, !props.selected);
};

const handleArtistClick = (id: number) => {
  navigateToArtist(id);
};

// 获取歌手列表（最多显示5个）
const artists = computed(() => {
  return (props.item.ar || props.item.song?.artists)?.slice(0, 4) || [];
});

// 添加到下一首播放
const handlePlayNext = () => {
  playerStore.addToNextPlay(props.item);
  message.success(t('songItem.message.addedToNextPlay'));
};

// 获取歌曲时长
const getDuration = (item: SongResult): number => {
  // 检查各种可能的时长属性路径
  if (item.duration) return item.duration;
  if (typeof item.dt === 'number') return item.dt;
  // 遍历可能存在的其他时长属性路径
  return 0;
};

// 格式化时长
const formatDuration = (ms: number): string => {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 鼠标悬停事件
const handleMouseEnter = () => {
  isHovering.value = true;
};

const handleMouseLeave = () => {
  isHovering.value = false;
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

    .song-item-operating-compact {
      .song-item-operating-like,
      .song-item-operating-play {
        @apply opacity-100;
      }
    }
  }

  &-img {
    @apply w-12 h-12 rounded-2xl mr-4;
  }

  &-index {
    @apply w-8 text-center text-gray-500 dark:text-gray-400 text-sm;
  }

  &-content {
    @apply flex-1;

    &-title {
      @apply text-base text-gray-900 dark:text-white;
    }

    &-name {
      @apply text-xs text-gray-500 dark:text-gray-400;
    }

    &-compact {
      @apply flex items-center gap-4;

      &-wrapper {
        @apply flex-1 min-w-0;
      }

      &-artist {
        @apply text-sm text-gray-500 dark:text-gray-400 ml-2;
      }
    }

    &-album {
      @apply w-32 text-sm text-gray-500 dark:text-gray-400;
    }

    &-duration {
      @apply w-16 text-sm text-gray-500 dark:text-gray-400 text-right;
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
      @apply mr-2 cursor-pointer ml-4 transition-all;
    }

    &-next {
      @apply mr-2 cursor-pointer transition-all;
      
      .iconfont {
        @apply text-xl transition text-gray-500 dark:text-gray-400 hover:text-green-500;
      }
    }

    .like-active {
      @apply text-red-500 dark:text-red-500;
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

    &-menu {
      @apply cursor-pointer flex items-center justify-center px-2;

      .iconfont {
        @apply text-xl transition text-gray-500 dark:text-gray-400 hover:text-green-500;
      }
    }
  }

  &-select {
    @apply mr-3 cursor-pointer;
  }
}

.song-compact {
  @apply rounded-lg p-2 h-12 mb-1 border-b dark:border-gray-800 border-gray-100;

  &:hover {
    @apply bg-gray-50 dark:bg-gray-700;

    .opacity-0 {
      opacity: 1;
    }
  }

  .song-item-content {
    &-title {
      @apply text-sm cursor-pointer;
    }
  }
  
  .song-item-content-compact-wrapper {
    @apply flex items-center;
  }

  .song-item-content-compact-artist {
    @apply w-40;
  }

  .song-item-operating-compact {
    @apply border-none bg-transparent gap-2 flex items-center;

    .song-item-operating-like,
    .song-item-operating-play {
      @apply transition-opacity duration-200;
    }

    .song-item-operating-play {
      @apply w-7 h-7;

      .iconfont {
        @apply text-base;
      }
    }

    .song-item-operating-like {
      @apply mr-1 ml-0;

      .iconfont {
        @apply text-base;
      }
    }

    .opacity-0 {
      opacity: 0;
    }
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

:deep(.n-dropdown-menu) {
  @apply min-w-[240px] overflow-hidden rounded-lg border dark:border-gray-800;

  .n-dropdown-option {
    @apply h-9 text-sm;

    &:hover {
      @apply bg-gray-100 dark:bg-gray-800;
    }

    .n-dropdown-option-body {
      @apply h-full;

      .n-dropdown-option-body__prefix {
        @apply w-8 flex justify-center items-center;

        .iconfont {
          @apply text-base;
        }
      }
    }
  }

  .n-dropdown-divider {
    @apply my-1;
  }
}

:deep(.song-preview) {
  @apply flex items-center gap-3 p-3 border-b dark:border-gray-800;

  .n-image {
    @apply w-12 h-12 rounded-lg flex-shrink-0;
  }

  .song-preview-info {
    @apply flex-1 min-w-0 py-1;

    .song-preview-name {
      @apply text-sm font-medium truncate mb-1;
    }

    .song-preview-artist {
      @apply text-xs text-gray-500 dark:text-gray-400 truncate;
    }
  }
}

:deep(.n-dropdown-option-body--render) {
  @apply p-0;
}
</style>
