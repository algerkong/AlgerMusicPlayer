<template>
  <n-dropdown
    v-if="isElectron"
    :show="show"
    :x="x"
    :y="y"
    :options="dropdownOptions"
    :z-index="99999999"
    placement="bottom-start"
    @clickoutside="$emit('update:show', false)"
    @select="handleSelect"
    class="rounded-xl"
  />
</template>

<script lang="ts" setup>
import type { MenuOption } from 'naive-ui';
import { createDiscreteApi, NDropdown, NEllipsis, NImage } from 'naive-ui';
import { computed, h, inject } from 'vue';
import { useI18n } from 'vue-i18n';

import { useUserStore } from '@/store';
import type { SongResult } from '@/types/music';
import { getImgUrl, isElectron } from '@/utils';

const { message } = createDiscreteApi(['message']);

const { t } = useI18n();

const props = defineProps<{
  item: SongResult;
  show: boolean;
  x: number;
  y: number;
  isFavorite: boolean;
  isDislike: boolean;
  canRemove?: boolean;
}>();

const emits = defineEmits([
  'update:show',
  'select',
  'play',
  'play-next',
  'download',
  'download-lyric',
  'add-to-playlist',
  'toggle-favorite',
  'toggle-dislike',
  'remove'
]);

const openPlaylistDrawer = inject<(songId: number | string) => void>('openPlaylistDrawer');

const userStore = useUserStore();

// 是否具有真实登录权限（Cookie/扫码登录）。
// 用 userStore 的响应式状态而非直接读 localStorage：
// 后者不具备响应性，登录/登出后菜单禁用状态不会刷新（#706）
const hasRealAuth = computed(() => !!userStore.user && userStore.loginType !== 'uid');

// 本地歌曲：移除菜单项显示"从本地列表移除"而非"从歌单中删除"（#713）
const isLocalSong = computed(
  () =>
    typeof props.item.playMusicUrl === 'string' && props.item.playMusicUrl.startsWith('local://')
);

// 渲染歌曲预览
const renderSongPreview = () => {
  return h(
    'div',
    {
      class: 'flex items-center gap-3 px-2 dark:border-gray-800 dark:text-white'
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
                    const artistNames = (props.item.ar || props.item.song?.artists)
                      ?.map((a) => a.name)
                      .join(' / ');
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

// 下拉菜单选项
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
      label: t('songItem.menu.downloadLyric'),
      key: 'downloadLyric',
      icon: () => h('i', { class: 'iconfont ri-file-text-line' })
    },
    {
      // 不做灰色禁用：点击时提示不可用原因，避免用户不知道"为什么用不了"（#706）
      label: t('songItem.menu.addToPlaylist'),
      key: 'addToPlaylist',
      icon: () => h('i', { class: 'iconfont ri-folder-add-line' })
    },
    {
      label: props.isFavorite ? t('songItem.menu.unfavorite') : t('songItem.menu.favorite'),
      key: 'favorite',
      icon: () =>
        h('i', {
          class: `iconfont ${props.isFavorite ? 'ri-heart-fill text-red-500' : 'ri-heart-line'}`
        })
      // 收藏功能不禁用，UID登录时可以本地收藏/取消收藏
    },
    {
      label: props.isDislike ? t('songItem.menu.undislike') : t('songItem.menu.dislike'),
      key: 'dislike',
      icon: () =>
        h('i', {
          class: `iconfont ${props.isDislike ? 'ri-dislike-fill text-green-500' : 'ri-dislike-line'}`
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
        label: isLocalSong.value
          ? t('localMusic.removeFromLibrary')
          : t('songItem.menu.removeFromPlaylist'),
        key: 'remove',
        icon: () => h('i', { class: 'iconfont ri-delete-bin-line' })
      }
    );
  }

  return options;
});

// 处理选择
const handleSelect = (key: string | number) => {
  emits('update:show', false);

  switch (key) {
    case 'download':
      emits('download');
      break;
    case 'downloadLyric':
      emits('download-lyric');
      break;
    case 'playNext':
      emits('play-next');
      break;
    case 'addToPlaylist':
      if (!hasRealAuth.value) {
        message.warning(t('songItem.message.addToPlaylistNeedLogin'));
        break;
      }
      openPlaylistDrawer?.(props.item.id);
      break;
    case 'favorite':
      emits('toggle-favorite');
      break;
    case 'play':
      emits('play');
      break;
    case 'remove':
      emits('remove', props.item.id);
      break;
    case 'dislike':
      emits('toggle-dislike');
      break;
    default:
      break;
  }
};
</script>

<style lang="scss" scoped>
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

:deep(.n-dropdown-option-body--render) {
  @apply p-0;
}
</style>
