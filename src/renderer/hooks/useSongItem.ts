import { useMessage } from 'naive-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageBackground } from '@/utils/linearColor';
import { sameTrackId } from '@/utils/playerUtils';
import { formatDurationMs, getSongArtists, getSongDurationMs } from '@/utils/songFields';

import { useArtist } from './useArtist';
import { useDownload } from './useDownload';

export function useSongItem(props: { item: SongResult; canRemove?: boolean }) {
  const { t } = useI18n();
  const playerStore = usePlayerStore();
  const message = useMessage();
  const { downloadMusic, downloadLyric } = useDownload();
  const { navigateToArtist } = useArtist();

  // 状态变量
  const showDropdown = ref(false);
  const dropdownX = ref(0);
  const dropdownY = ref(0);
  const isHovering = ref(false);

  const play = computed(() => playerStore.isPlay);
  const playMusic = computed(() => playerStore.playMusic);
  const playLoading = computed(
    () => sameTrackId(playMusic.value?.id, props.item.id) && !!playMusic.value?.playLoading
  );
  const isPlaying = computed(() => sameTrackId(playMusic.value?.id, props.item.id));

  const isFavorite = computed(() => {
    if (props.item.id == null) return false;
    return playerStore.isFavorite(props.item.id);
  });

  const isDislike = computed(() => {
    if (props.item.id == null) return false;
    return playerStore.isDisliked(props.item.id);
  });

  const artists = computed(() => getSongArtists(props.item).slice(0, 4));

  const handleImageLoad = async (imageElement: HTMLImageElement) => {
    if (!imageElement) return;

    const { backgroundColor, primaryColor } = await getImageBackground(imageElement);
    props.item.backgroundColor = backgroundColor;
    props.item.primaryColor = primaryColor;
  };

  // 播放音乐（点播单曲：队列只留这一首 → 发现页下一首进推荐流）
  const playMusicEvent = async (item: SongResult) => {
    try {
      playerStore.setPlayList([item], false, true);
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

  const toggleFavorite = async (e: Event) => {
    e && e.stopPropagation();
    const id = props.item.id;
    if (id == null) return;

    const wasFav = isFavorite.value;
    // 同步汽水「我喜欢」；失败仍改本地，避免 UI 卡住
    try {
      const { isElectron } = await import('@/utils');
      if (isElectron) {
        const { msLikeTrack, msUnlikeTrack } = await import('@/api/musicSource');
        if (wasFav) {
          await msUnlikeTrack(String(id));
        } else {
          await msLikeTrack(String(id));
        }
      }
    } catch (err) {
      console.warn('[toggleFavorite] 同步汽水喜欢失败', err);
    }

    if (wasFav) {
      playerStore.removeFromFavorite(id);
    } else {
      playerStore.addToFavorite(id);
    }

    // 侧栏「我喜欢」封面：加赞立刻换；取消赞仅当封面是这首时 reload
    try {
      const { useUserPlaylistsStore } = await import('@/store/modules/userPlaylists');
      const { getSongCoverUrl } = await import('@/utils/songFields');
      const plStore = useUserPlaylistsStore();
      const cover = getSongCoverUrl(props.item as any) || (props.item as any).picUrl || '';
      if (wasFav) {
        void plStore.refreshLikedCoverIfMatches(cover);
      } else {
        const liked = plStore.likedPlaylist;
        if (liked && cover) plStore.patchCover(liked.id, cover);
      }
    } catch {
      /* ignore */
    }
  };

  // 切换不喜欢状态（仅本地）
  const toggleDislike = async (e: Event) => {
    e && e.stopPropagation();

    if (isDislike.value) {
      playerStore.removeFromDislikeList(props.item.id);
      return;
    }

    playerStore.addToDislikeList(props.item.id);
  };

  const handlePlayNext = () => {
    playerStore.addToNextPlay(props.item);
    message.success(t('songItem.message.addedToNextPlay'));
  };

  const getDuration = (item: SongResult): number => getSongDurationMs(item);
  const formatDuration = formatDurationMs;

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

  const handleArtistClick = (id: number | string) => {
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
    downloadMusic,
    downloadLyric
  };
}
