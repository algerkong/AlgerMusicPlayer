import { computed } from 'vue';

import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { useUserStore } from '@/store/modules/user';
import { isElectron } from '@/utils';
import { clampQualityToAvailable } from '@/utils/qualityClamp';

/** 汽水全档：最好在上 */
export const QUALITY_META: { value: string; label: string; short: string; svip?: boolean }[] = [
  { value: 'hi_res', label: '录音室', short: '室', svip: true },
  { value: 'spatial', label: '全景声', short: '全', svip: true },
  { value: 'lossless', label: '无损', short: '损', svip: true },
  { value: 'highest', label: '极高', short: '极' },
  { value: 'higher', label: '较高', short: '高' },
  { value: 'medium', label: '标准', short: '标' }
];

export const normalizeQ = (q?: string) => {
  const s = String(q || '').toLowerCase();
  if (s === 'standard') return 'medium';
  return s;
};

export type QualityMenuItem = {
  value: string;
  label: string;
  short: string;
  svip: boolean;
  locked: boolean;
  disabled: boolean;
  disabledReason?: string;
  active: boolean;
};

export function useStreamQuality() {
  const playerStore = usePlayerStore();
  const settingsStore = useSettingsStore();
  const userStore = useUserStore();

  const isAccountSvip = computed(() => userStore.vipLevel === 'svip');

  const currentSong = computed(() => playerStore.playMusic as any);

  const displayQualityKey = computed(() => {
    const song = currentSong.value as {
      streamQuality?: string;
      availableQualities?: string[];
    } | null;
    const avail = (song?.availableQualities || []).map(normalizeQ).filter(Boolean);
    const stream = normalizeQ(song?.streamQuality);
    // 实际流档优先，但必须在本曲可用档内（防全局无损写进 stream 却菜单只有三档）
    if (stream && QUALITY_META.some((m) => m.value === stream)) {
      if (!avail.length || avail.includes(stream)) return stream;
    }
    const pref = normalizeQ(settingsStore.setData.musicQuality || 'higher') || 'higher';
    if (avail.length) {
      // 与 resolve 同一套回落：无损→极高…；绝不自动显示录音室/全景
      return clampQualityToAvailable(pref, avail);
    }
    // 尚无本曲档位（未 resolve）：只展示偏好在「可自动档」内的标签
    if (pref === 'lossless' || pref === 'highest' || pref === 'higher' || pref === 'medium') {
      return pref;
    }
    // 手选录音室/全景但尚未 resolve：先显示该标签；resolve 后以 stream 为准
    if (pref === 'hi_res' || pref === 'spatial') return pref;
    return 'higher';
  });

  const qualityLabel = computed(() => {
    return (
      QUALITY_META.find((o) => o.value === displayQualityKey.value)?.label ||
      displayQualityKey.value
    );
  });

  const songAvailableQualities = computed(() => {
    const song = currentSong.value as {
      availableQualities?: string[];
      streamQuality?: string;
      id?: string | number;
    } | null;
    if (!song?.id) return [] as string[];
    const list = song.availableQualities;
    if (Array.isArray(list) && list.length) {
      return list.map(normalizeQ).filter(Boolean);
    }
    const fallback = new Set(['highest', 'higher', 'medium']);
    const stream = normalizeQ(song.streamQuality);
    if (stream) fallback.add(stream);
    return [...fallback];
  });

  const songQualityMenu = computed((): QualityMenuItem[] => {
    const avail = new Set(songAvailableQualities.value);
    if (!avail.size) return [];
    const pref = normalizeQ(settingsStore.setData.musicQuality || 'higher');
    const stream = normalizeQ(currentSong.value?.streamQuality);
    return QUALITY_META.filter((m) => avail.has(m.value)).map((m) => {
      const locked = Boolean(m.svip) && !isAccountSvip.value;
      return {
        value: m.value,
        label: m.label,
        short: m.short,
        svip: Boolean(m.svip),
        locked,
        disabled: locked,
        disabledReason: locked ? '需要 SVIP' : undefined,
        active: stream === m.value || (!stream && pref === m.value)
      };
    });
  });

  const setQuality = async (value: string) => {
    const key = normalizeQ(value);
    const item = songQualityMenu.value.find((o) => o.value === key);
    if (!item || item.disabled) return;

    const streamNow = normalizeQ(currentSong.value?.streamQuality);
    // 先落全局偏好（后续切歌/预取用新档）
    settingsStore.setSetData({
      ...settingsStore.setData,
      musicQuality: key
    });
    if (streamNow === key) return;
    if (!isElectron) return;

    const cur = playerStore.playMusic as {
      id?: string | number;
      playMusicUrl?: string;
      source?: string;
    } | null;
    if (!cur?.id) return;
    const url = String(cur.playMusicUrl || '');
    // 用户本地文件无多档
    if (url.startsWith('local://') && !url.includes('ly-music-cache') && cur.source === 'local') {
      return;
    }

    // 无感换档：当前流继续播，后台 resolve，就绪后再接（不 playTrack、不转圈）
    try {
      const { playbackCoordinator } = await import('@/services/playbackCoordinator');
      void playbackCoordinator.seamlessSwitchQuality(key, { songId: cur.id });
    } catch (error) {
      console.warn('[quality] seamless switch failed', error);
    }
  };

  return {
    displayQualityKey,
    qualityLabel,
    songQualityMenu,
    setQuality,
    isAccountSvip
  };
}
