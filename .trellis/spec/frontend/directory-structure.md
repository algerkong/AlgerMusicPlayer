# Directory Structure

> Real layout for **LYMusicPlayer** (Electron + Vue 3 + TypeScript).
> Document what exists today — not an ideal React monorepo.

---

## Tech stack (renderer)

| Layer      | Actual choice                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | Vue 3 (`<script setup lang="ts">`)                                                                                              |
| Build      | electron-vite + Vite                                                                                                            |
| UI         | **shadcn-vue / reka-ui** (target & new UI) under `components/ui/`; **naive-ui** still in many screens, being replaced gradually |
| CSS        | Tailwind CSS + scoped SCSS where needed; Remix Icon                                                                             |
| State      | Pinia + `pinia-plugin-persistedstate`                                                                                           |
| Router     | vue-router (`createWebHashHistory`)                                                                                             |
| i18n       | vue-i18n (locale fixed to `zh-CN` in `App.vue`)                                                                                 |
| Path alias | `@/*` → `src/renderer/*`                                                                                                        |

---

## Top-level `src/`

```
src/
├── i18n/                 # Main + renderer i18n entry + lang packs
├── main/                 # Electron main process
│   ├── index.ts
│   ├── modules/          # window, config, download, musicSource, tray, …
│   └── types/
├── preload/              # contextBridge → window.api
│   ├── index.ts
│   └── index.d.ts        # API surface types
├── renderer/             # Vue app (this layer)
└── shared/               # Cross-process pure TS (domain, shortcuts, update)
    └── domain/           # Track / PlaybackRuntime models
```

---

## Renderer layout (`src/renderer/`)

```
src/renderer/
├── main.ts               # createApp + pinia + router + i18n
├── App.vue               # n-config-provider shell, bootstrap stores/hooks
├── index.css             # Tailwind / design tokens entry
├── api/                  # Thin API wrappers (e.g. musicSource.ts)
├── assets/               # CSS, icons
├── components/
│   ├── common/           # Shared list items, drawers, modals
│   │   └── songItemCom/  # SongItem variants + BaseSongItem
│   ├── cover/
│   ├── lyric/
│   ├── player/           # PlayBar, drawers, mobile player chrome
│   ├── settings/         # Settings panels
│   └── ui/               # shadcn-vue design system (preferred for new UI)
├── const/
├── directive/            # Custom directives (loading, …)
├── hooks/                # Composables (useX / *Hook)
├── layout/               # AppLayout + chrome (menu, search bar)
├── lib/utils.ts          # cn() for shadcn-vue class merge
├── router/               # index + home/other route modules
├── services/             # Non-UI domain services (audio, playback, persistence)
├── store/
│   ├── index.ts          # pinia instance + re-exports
│   └── modules/          # One store file per domain
├── types/                # Renderer DTOs (SongResult, playlist, …)
├── utils/                # Pure helpers + bridges (auth, theme, trackBridge)
└── views/                # Route pages (home, search, set, favorite, …)
```

---

## Naming conventions (from DEV.md + codebase)

| Kind          | Convention                           | Example                           |
| ------------- | ------------------------------------ | --------------------------------- |
| Directories   | kebab-case when multi-word           | `mobile-search-result/`           |
| Vue SFCs      | PascalCase                           | `SongItem.vue`, `PlayBar.vue`     |
| Composables   | `use` + camelCase, or legacy `*Hook` | `useSongItem.ts`, `MusicHook.ts`  |
| Store modules | camelCase domain name                | `playerCore.ts`, `playHistory.ts` |
| Pages         | often `views/<feature>/index.vue`    | `views/history/index.vue`         |

---

## Where new code goes

| Task                                     | Put it here                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| New page / route                         | `views/<feature>/` + register in `router/home.ts` or `router/other.ts`   |
| Reusable list row / modal                | `components/common/`                                                     |
| Player chrome only                       | `components/player/` or `components/lyric/`                              |
| New UI control / form primitive          | `components/ui/<name>/` (shadcn-vue); avoid adding new naive-ui surfaces |
| Shared UI logic used by multiple SFCs    | `hooks/useX.ts`                                                          |
| Playback / audio / preload               | `services/` (not inside a Vue component)                                 |
| Global client state                      | `store/modules/<domain>.ts` + export from `store/index.ts`               |
| Pure DTO / domain shape shared with main | Prefer `src/shared/` when both sides need it                             |
| Renderer-only types                      | `src/renderer/types/`                                                    |
| Electron-only capability                 | `src/main/modules/` + expose via `src/preload/` `window.api`             |

---

## Anti-patterns observed / avoid

- Do **not** invent a React `src/main` IPC handler tree or Drizzle DB layer — this app is Vue + electron-store + IndexedDB.
- Do **not** put long-running audio graph code in SFCs; use `services/audioService.ts` and playback services.
- Do **not** call arbitrary IPC channels from renderer; only `window.api.*` (whitelist in preload).
- Prefer existing `components/common/SongItem.vue` variants over a new ad-hoc song row.

---

## Reference entry points

| Concern                  | File                                             |
| ------------------------ | ------------------------------------------------ |
| Renderer bootstrap       | `src/renderer/main.ts`, `src/renderer/App.vue`   |
| Shell layout             | `src/renderer/layout/AppLayout.vue`              |
| Preload API              | `src/preload/index.ts`, `src/preload/index.d.ts` |
| Domain Track model       | `src/shared/domain/track.ts`                     |
| Project overview (human) | `DEV.md`                                         |

**Language**: English for this spec.
