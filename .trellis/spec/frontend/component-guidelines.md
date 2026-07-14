# Component Guidelines

> Patterns taken from real SFCs under `src/renderer/components/` and `views/`.

---

## Defaults

1. **Composition API + `<script setup lang="ts">`** (or `script lang="ts" setup`).
2. **UI direction: shadcn-vue first.** New components, controls, and dialogs use **shadcn-vue / reka-ui** under `components/ui/` (+ Tailwind + `cn()`).
3. **naive-ui is legacy in migration.** Many existing screens still use `n-*` (ConfigProvider, Message, Empty, Scrollbar, drawers). On non-trivial edits, prefer migrating the local surface to shadcn-vue; do not expand naive-ui usage or add new `n-*` entry points.
4. Styling: **Tailwind utility classes** first; scoped SCSS for component-local rules that utilities cannot express cleanly.
5. Icons: **Lucide** for new shadcn surfaces (`components.json` → `iconLibrary: lucide`); **Remix Icon** (`ri-*`) remains common in older UI.
6. i18n: `useI18n()` + `t('…')` for user-visible strings (even though locale is fixed to `zh-CN`).

---

## SFC structure (typical)

```vue
<template>
  <!-- markup -->
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import SongItem from '@/components/common/SongItem.vue';
import { usePlayHistoryStore } from '@/store/modules/playHistory';

defineOptions({ name: 'History' });

// props / emits / store / handlers
</script>

<style lang="scss" scoped>
/* optional */
</style>
```

Real example: `src/renderer/views/history/index.vue`.

---

## Props and emits

### Prefer typed `defineProps` / `defineEmits`

```ts
// BaseSongItem.vue — typed props object
const props = defineProps<{
  item: SongResult;
  selectable?: boolean;
  selected?: boolean;
  canRemove?: boolean;
  isNext?: boolean;
  index?: number;
}>();

const emits = defineEmits(['play', 'select', 'remove-song']);
```

### Defaults via `withDefaults`

```ts
// SongItem.vue
const props = withDefaults(
  defineProps<{
    item: SongResult;
    mini?: boolean;
    list?: boolean;
    // …
  }>(),
  {
    mini: false,
    list: false,
    favorite: true
  }
);
```

### Runtime-style props still exist

Some older components use options-style `defineProps({ size: { type: String, default: '26px' } })` (e.g. `AppMenu.vue`). Match the surrounding file; prefer typed props for **new** code.

---

## Composition over giant SFCs

| Pattern                  | How                                                         |
| ------------------------ | ----------------------------------------------------------- |
| Shared song-row behavior | `useSongItem` in `hooks/useSongItem.ts`                     |
| Variant UI, same API     | Facade `SongItem.vue` picks Mini/List/Compact/Home/Standard |
| Slot-based base layout   | `BaseSongItem.vue` exposes slots + `defineExpose` helpers   |

```ts
// SongItem.vue — dynamic variant
const renderComponent = computed(() => {
  if (props.mini) return MiniSongItem;
  if (props.list) return ListSongItem;
  if (props.compact) return CompactSongItem;
  if (props.home) return HomeSongItem;
  return StandardSongItem;
});
```

When adding a new song-row look: implement under `songItemCom/`, wire through `SongItem.vue`, reuse `useSongItem` / `BaseSongItem`.

---

## Stores and services in components

- **Read/write UI state** via Pinia: `usePlayerStore()`, `useSettingsStore()`, etc.
- **Playback / audio** via services: `audioService`, `playbackCoordinator` — components call store actions that already coordinate services.
- **Electron** only through `window.api` after `isElectron` checks:

```ts
if (isElectron) {
  window.api.sendSong(cloneDeep(playerStore.playMusic));
}
```

Do not import `electron` or `ipcRenderer` from renderer SFCs.

---

## Lists and empty states

- Prefer existing list items: `SongItem`, `PlaylistItem`, `AlbumItem`.
- Empty states: older pages still use `n-empty` (e.g. history); **new** pages should use a simple empty block / shadcn pattern rather than introducing more naive-ui.
- Long lists: `useProgressiveRender` + existing scroll container (today often `n-scrollbar`); when rewriting scroll chrome, prefer native overflow / shadcn-friendly layout over new naive Scrollbar usage.

---

## Drawers / modals

Common pattern: local `ref` + `v-model` on drawer components, or settings-store flags (`showArtistDrawer`, `showDownloadDrawer`). Reuse:

- `ResponsiveModal.vue`, `ArtistDrawer.vue`, `PlaylistDrawer.vue`
- Player: `PlayingListDrawer.vue`
- Settings: panels under `components/settings/`

---

## Scrolling

- **Page / list / drawer scroll**: use shadcn-vue `ScrollArea` (`@/components/ui/scroll-area`).
- Do **not** add new `n-scrollbar` (naive-ui) or bare `overflow-y-auto` for primary page chrome.
- Horizontal tabs/presets: `<scroll-area orientation="horizontal">`.
- Need scrollTo / @scroll: use exposed `scrollTo` / `getViewport` / `@scroll` on `ScrollArea`.

## shadcn-vue UI kit (preferred)

- Config: `components.json` (style `reka-nova`, aliases `@/components/ui`, `@/lib/utils`, Lucide).
- Class merge helper: `cn()` in `src/renderer/lib/utils.ts`.
- Primitives re-export reka-ui roots (e.g. `components/ui/select/Select.vue`, `button/`, `switch/`).
- App still boots under `n-config-provider` in `App.vue` for remaining naive-ui; do not treat that as a reason to add more naive-ui.

**New design-system controls** → `components/ui/<control>/` with `index.ts` barrel when peers do.  
**Migrating a screen** → replace `n-button` / `n-modal` / etc. with shadcn-vue equivalents when you already touch that area; full-app rewrite is not required in one PR.

### naive-ui (legacy)

Still present for Message/Dialog providers, many settings/player surfaces, and list empty/scroll helpers. Rules:

| Situation                           | Action                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| New feature / new SFC               | shadcn-vue + Tailwind; no new naive-ui imports                     |
| Small bugfix inside naive-heavy SFC | Keep local `n-*` if a one-line fix; no new `n-*` components        |
| Larger edit of a naive screen       | Prefer partial migration to shadcn-vue for the controls you change |

---

## Anti-patterns

| Avoid                                                 | Prefer                            |
| ----------------------------------------------------- | --------------------------------- |
| New song row that reimplements favorite/play/download | `SongItem` + `useSongItem`        |
| Importing main-process modules from SFC               | `window.api` / shared pure TS     |
| Putting AudioContext logic in a view                  | `services/audioService.ts`        |
| Hard-coded English-only user strings in new UI        | `t('key')` + i18n lang files      |
| New `n-*` / naive-ui imports for greenfield UI        | shadcn-vue under `components/ui/` |
| Assuming React patterns (hooks as React hooks, JSX)   | Vue composables + SFC             |

---

## Checklist for a new component

- [ ] Correct folder (`common` / `player` / `settings` / `ui` / `views`)
- [ ] PascalCase filename
- [ ] Typed props; explicit emits
- [ ] New UI built with shadcn-vue (`components/ui` + Tailwind), not new naive-ui
- [ ] Uses existing store/service instead of duplicating playback logic
- [ ] Electron paths gated with `isElectron`
- [ ] User strings via i18n when adjacent code does

**Language**: English for this spec.
