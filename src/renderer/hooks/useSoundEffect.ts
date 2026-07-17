import { ref, watch } from 'vue';

const STORAGE_KEY = 'ly-sound-effect';

export type SoundEffectKey = 'none' | 'smart' | '3d' | 'bass' | 'vocal' | 'clear' | 'live';

export const SOUND_EFFECT_PRESETS: { key: SoundEffectKey; label: string }[] = [
  { key: 'none', label: '关闭' },
  { key: 'smart', label: '智能音效' },
  { key: '3d', label: '3D 环绕' },
  { key: 'bass', label: '超重低音' },
  { key: 'vocal', label: '人声增强' },
  { key: 'clear', label: '清澈人声' },
  { key: 'live', label: '现场' }
];

const read = (): SoundEffectKey => {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as SoundEffectKey | null;
    if (v && SOUND_EFFECT_PRESETS.some((p) => p.key === v)) return v;
  } catch {
    /* ignore */
  }
  return 'none';
};

/** 全局单例：播放条 / 发现页共享 */
const activeEffect = ref<SoundEffectKey>(read());

watch(activeEffect, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
});

export function useSoundEffect() {
  const setEffect = (key: SoundEffectKey) => {
    activeEffect.value = key;
  };

  const effectLabel = () =>
    SOUND_EFFECT_PRESETS.find((p) => p.key === activeEffect.value)?.label || '';

  return {
    activeEffect,
    setEffect,
    effectLabel,
    presets: SOUND_EFFECT_PRESETS
  };
}
