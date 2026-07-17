/**
 * BaseSongItem 变体壳：props/emit/ref 转发只写一次。
 * 各 *SongItem.vue 只保留模板 + 调用本 hook。
 */
import { computed, ref, type Ref } from 'vue';

import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import type { SongArtistLike } from '@/utils/songFields';

export type SongItemShellProps = {
  item: SongResult;
  favorite?: boolean;
  selectable?: boolean;
  selected?: boolean;
  canRemove?: boolean;
  isNext?: boolean;
  index?: number;
};

export const songItemShellDefaults = {
  favorite: true,
  selectable: false,
  selected: false,
  canRemove: false,
  isNext: false,
  index: undefined as number | undefined
};

type ShellEmit = {
  (e: 'play', item: SongResult): void;
  (e: 'select', id: SongResult['id'], selected: boolean): void;
  (e: 'remove-song', payload?: unknown): void;
};

/** BaseSongItem defineExpose 形状（避免 hook 直接 import SFC） */
type BaseExposed = {
  imageLoad: (event: Event) => void | Promise<void>;
  toggleSelect: () => void;
  handleArtistClick: (id: number | string) => void;
  toggleFavorite: (event: Event) => void;
  playMusicEvent: (item: SongResult) => void;
  handlePlayNext: () => void;
  handleMenuClick: (event: MouseEvent) => void;
  isPlaying?: boolean;
  playLoading?: boolean;
  isFavorite?: boolean;
  isHovering?: boolean;
  artists?: SongArtistLike[];
};

/**
 * @param reemitSelect 为 true 时，勾选除 base 内 emit 外再 emit 一次（List/Mini）
 */
export function useSongItemShell(
  props: SongItemShellProps,
  emit: ShellEmit,
  options?: { reemitSelect?: boolean }
) {
  const playerStore = usePlayerStore();
  const baseItem = ref<BaseExposed | null>(null) as Ref<BaseExposed | null>;

  const play = computed(() => playerStore.isPlay);
  const isPlaying = computed(() => baseItem.value?.isPlaying || false);
  const playLoading = computed(() => baseItem.value?.playLoading || false);
  const isFavorite = computed(() => baseItem.value?.isFavorite || false);
  const isHovering = computed(() => baseItem.value?.isHovering || false);
  const artists = computed(() => (baseItem.value?.artists || []) as SongArtistLike[]);

  const onToggleSelect = () => {
    baseItem.value?.toggleSelect();
    if (options?.reemitSelect) {
      emit('select', props.item.id, !props.selected);
    }
  };

  const onImageLoad = (event: Event) => baseItem.value?.imageLoad(event);

  const onArtistClick = (id: number | string | undefined) => {
    if (id == null) return;
    baseItem.value?.handleArtistClick(id);
  };

  const onToggleFavorite = (event: Event) => {
    baseItem.value?.toggleFavorite(event);
  };

  const onPlayMusic = () => {
    baseItem.value?.playMusicEvent(props.item);
    emit('play', props.item);
  };

  const onPlayNext = () => {
    baseItem.value?.handlePlayNext();
  };

  const onMenuClick = (event: MouseEvent) => baseItem.value?.handleMenuClick(event);

  return {
    baseItem,
    play,
    isPlaying,
    playLoading,
    isFavorite,
    isHovering,
    artists,
    onToggleSelect,
    onImageLoad,
    onArtistClick,
    onToggleFavorite,
    onPlayMusic,
    onPlayNext,
    onMenuClick
  };
}
