/**
 * 响应式 PlayableView：source 变化时自动重算。
 * 用于播放条当前曲、列表项 item 等。
 */
import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';

import type { SongResult } from '@/types/music';
import { type PlayableView, toPlayableView } from '@/utils/playableView';

export function usePlayableView(
  source: MaybeRefOrGetter<SongResult | null | undefined>
): ComputedRef<PlayableView | null> {
  return computed(() => toPlayableView(toValue(source)));
}
