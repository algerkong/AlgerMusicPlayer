import { useSettingsStore } from '@/store/modules/settings';
import type { ILyricText } from '@/types/music';

/**
 * Translate lyric lines according to selected engine.
 * Supports runtime-loading `opencc-rust` from CDN and caches the converter.
 */
export async function translateLyrics(lines: ILyricText[] | undefined) {
  if (!lines || lines.length === 0) return lines || [];

  const settingsStore = useSettingsStore();
  const engine = settingsStore.setData?.lyricTranslationEngine || 'none';

  switch (engine) {
    case 'opencc': {
      const mod: any = await import('./translation-engines/opencc');
      const engineMod = await mod.ensureOpenccConverter();
      return engineMod.translateLines(lines);
    }
    default: {
      return lines.map((l) => ({ ...l, trText: l.trText || '' }));
    }
  }
}

export default {
  translateLyrics
};
