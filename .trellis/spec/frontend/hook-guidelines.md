# Hook / Composable Guidelines

> In this repo “hooks” are **Vue composables** under `src/renderer/hooks/`, not React hooks.

---

## Location and naming

| Pattern              | Used for               | Examples                                             |
| -------------------- | ---------------------- | ---------------------------------------------------- |
| `useX.ts`            | Standard composable    | `useSongItem.ts`, `useDownload.ts`, `usePlayMode.ts` |
| `*Hook.ts`           | Legacy / large modules | `MusicHook.ts`, `IndexDBHook.ts`                     |
| `utils/*.ts` helpers | Non-reactive utilities | `utils/playerUtils.ts`, `utils/appShortcuts.ts`      |

New code: prefer **`use` + descriptive camelCase**. Do not create a parallel `composables/` tree unless tooling requires it (`components.json` aliases `composables` for shadcn; runtime code today uses `hooks/`).

---

## What belongs in a composable

| Put in hooks                              | Keep out of hooks                                  |
| ----------------------------------------- | -------------------------------------------------- |
| UI-adjacent reactive logic shared by SFCs | Pinia global state (use `store/modules`)           |
| Feature glue (download + message + store) | Audio engine / URL resolve (use `services/`)       |
| Progressive list rendering helpers        | IPC channel definitions (use preload `window.api`) |

---

## Standard shape

```ts
// useSongItem.ts — props in, reactive API out
export function useSongItem(props: { item: SongResult; canRemove?: boolean }) {
  const { t } = useI18n();
  const playerStore = usePlayerStore();
  const message = useMessage();
  const { downloadMusic, downloadLyric } = useDownload();

  const isPlaying = computed(() => playMusic.value.id === props.item.id);
  // …

  return {
    t,
    isPlaying,
    playMusicEvent,
    toggleFavorite
    // …
  };
}
```

Consumers destructure only what the SFC needs (`BaseSongItem.vue`).

---

## Real composables (inventory)

| File                                                               | Role                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `useSongItem.ts`                                                   | Song row: play, favorite, dislike, context menu, duration                            |
| `usePlayerHooks.ts`                                                | Song URL / lyric / detail fetch helpers re-exported by player store                  |
| `MusicHook.ts`                                                     | App-level music + lyric timing; **must** `initMusicHook(playerStore)` from `App.vue` |
| `useDownload.ts`                                                   | Download + lyric file actions                                                        |
| `useArtist.ts`                                                     | Navigate to artist                                                                   |
| `usePlayMode.ts` / `usePlaybackControl.ts` / `useVolumeControl.ts` | Small player UX helpers                                                              |
| `usePlayerHooks.ts`                                                | Data loading for playback                                                            |
| `useProgressiveRender.ts`                                          | Virtual-ish progressive list window for long scroll lists                            |
| `useLyricBackground.ts` / `useScrollTitle.ts` / `useZoom.ts`       | Presentation helpers                                                                 |
| `IndexDBHook.ts`                                                   | IndexedDB wrapper used by MusicHook caches                                           |

---

## MusicHook special rules

`MusicHook.ts` is module-scoped state, not a classic `use*` function:

1. Call `initMusicHook(playerStore)` once after stores exist (`App.vue` `onMounted`).
2. Do not instantiate a second audio pipeline; it coordinates with `audioService`.
3. Lyric time base / preview-stream flags live here — change carefully and test preview + full-song seek.

```ts
// App.vue
initMusicHook(playerStore);
await playerStore.initializePlayState();
```

---

## Composing stores inside hooks

Allowed and common:

```ts
const playerStore = usePlayerStore();
const result = await playerStore.setPlay(item);
```

Prefer calling **store actions** over reimplementing playlist mutation. For throttle/debounce of pure side effects, `@vueuse/core` is already a dependency (`useThrottleFn` in playlist store).

---

## Progressive rendering pattern

```ts
// useProgressiveRender.ts
export const useProgressiveRender = (options: ProgressiveRenderOptions) => {
  const renderLimit = ref(initialCount);
  const renderedItems = computed(() => items.value.slice(0, renderLimit.value));
  const handleScroll = (e: Event) => {
    /* expand renderLimit */
  };
  return { renderedItems, placeholderHeight, handleScroll /* … */ };
};
```

Use for long song lists; pair with `n-scrollbar` `@scroll`.

---

## Anti-patterns

- New React-style `useEffect` mental model → use `watch` / `onMounted` / store subscribers.
- Duplicating `useSongItem` logic inside a one-off list component.
- Calling `initMusicHook` from random pages.
- Putting `defineStore` inside a hook file — stores stay in `store/modules/`.
- Top-level `await` in new hooks without understanding SSR/web startup (MusicHook already uses top-level await for IndexedDB — treat as legacy constraint).

---

## Checklist

- [ ] Named `useX` (unless extending an existing `*Hook` module intentionally)
- [ ] File under `src/renderer/hooks/`
- [ ] Returns a plain object of refs/computed/functions
- [ ] No direct `ipcRenderer`; use `window.api` when Electron is required
- [ ] Document non-obvious lifecycle (`init*` functions) at the call site

**Language**: English for this spec.
