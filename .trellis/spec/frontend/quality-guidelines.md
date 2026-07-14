# Quality Guidelines

> Lint, format, test, and commit rules as enforced in this repo today.

---

## Commands

| Script              | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `npm run lint`      | ESLint on `./src` + i18n key check (`scripts/check_i18n.ts`) |
| `npm run format`    | Prettier write on `./src`                                    |
| `npm run typecheck` | `typecheck:node` + `typecheck:web` (`vue-tsc`)               |
| `npm run test`      | Vitest (`vitest run`)                                        |
| `npm run dev`       | electron-vite desktop dev                                    |
| `npm run dev:web`   | Vite web-only                                                |

Husky + lint-staged: ESLint fix + Prettier on staged `ts/tsx/vue/js` (and Prettier on css/scss/md/json).

---

## Formatting (Prettier)

From `prettier.config.js`:

- `singleQuote: true`
- `semi: true`
- `printWidth: 100`
- `trailingComma: 'none'`
- `endOfLine: 'auto'`

Match surrounding files; do not reformat unrelated regions.

---

## ESLint highlights

Config: `eslint.config.mjs` (Vue + TypeScript + Prettier + simple-import-sort + vue-scoped-css).

Practical expectations observed in the tree:

- Import sort plugin is enabled — keep import groups stable when editing.
- `no-console` is off in base JS config; console logging is used for diagnostics in player/services (prefer scoped prefixes like `[PlaylistStore]`).
- Vue SFCs: use `eslint-plugin-vue`; avoid multi-word component name fights by setting `defineOptions({ name })` where peers do.

Run `npm run lint` before claiming a task done.

---

## Testing

| Runner | `vitest` (`vitest.config.ts`)        |
| ------ | ------------------------------------ |
| Layout | Colocated `*.test.ts` next to source |

Current examples:

- `src/renderer/store/modules/playlistPlayMode.test.ts`
- `src/renderer/services/persistenceService.test.ts`
- `src/renderer/utils/safeMarkdown.test.ts`
- `src/main/modules/pathGuard.test.ts`, `urlGuard.test.ts`
- `src/shared/domain/trackAdapter.test.ts`

**When to add a test**: pure functions, migrations (`normalizePlayMode`), path/url guards, adapters. Not every Vue SFC needs a component test; prefer testing logic extracted to utils/stores/services.

---

## i18n

- Lang packs under `src/i18n/lang/`
- Locale forced to `zh-CN` in `App.vue` (product decision; multi-language was slimmed)
- `npm run lint` includes `lint:i18n` — keep keys consistent when adding `t('…')` usage

---

## Accessibility & UX norms (as practiced)

- Prefer real controls / accessible primitives; **new** UI uses shadcn-vue, not additional naive-ui.
- Empty states via `n-empty`.
- Mobile vs desktop branches use `isMobile` / settings store flags; test both mental models when touching layout chrome.
- User selection often disabled on media chrome (`user-select: none` on app shell / song rows) — do not “fix” this without product intent.

---

## Security / Electron quality

- Renderer talks **only** through `window.api` (context isolation; no generic `ipcRenderer.invoke(anyChannel)`).
- Music-source channels are **whitelisted** in preload (`MUSIC_SOURCE_CHANNELS`).
- Settings writes are field-whitelisted in main; download/cache paths via dialog APIs.
- Markdown/HTML that reaches the DOM must go through existing sanitization (`safeMarkdown` / DOMPurify patterns) — do not `v-html` raw remote content.

---

## Git / commits

Commitlint: `@commitlint/config-conventional`.

Allowed types: `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert`.

Examples matching recent history:

- `fix: enforce built-in shortcut defaults`
- `chore: remove shortcut settings UI and dead feature leftovers`

---

## Code review checklist (AI / human)

- [ ] `npm run lint` — 0 errors
- [ ] `npm run typecheck` — 0 errors
- [ ] Relevant unit tests pass (`npm run test`)
- [ ] No new arbitrary IPC channels
- [ ] No accidental React / Drizzle / wrong-stack patterns
- [ ] Persistence paths minify songs / avoid huge base64 in storage
- [ ] i18n keys added when introducing user-visible strings
- [ ] Electron-only code guarded with `isElectron`

---

## Anti-patterns

| Avoid                                       | Prefer                    |
| ------------------------------------------- | ------------------------- |
| Committing with failing typecheck           | Fix or split PR           |
| Drive-by reformat of whole `src/`           | Touch only needed files   |
| Skipping i18n check after adding `t()` keys | Run full `npm run lint`   |
| “Tests later” for pure migrations           | Colocated `*.test.ts` now |

**Language**: English for this spec.
