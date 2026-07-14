# Frontend Development Guidelines

> **Project**: LYMusicPlayer — Electron + **Vue 3** + TypeScript + Pinia + **shadcn-vue**  
> Scaffold docs that mention React/Drizzle are **obsolete leftovers** — do not follow them.

## Tech Stack (actual)

- **Framework**: Electron + Vue 3 (`script setup`)
- **Build**: electron-vite / Vite
- **UI**: **shadcn-vue / reka-ui** (preferred for all new UI) under `components/ui/`; **naive-ui** still in legacy screens and being replaced gradually
- **State**: Pinia + pinia-plugin-persistedstate
- **Router**: vue-router (hash history)
- **CSS**: Tailwind + scoped SCSS; Lucide (shadcn path) + Remix Icon (legacy)
- **i18n**: vue-i18n (locale fixed zh-CN)

---

## Documentation Files (authoritative)

| File                                                 | Description                                     | Priority      |
| ---------------------------------------------------- | ----------------------------------------------- | ------------- |
| [directory-structure.md](./directory-structure.md)   | `src/` layout, naming, where to put new code    | **Must Read** |
| [component-guidelines.md](./component-guidelines.md) | SFC patterns, props, SongItem variants, UI kits | **Must Read** |
| [hook-guidelines.md](./hook-guidelines.md)           | Vue composables under `hooks/`                  | **Must Read** |
| [state-management.md](./state-management.md)         | Pinia modules, services boundary, persistence   | **Must Read** |
| [type-safety.md](./type-safety.md)                   | types layout, SongResult vs Track, window.api   | **Must Read** |
| [quality-guidelines.md](./quality-guidelines.md)     | lint, typecheck, test, commit, Electron safety  | **Must Read** |

---

## Quick Navigation

| Task                  | File                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| New page / route      | [directory-structure.md](./directory-structure.md)                                                |
| New Vue component     | [component-guidelines.md](./component-guidelines.md)                                              |
| Shared song-row logic | [component-guidelines.md](./component-guidelines.md) + [hook-guidelines.md](./hook-guidelines.md) |
| New composable        | [hook-guidelines.md](./hook-guidelines.md)                                                        |
| New Pinia store       | [state-management.md](./state-management.md)                                                      |
| Playback / audio      | [state-management.md](./state-management.md) (`services/` + player stores)                        |
| Domain types / Track  | [type-safety.md](./type-safety.md)                                                                |
| Pre-commit quality    | [quality-guidelines.md](./quality-guidelines.md)                                                  |

---

## Core Rules (MANDATORY)

| Rule                                                                               | Reference                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Vue 3 + `<script setup lang="ts">`, not React                                      | [directory-structure.md](./directory-structure.md)                                                     |
| New UI → shadcn-vue; do not grow naive-ui                                          | [component-guidelines.md](./component-guidelines.md)                                                   |
| UI state via Pinia; audio engine via `services/`                                   | [state-management.md](./state-management.md)                                                           |
| Renderer IPC only through `window.api`                                             | [component-guidelines.md](./component-guidelines.md), [quality-guidelines.md](./quality-guidelines.md) |
| Prefer existing `SongItem` / `useSongItem` for list rows                           | [component-guidelines.md](./component-guidelines.md)                                                   |
| **Confirmed**: new code → `Track` + `PlaybackRuntime`; `SongResult` is legacy only | [type-safety.md](./type-safety.md)                                                                     |
| Persist minified songs (no huge base64 covers)                                     | [state-management.md](./state-management.md)                                                           |
| `npm run lint` + `typecheck` (+ tests when pure logic)                             | [quality-guidelines.md](./quality-guidelines.md)                                                       |

---

## Obsolete scaffold files (do not use)

These were generated by Trellis init for a **React** Electron template and **do not match this codebase**:

- `components.md`, `hooks.md`, `quality.md`, `css-design.md`
- `ipc-electron.md`, `electron-browser-api-restrictions.md`, `react-pitfalls.md`

Prefer the six authoritative files above. Backend/shared Trellis layers may still be template-only until a separate bootstrap pass.

---

## Before Every Commit

- [ ] `npm run lint` — 0 errors
- [ ] `npm run typecheck` — 0 errors
- [ ] Relevant `npm run test` cases for pure logic changes
- [ ] Conventional commit message (`feat` / `fix` / `chore` / …)

---

**Language**: All documentation in this layer should be written in **English**.
