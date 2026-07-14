# State Management

> Pinia is the single client state layer. Services hold non-reactive engines; components stay thin.

---

## Stack

| Piece                                           | Role                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| `createPinia()` + `pinia-plugin-persistedstate` | Store factory + selective persistence (`store/index.ts`) |
| `store.router = markRaw(router)`                | Router injected on every store                           |
| Module files under `store/modules/`             | One domain per file                                      |
| Barrel re-export                                | `store/index.ts` exports all `useXStore`                 |

---

## Store inventory

| Store                         | File                  | Responsibility                                              |
| ----------------------------- | --------------------- | ----------------------------------------------------------- |
| `usePlayerStore`              | `player.ts`           | **Facade**: composes core + playlist + favorite for UI      |
| `usePlayerCoreStore`          | `playerCore.ts`       | Current track, play/pause, volume, rate, musicFull, devices |
| `usePlaylistStore`            | `playlist.ts`         | Queue, index, playMode, shuffle, next/prev                  |
| `useFavoriteStore`            | `favorite.ts`         | favoriteList / dislikeList                                  |
| `useMusicStore`               | `music.ts`            | Current browsed music list page context                     |
| `useSettingsStore`            | `settings.ts`         | Theme (locked dark), mobile/mini, setData, drawers          |
| `useUserStore`                | `user.ts`             | Login presentation cache                                    |
| `useSearchStore`              | `search.ts`           | Search keyword / results state                              |
| `useDownloadStore`            | `download.ts`         | Download queue + IPC listeners                              |
| `usePlayHistoryStore`         | `playHistory.ts`      | Local play history                                          |
| `useLyricStore`               | `lyric.ts`            | Lyric UI state                                              |
| `useMenuStore`                | `menu.ts`             | Nav menus                                                   |
| `useNavTitleStore`            | `navTitle.ts`         | Top bar title visibility                                    |
| `useRecommendStore`           | `recommend.ts`        | Home recommendations                                        |
| `usePlaylistPlayMode` helpers | `playlistPlayMode.ts` | `PlayMode` type + `normalizePlayMode`                       |

Import either:

```ts
import { usePlayerStore } from '@/store';
// or
import { usePlayerStore } from '@/store/modules/player';
```

---

## Style A: Options store (`state` + `actions`)

Still used for simpler domains:

```ts
// music.ts
export const useMusicStore = defineStore('music', {
  state: (): MusicState => ({
    currentMusicList: null,
    currentMusicListName: '',
    currentListInfo: null,
    canRemoveSong: false
  }),
  actions: {
    setCurrentMusicList(list, name, listInfo = null, canRemove = false) {
      /* … */
    }
  }
});
```

---

## Style B: Setup store (`ref` + functions) — preferred for complex domains

```ts
// playerCore.ts
export const usePlayerCoreStore = defineStore(
  'playerCore',
  () => {
    const isPlay = ref(false);
    const playMusic = ref<SongResult>({} as SongResult);

    const setIsPlay = (value: boolean) => {
      isPlay.value = value;
      window.api?.updatePlayState(value);
    };

    return { isPlay, playMusic, setIsPlay /* … */ };
  },
  {
    // optional persist config when present
  }
);
```

```ts
// player.ts — facade composition
export const usePlayerStore = defineStore('player', () => {
  const playerCore = usePlayerCoreStore();
  const playlist = usePlaylistStore();
  const favorite = useFavoriteStore();

  const { playMusic, isPlay /* … */ } = storeToRefs(playerCore);
  // re-export actions by reference
  return {
    playMusic,
    isPlay,
    setIsPlay: playerCore.setIsPlay,
    setPlay: playlist.setPlay,
    addToFavorite: favorite.addToFavorite,
    initializePlayState: async () => {
      /* coordinator + playlist */
    }
  };
});
```

**Rule**: UI that only needs “the player” should use **`usePlayerStore`**. Split stores when implementing internals or avoiding circular imports.

---

## Services vs stores

| Layer   | Examples                                                                                            | Holds                                                   |
| ------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Store   | `playerCore`, `playlist`                                                                            | Reactive state, user intents, persisted lists           |
| Service | `audioService`, `playbackCoordinator`, `playbackController`, `preloadService`, `persistenceService` | Audio element, URL resolve, locks, non-UI orchestration |

```ts
// playerCore delegates volume to service
const setVolume = (newVolume: number) => {
  volume.value = Math.max(0, Math.min(1, newVolume));
  audioService.setVolume(isMuted.value ? 0 : volume.value);
};
```

Do not recreate `new Audio()` inside components or stores if `audioService` already owns the element.

---

## Persistence patterns

1. **pinia-plugin-persistedstate** on selected stores (see each module’s `persist` option).
2. **electron-store / settings**: `useSettingsStore` → `window.api.getSettings` / `setSettings` in Electron; `localStorage` on web.
3. **Debounced localStorage**: `utils/debouncedStorage.ts` for high-churn fields.
4. **Minified songs**: `utils/persistedSong.ts` (`minifySong` / `minifySongList`) before persisting queues/history — strips base64 covers and bulky fields.
5. **IndexedDB**: `IndexDBHook` / MusicHook caches for lyrics and URL cache.

When adding persisted song fields, update **minify** helpers so restore still works (see comments in `persistedSong.ts` about `isPodcast` / `program`).

---

## Play mode migration

```ts
// playlistPlayMode.ts
export type PlayMode = 0 | 1 | 2; // sequence / loop / random
// legacy heart mode 3 must normalize to 0
export function normalizePlayMode(mode: unknown): PlayMode {
  /* … */
}
```

`initializePlaylist` always normalizes illegal `playMode` values.

---

## Bootstrap order (App.vue)

1. `settingsStore.initializeSettings()` / theme / fonts
2. Restore user display cache from auth utils
3. `onMounted`: `initMusicHook(playerStore)` → `playbackCoordinator.setupUrlExpiredHandler()` → `playerStore.initializePlayState()` → device listeners → optional `initAudioListeners` + `window.api.sendSong`

Do not reverse store init and MusicHook init.

---

## Electron boundary

```ts
// Good
window.api?.updatePlayState(value);
window.api.setSettings(cloneDeep(mergedData));

// Bad
import { ipcRenderer } from 'electron';
```

Settings trust root and path fields go through dedicated dialogs (`selectDownloadPath`), not free-form `setSettings` keys (see preload comments).

---

## Anti-patterns

| Avoid                                                         | Why                                       |
| ------------------------------------------------------------- | ----------------------------------------- |
| Duplicating playlist mutation in a view                       | Use `usePlayerStore` / `usePlaylistStore` |
| Persisting full `SongResult` with base64 `picUrl`             | Use `minifySong*`                         |
| New global `ref` module for player state                      | Extends Pinia modules                     |
| Calling store actions that need pinia before `app.use(pinia)` | Bootstrap order                           |
| Assuming Vuex                                                 | Project is Pinia-only                     |

---

## Checklist for a new domain store

- [ ] File `store/modules/<name>.ts` + export from `store/index.ts`
- [ ] Setup store if logic is non-trivial
- [ ] Explicit types for state (interface or typed refs)
- [ ] Persist only minified / necessary fields
- [ ] Side effects that touch audio/network go through services
- [ ] Add unit tests next to pure helpers (see `playlistPlayMode.test.ts`)

**Language**: English for this spec.
