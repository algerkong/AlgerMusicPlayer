# 质量规范

> 以本仓库当前脚本与 hook 为准：lint、格式化、测试、提交。

---

## 常用命令

| 脚本                | 作用                                            |
| ------------------- | ----------------------------------------------- |
| `npm run lint`      | ESLint（`./src`）+ i18n 键检查                  |
| `npm run format`    | Prettier 写回 `./src`                           |
| `npm run typecheck` | `typecheck:node` + `typecheck:web`（`vue-tsc`） |
| `npm run test`      | Vitest                                          |
| `npm run dev`       | electron-vite 桌面开发                          |
| `npm run dev:web`   | 仅 Vite 网页                                    |

Husky + lint-staged：暂存的 ts/tsx/vue/js 跑 ESLint fix + Prettier；css/scss/md/json 跑 Prettier。

---

## 格式化（Prettier）

见 `prettier.config.js`：

- `singleQuote: true`
- `semi: true`
- `printWidth: 100`
- `trailingComma: 'none'`
- `endOfLine: 'auto'`

只动相关文件，勿整库重排。

---

## ESLint 要点

配置：`eslint.config.mjs`（Vue + TS + Prettier + import 排序 + vue-scoped-css）。

- 改 import 时保持分组稳定
- `console` 在播放/服务里可用，建议带前缀（如 `[PlaylistStore]`）
- SFC 可用 `defineOptions({ name })` 固定组件名

任务完成前跑 `npm run lint`。

---

## 测试

| 项     | 说明                         |
| ------ | ---------------------------- |
| 运行器 | Vitest（`vitest.config.ts`） |
| 位置   | 与源码同目录 `*.test.ts`     |

示例：`playlistPlayMode.test.ts`、`persistenceService.test.ts`、`pathGuard` / `urlGuard`、`trackAdapter`、`coverChrome.test.ts`。

**何时补测**：纯函数、迁移、路径/URL 守卫、适配器。不必给每个 Vue 组件写测试；逻辑尽量抽到 utils / store / service 再测。

---

## 注释规范

| 要求   | 说明                                                                 |
| ------ | -------------------------------------------------------------------- |
| 语言   | **中文**；协议名、API、库名可保留英文                                |
| 写什么 | 边界、平台差异、非显然约束、与调用方约定                             |
| 不写   | 复述下一行代码；changelog（「已删」「不再」）；英文碎碎念；堆砌 TODO |

正确示例：

```ts
// 无可靠背景色时不强行开 has-cover-chrome，避免浅字落在白底
```

错误示例：

```ts
// 初始化应用
// 设置 UI 已删除，这里不再读 hidePlayBar
// Always re-sample cover to avoid pre-iOS colors
```

---

## 文档规范

- 面向协作者的说明用**中文**，简洁、可执行
- 权威来源：`DEV.md` + 本目录六份指南
- 勿更新 / 勿引用过时 React 脚手架文档
- 写清「现状是什么 / 新代码怎么做」，少写变更流水账

---

## i18n

- 文案包：`src/i18n/lang/`
- 产品固定 `zh-CN`（`App.vue`）
- `lint` 含 `lint:i18n`：新增 `t('…')` 时同步键

---

## 无障碍与体验（现状）

- 新 UI 用 shadcn-vue 原语
- 空状态仍常见 `n-empty`（遗留）
- 布局分桌面 / 移动时用 `isMobile` 等设置项
- 媒体壳层常见 `user-select: none`，无产品意图勿改

---

## Electron / 安全

- 渲染进程 **只** 通过 `window.api`（隔离上下文）
- 音源 channel 在 preload **白名单**
- 设置写入主进程字段白名单；下载/缓存路径走对话框 API
- 进 DOM 的 Markdown/HTML 须经现有净化（`safeMarkdown` / DOMPurify）；禁止 `v-html` 未净化远程内容

---

## Git / 提交

Commitlint：`@commitlint/config-conventional`。

类型：`feat`、`fix`、`perf`、`refactor`、`docs`、`style`、`test`、`build`、`ci`、`chore`、`revert`。

小改长期线：`ui/polish-draft`；一个能力一条短命分支，合完删除。

---

## 检查清单

- [ ] `npm run lint` 无错误
- [ ] `npm run typecheck` 无错误
- [ ] 相关单测通过
- [ ] 无任意 IPC channel
- [ ] 无 React / 错误技术栈模式
- [ ] 持久化 minify，无大体积 base64
- [ ] 用户可见文案有 i18n 键
- [ ] Electron 专用逻辑有 `isElectron` 守卫
- [ ] 注释与文档符合上文规范

---

## 反模式

| 避免                      | 应做               |
| ------------------------- | ------------------ |
| typecheck 失败仍提交      | 先修或拆开         |
| 整库无意义 reformat       | 只改相关文件       |
| 加了 `t()` 不跑 i18n 检查 | 跑完整 `lint`      |
| 纯逻辑迁移「以后再测」    | 同目录 `*.test.ts` |
| 注释写返工故事            | 写稳定约束         |

**文档语言**：中文。
