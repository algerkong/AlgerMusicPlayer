# Type Safety

> TypeScript `strict` is on for the web/renderer project. Prefer explicit types at module boundaries.

---

## Tooling

| Config               | Scope                                                             |
| -------------------- | ----------------------------------------------------------------- |
| `tsconfig.web.json`  | Renderer + shared + selected main config types; `vue-tsc`         |
| `tsconfig.node.json` | Main / build scripts; `tsc`                                       |
| Paths                | `@/*` → `src/renderer/*`, `@main/*`, `@i18n/*`                    |
| Vue types            | `naive-ui/volar` (legacy), `auto-imports.d.ts`, `components.d.ts` |

Commands:

```bash
npm run typecheck:web
npm run typecheck:node
npm run typecheck
```

---

## Where types live

| Kind                       | Location                         | Examples                                            |
| -------------------------- | -------------------------------- | --------------------------------------------------- |
| Renderer DTOs / API shapes | `src/renderer/types/`            | `music.ts` (`SongResult`), `playlist.ts`, `user.ts` |
| Shared domain model        | `src/shared/domain/`             | `Track`, `PlaybackRuntime`, `PlayableTrack`         |
| Preload / `window.api`     | `src/preload/index.d.ts`         | `interface API`, `Window.api`                       |
| Main-only                  | `src/main/types/`                | MPRIS typings                                       |
| Local helper types         | Colocated in the util/store file | `MinifiedSong` in `persistedSong.ts`                |

Barrel: `src/renderer/types/index.ts` re-exports when needed; many imports use deep paths `@/types/music`.

---

## Domain model direction (confirmed team rule)

**Decision**: new code uses **`Track` + `PlaybackRuntime`** (and `PlayableTrack`). `SongResult` is legacy compatibility only.

Plain language:

| Concept           | Holds                                                              | Analogy                   |
| ----------------- | ------------------------------------------------------------------ | ------------------------- |
| `Track`           | What the song _is_ (title, artists, cover, duration, …)            | Label on the disc         |
| `PlaybackRuntime` | How _this session_ plays it (URL, preview flags, lyric, colors, …) | Player state after insert |
| `SongResult`      | Old DTO mixing both                                                | Historical bag of fields  |

```ts
// types/music.ts — legacy
/**
 * 播放器兼容 DTO（历史包袱）。
 * 新代码优先：shared/domain Track + PlaybackRuntime；经 trackBridge 互转。
 * 运行态字段（playMusicUrl / lyric / colors 等）不应视为曲目元数据。
 */
export interface SongResult {
  /* … */
}
```

```ts
// shared/domain/track.ts — preferred
export interface Track {
  /* metadata only */
}
export interface PlaybackRuntime {
  /* session-only: url, lyric, colors */
}
export interface PlayableTrack {
  track: Track;
  runtime?: PlaybackRuntime;
}
```

Bridge: `src/renderer/utils/trackBridge.ts` + `src/shared/domain/trackAdapter.ts`.

### Rules

1. **New features / new boundaries** → model data as `Track` / `PlayableTrack`.
2. **Do not** write URL, lyric, loading, or theme colors onto `Track`.
3. **Do not** add new domain fields only onto `SongResult` if they belong on Track/Runtime.
4. **Existing UI/stores** that still take `SongResult` → convert at the edge via bridge/adapter; gradual migration is fine.
5. **Persistence** → keep metadata lean (`minifySong*` patterns); runtime-heavy fields are not permanent identity.

---

## Interface vs type

DEV.md says “prefer type over interface”. The codebase uses **both** heavily (`interface SongResult`, `type PlayMode`, `type MinifiedSong`). For new code:

- Use `type` for unions, intersections, and mapped aliases (`PlayMode = 0 | 1 | 2`).
- `interface` is fine for object shapes that may be extended or match existing files.
- Avoid TypeScript `enum`; use const objects or union literals (`PlayMode`).

---

## Vue SFC typing

```ts
// Preferred for new components
const props = defineProps<{ item: SongResult; canRemove?: boolean }>();
const emits = defineEmits<{ play: [song: SongResult] }>(); // or string tuple form used today
```

Current code often uses `defineEmits(['play', 'select'])` string form — acceptable when matching neighbors; typed emits are better for new public components.

`defineOptions({ name: 'History' })` is used for keep-alive / devtools names.

---

## `any` reality

There is still substantial `any` (list payloads, settings `setData`, some history handlers). Rules for **new** code:

1. Do not widen existing typed APIs to `any`.
2. Prefer `unknown` + narrow at boundaries (IPC payloads, JSON parse).
3. Temporary `as SongResult` casts at list boundaries should stay local, not leak into store public API.
4. Avoid non-null assertions (`!`) when a guard or early return is possible (align with general quality goals).

---

## Electron window typing

```ts
// preload/index.d.ts
declare global {
  interface Window {
    api: API;
    $message: any;
  }
}
```

Renderer code should use optional chaining when web builds omit API:

```ts
window.api?.updatePlayState(value);
```

Gate full Electron-only flows with `isElectron` from `@/utils`.

---

## Persistence typing

Minified persistence types are **narrower** than `SongResult`:

```ts
export type MinifiedSong = {
  id: SongResult['id'];
  name: SongResult['name'];
  // …
  isPodcast?: SongResult['isPodcast'];
  program?: MinifiedDjProgram;
};
```

When restoring, treat missing fields as optional; do not assume full API album objects survived JSON round-trips.

---

## Shared vs renderer imports

- Pure models used by main + renderer → `src/shared/…`
- Renderer-only UI types → `src/renderer/types/`
- Do not import Vue SFCs into main process.

---

## Anti-patterns

| Avoid                                                       | Prefer                                 |
| ----------------------------------------------------------- | -------------------------------------- |
| New business fields only on `SongResult` with no Track plan | Extend `Track` / adapter               |
| Casting entire IPC response as a store without validation   | Narrow fields you use                  |
| Duplicating `Artist` / `Album` shapes in three files        | Reuse `@/types/music` or shared domain |
| `enum PlayMode`                                             | `type PlayMode = 0 \| 1 \| 2`          |

---

## Checklist

- [ ] Public function parameters and return types explicit
- [ ] Store state typed (`interface` or generic on `ref<T>`)
- [ ] IPC/window usage matches `API` in `preload/index.d.ts`
- [ ] New domain data prefers `Track` separation of metadata vs runtime
- [ ] `npm run typecheck` clean for touched packages

**Language**: English for this spec.
