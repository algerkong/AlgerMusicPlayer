/**
 * 播放条公共 chrome：全屏、列表抽屉、封面底色、简单进度点击。
 * 各 PlayBar 变体只保留布局与特有控件。
 */
import { ref, watch } from 'vue';

import { allTime, nowTime, playMusic } from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { audioService } from '@/services/audioService';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';

export type PlayBarChromeOptions = {
  /** 打开全屏时是否关闭歌手抽屉，默认 true */
  closeArtistDrawerOnFull?: boolean;
  /** 点歌手是否退出全屏，默认 true（Mini 条可关） */
  closeFullOnArtist?: boolean;
  /** setMusicFull 行为：toggle | open-only */
  fullMode?: 'toggle' | 'open';
};

export function usePlayBarChrome(options: PlayBarChromeOptions = {}) {
  const { closeArtistDrawerOnFull = true, closeFullOnArtist = true, fullMode = 'toggle' } = options;
  const playerStore = usePlayerStore();
  const settingsStore = useSettingsStore();
  const { navigateToArtist } = useArtist();

  const background = ref('#000');

  watch(
    () => playerStore.playMusic,
    () => {
      const bg = playMusic.value?.backgroundColor;
      if (bg) background.value = bg as string;
    },
    { immediate: true, deep: true }
  );

  const openPlayListDrawer = () => {
    playerStore.setPlayListDrawerVisible(true);
  };

  /** 无参：按 fullMode toggle 或 open；可绑 @click */
  const setMusicFull = () => {
    const next = fullMode === 'open' ? true : !playerStore.musicFull;
    playerStore.setMusicFull(next);
    if (next && closeArtistDrawerOnFull) {
      settingsStore.showArtistDrawer = false;
    }
  };

  const setMusicFullTo = (open: boolean) => {
    playerStore.setMusicFull(open);
    if (open && closeArtistDrawerOnFull) {
      settingsStore.showArtistDrawer = false;
    }
  };

  const handleArtistClick = (id: number | string) => {
    if (closeFullOnArtist) playerStore.setMusicFull(false);
    navigateToArtist(id);
  };

  /** 按点击位置 seek 到比例位置 */
  const seekByClientX = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || allTime.value <= 0) return;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = allTime.value * percent;
    audioService.seek(t);
    nowTime.value = t;
  };

  const handleProgressClick = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    seekByClientX(e.clientX, el);
  };

  return {
    playerStore,
    settingsStore,
    background,
    openPlayListDrawer,
    setMusicFull,
    setMusicFullTo,
    handleArtistClick,
    seekByClientX,
    handleProgressClick
  };
}
