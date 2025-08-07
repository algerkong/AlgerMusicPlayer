import { useDialog, useMessage } from 'naive-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageBackground } from '@/utils/linearColor';

import { useArtist } from './useArtist';
import { useDownload } from './useDownload';

export function useSongItem(props: { item: SongResult; canRemove?: boolean }) {
  const { t } = useI18n();
  const playerStore = usePlayerStore();
  const message = useMessage();
  const dialog = useDialog();
  const { downloadMusic } = useDownload();
  const { navigateToArtist } = useArtist();

  // 状态变量
  const showDropdown = ref(false);
  const dropdownX = ref(0);
  const dropdownY = ref(0);
  const isHovering = ref(false);

  // 计算属性
  const play = computed(() => playerStore.isPlay);
  const playMusic = computed(() => playerStore.playMusic);
  const playLoading = computed(
    () => playMusic.value.id === props.item.id && playMusic.value.playLoading
  );
  const isPlaying = computed(() => playMusic.value.id === props.item.id);

  // 收藏与不喜欢状态
  const isFavorite = computed(() => {
    const numericId =
      typeof props.item.id === 'string' ? parseInt(props.item.id, 10) : props.item.id;
    return playerStore.favoriteList.includes(numericId);
  });

  const isDislike = computed(() => {
    const numericId =
      typeof props.item.id === 'string' ? parseInt(props.item.id, 10) : props.item.id;
    return playerStore.dislikeList.includes(numericId);
  });

  // 获取艺术家列表
  const artists = computed(() => {
    return (props.item.ar || props.item.song?.artists)?.slice(0, 4) || [];
  });

  // 处理图片加载
  const handleImageLoad = async (imageElement: HTMLImageElement) => {
    if (!imageElement) return;

    const { backgroundColor, primaryColor } = await getImageBackground(imageElement);
    props.item.backgroundColor = backgroundColor;
    props.item.primaryColor = primaryColor;
  };

  // 播放音乐
  const playMusicEvent = async (item: SongResult) => {
    try {
      const result = await playerStore.setPlay(item);
      if (!result) {
        throw new Error('播放失败');
      }
      return true;
    } catch (error) {
      console.error('播放出错:', error);
      return false;
    }
  };

  // 切换收藏状态
  const toggleFavorite = async (e: Event) => {
    e && e.stopPropagation();
    const numericId =
      typeof props.item.id === 'string' ? parseInt(props.item.id, 10) : props.item.id;

    if (isFavorite.value) {
      playerStore.removeFromFavorite(numericId);
    } else {
      playerStore.addToFavorite(numericId);
    }
  };

  // 切换不喜欢状态
  const toggleDislike = async (e: Event) => {
    e && e.stopPropagation();
    if (isDislike.value) {
      playerStore.removeFromDislikeList(props.item.id);
      return;
    }

    dialog.warning({
      title: t('songItem.dialog.dislike.title'),
      content: t('songItem.dialog.dislike.content'),
      positiveText: t('songItem.dialog.dislike.positiveText'),
      negativeText: t('songItem.dialog.dislike.negativeText'),
      onPositiveClick: () => {
        playerStore.addToDislikeList(props.item.id);
      }
    });
  };

  // 添加到下一首播放
  const handlePlayNext = () => {
    playerStore.addToNextPlay(props.item);
    message.success(t('songItem.message.addedToNextPlay'));
  };

  // 获取歌曲时长
  const getDuration = (item: SongResult): number => {
    if (item.duration) return item.duration;
    if (typeof item.dt === 'number') return item.dt;
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

  // 处理右键菜单
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    showDropdown.value = true;
    dropdownX.value = e.clientX;
    dropdownY.value = e.clientY;
  };

  // 处理菜单点击
  const handleMenuClick = (e: MouseEvent) => {
    e.preventDefault();
    showDropdown.value = true;
    dropdownX.value = e.clientX;
    dropdownY.value = e.clientY;
  };

  // 处理艺术家点击
  const handleArtistClick = (id: number) => {
    navigateToArtist(id);
  };

  // 鼠标悬停处理
  const handleMouseEnter = () => {
    isHovering.value = true;
  };

  const handleMouseLeave = () => {
    isHovering.value = false;
  };

  return {
    t,
    play,
    playMusic,
    playLoading,
    isPlaying,
    isFavorite,
    isDislike,
    artists,
    showDropdown,
    dropdownX,
    dropdownY,
    isHovering,
    playerStore,
    message,
    getImgUrl,
    handleImageLoad,
    playMusicEvent,
    toggleFavorite,
    toggleDislike,
    handlePlayNext,
    getDuration,
    formatDuration,
    handleContextMenu,
    handleMenuClick,
    handleArtistClick,
    handleMouseEnter,
    handleMouseLeave,
    downloadMusic
  };
}
