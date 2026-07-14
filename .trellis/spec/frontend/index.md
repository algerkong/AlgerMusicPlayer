# 前端开发指南

> **项目**：LYMusicPlayer — Electron + **Vue 3** + TypeScript + Pinia + **shadcn-vue**  
> 文中若出现 React / Drizzle 等脚手架残留，一律忽略，以仓库实码为准。

## 技术栈（现状）

- **框架**：Electron + Vue 3（`script setup`）
- **构建**：electron-vite / Vite
- **UI**：**shadcn-vue / reka-ui**（新 UI，目录 `components/ui/`）；**naive-ui** 仍在旧页，逐步替换，禁止新增
- **状态**：Pinia + pinia-plugin-persistedstate
- **路由**：vue-router（hash）
- **样式**：Tailwind + 局部 scoped SCSS；新图标 Lucide，旧界面常见 Remix Icon
- **i18n**：vue-i18n（固定 zh-CN）
- **壳层取色**：封面色 → `coverChrome` / `linearColor` → CSS 变量与 naive primary

---

## 权威文档（必读）

| 文件                                                 | 内容                                        | 优先级   |
| ---------------------------------------------------- | ------------------------------------------- | -------- |
| [directory-structure.md](./directory-structure.md)   | `src/` 布局、命名、新代码放哪               | **必读** |
| [component-guidelines.md](./component-guidelines.md) | SFC、props、SongItem、UI 库                 | **必读** |
| [hook-guidelines.md](./hook-guidelines.md)           | `hooks/` 组合式函数                         | **必读** |
| [state-management.md](./state-management.md)         | Pinia、services 边界、持久化                | **必读** |
| [type-safety.md](./type-safety.md)                   | 类型、`Track` vs `SongResult`、`window.api` | **必读** |
| [quality-guidelines.md](./quality-guidelines.md)     | lint、测试、注释、提交、Electron 安全       | **必读** |

人读总览：[DEV.md](../../../DEV.md)

---

## 按任务导航

| 任务             | 文档                                            |
| ---------------- | ----------------------------------------------- |
| 新页面 / 路由    | directory-structure                             |
| 新 Vue 组件      | component-guidelines                            |
| 列表行 / 歌曲项  | component-guidelines + hook-guidelines          |
| 新 composable    | hook-guidelines                                 |
| 新 Pinia store   | state-management                                |
| 播放 / 音频      | state-management（`services/` + player stores） |
| 领域类型 / Track | type-safety                                     |
| 提交前质量       | quality-guidelines                              |

---

## 硬性规则

| 规则                                                      | 参考                                     |
| --------------------------------------------------------- | ---------------------------------------- |
| Vue 3 + `<script setup lang="ts">`，禁止 React            | directory-structure                      |
| 新 UI → shadcn-vue；不扩展 naive-ui                       | component-guidelines                     |
| UI 状态 Pinia；音频引擎 `services/`                       | state-management                         |
| 渲染进程 IPC 只走 `window.api`                            | component-guidelines、quality-guidelines |
| 列表行优先复用 `SongItem` / `useSongItem`                 | component-guidelines                     |
| 新代码 → `Track` + `PlaybackRuntime`；`SongResult` 仅遗留 | type-safety                              |
| 持久化曲目 minify，禁止大体积 base64 封面落盘             | state-management                         |
| 注释与文档用中文，专业、简洁                              | quality-guidelines                       |
| `npm run lint` + `typecheck`（纯逻辑补测试）              | quality-guidelines                       |

---

## 已清理

原 React 脚手架文档（`components.md`、`hooks.md`、`quality.md`、`css-design.md`、`ipc-electron.md`、`electron-browser-api-restrictions.md`、`react-pitfalls.md`）**已删除**。  
`backend/`、`big-question/`、`guides/` 等目录仍可能是 Trellis 通用模板，见 [spec/README.md](../README.md)；**勿当本项目实现规范**。

---

## 提交前检查

- [ ] `npm run lint` 无错误
- [ ] `npm run typecheck` 无错误
- [ ] 纯逻辑变更有对应 `npm run test`
- [ ] 约定式提交信息（`feat` / `fix` / `chore` / `docs` …）

---

**文档语言**：本层指南用**中文**撰写；代码标识符保持英文。
