# AGENTS.md — LYMusic 协作与 AI 代理指南

> 面向人类贡献者与 AI 编程代理。改代码前先读本文；与具体实现细节冲突时，以仓库当前代码为准，并及时回写文档。

## 1. 项目是什么

**LYMusic**（包名 `LYMusicPlayer`）是基于 [AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer) 的个人魔改版桌面音乐播放器。

| 项       | 值                                                                    |
| -------- | --------------------------------------------------------------------- |
| 产品名   | LYMusic / LYMusicPlayer                                               |
| 作者     | 落叶🍂 (@LuoYe17)                                                     |
| 仓库     | https://github.com/LuoYe17/AlgerMusicPlayer                           |
| `appId`  | `com.luoye.music`                                                     |
| 当前方向 | 桌面端 Electron 应用；在线检索/播放经 **`ly-music-source`**（主进程） |

### 技术栈（简表）

- **壳**：Electron + electron-vite + electron-builder
- **UI**：Vue 3 + TypeScript + Pinia + Vue Router + naive-ui + Tailwind CSS + remixicon
- **音源**：`ly-music-source`（主进程创建 client，经 IPC 暴露给渲染进程）
- **i18n**：vue-i18n（`zh-CN` / `zh-Hant` / `en-US` / `ja-JP` / `ko-KR`）
- **质量门禁**：ESLint、Prettier、commitlint（Conventional Commits）、husky + lint-staged、PR CI

### 进程与职责

```
┌─────────────────┐   IPC    ┌──────────────────────────────┐
│  renderer       │ ◄──────► │  main                         │
│  Vue UI / Pinia │          │  窗口 / 托盘 / 下载 / 缓存     │
│  api/musicSource│          │  modules/musicSource (ly-*)  │
└─────────────────┘          └──────────────────────────────┘
         ▲                              │
         │           preload            │
         └──────────────────────────────┘
```

- **`src/main`**：应用生命周期、窗口、托盘、快捷键、下载、缓存、桌面歌词、`ly-music-source` 桥接等。
- **`src/preload`**：安全暴露 IPC 与桌面能力。
- **`src/renderer`**：全部界面、路由、Pinia、播放器逻辑。
- **`src/i18n`**：主进程与渲染进程语言包。
- **`src/shared`**：主/渲染可共享的纯类型与工具。

更细的目录说明见 [DEV.md](./DEV.md)。

---

## 2. 工作流：优秀的 GitHub Flow（必须遵守）

本仓库采用 **GitHub Flow**，并按「怎么优秀怎么来」执行：**短生命周期分支、可并行多开、小步 PR、主分支永远可发布**。

### 2.1 核心原则

1. **`main` 永远可发布**  
   只合并已通过 CI、可自测的改动。禁止把半成品长期堆在 `main`。

2. **一切有意义的工作都在分支上完成**  
   不在 `main` 上直接堆大功能。Bugfix、小文档修正也优先走分支 + PR（紧急热修可极短分支，仍须 PR）。

3. **鼓励多开分支，并行推进**  
   互不相关的能力 / 修 bug / 文档 / UI 打磨 → **各自开分支**，互不阻塞。  
   一个分支只服务一个清晰目标，避免「巨型杂烩分支」。

4. **分支要短、PR 要小**  
   理想：几小时到几天内可合并。超过约一周仍无法合并时，应拆分或 rebase 对齐 `main`，而不是无限堆积。

5. **合并前必须有可审查的 PR**  
   PR 描述清楚「为什么 / 改了什么 / 怎么验」。截图/GIF 对 UI 改动是加分项，复杂交互建议必带。

6. **CI 是底线，不是可选项**  
   PR Check（标题与 commit 规范、lint、typecheck、i18n）必须绿。本地应尽量先跑同等检查。

### 2.2 标准循环（每天都按这个节奏）

```text
1. 从最新 main 开分支
2. 小步提交（Conventional Commits）
3. 推送远程，尽早开 Draft/正式 PR
4. CI + 自测 + 按需请人看
5. 合并进 main（Squash 或 Merge，以仓库默认与可追溯性为准）
6. 删除已合并远程分支；本地同步 main
7. 下一个任务 → 回到步骤 1（新分支，不要在旧分支上堆无关改动）
```

### 2.3 分支命名（推荐）

使用 **类型前缀 + 简短 kebab-case**：

| 前缀        | 用途                  | 示例                          |
| ----------- | --------------------- | ----------------------------- |
| `feat/`     | 新功能                | `feat/search-default-songs`   |
| `fix/`      | 缺陷修复              | `fix/lyric-window-blank`      |
| `refactor/` | 行为不变的结构调整    | `refactor/player-store-split` |
| `chore/`    | 杂务、依赖、图标等    | `chore/update-app-icon`       |
| `docs/`     | 仅文档                | `docs/agents-github-flow`     |
| `ci/`       | 工作流 / 门禁         | `ci/pr-check-bun`             |
| `perf/`     | 性能                  | `perf/playlist-render`        |
| `style/`    | 纯样式/格式（无逻辑） | `style/search-bar-spacing`    |

**好习惯：**

- 分支名能让别人一眼看出意图；避免 `tmp`、`wip`、`fix2`。
- 同一主题迭代可复用前缀，但若目标已变，**新开分支** 比改名糊弄更好。
- 实验性探索可用 `experiment/` 或 Draft PR，合并前整理历史与范围。

### 2.4 多分支并行的「优秀」做法

- **按关注点切分**：UI 壳层、音源 IPC、设置页、i18n 文案可以并行。
- **避免同文件长期冲突**：若两分支必碰同一热点文件，先合并更小的那个，或协调顺序；必要时抽公共小 PR 先落地。
- **频繁对齐 `main`**：  
  `git fetch origin && git rebase origin/main`（或 merge，团队一致即可）。冲突在自己分支解决，不要把脏合并推给别人。
- **Draft PR 尽早开**：让 CI 与 diff 尽早可见，而不是开发完才第一次推送。
- **完成即收尾**：合并后删远程分支、本地切回 `main` 并 pull，保持工作区干净。

### 2.5 Commit 规范

遵循 **Conventional Commits**（commitlint 强制）：

```text
<type>(optional-scope): <subject>
```

允许的 `type`：`feat` | `fix` | `perf` | `refactor` | `docs` | `style` | `test` | `build` | `ci` | `chore` | `revert`

示例：

- `feat(search): show default songs when query empty`
- `fix(ui): keep search bar background on focus`
- `refactor(search): drop search-box type filter`
- `docs: add AGENTS.md and refresh DEV.md`

**要求：**

- subject 简洁、说明意图；中英文均可，但同一 PR 内风格尽量统一。
- **禁止** 空洞信息：`update`、`fix`、`wip`、`改了一下`。
- 一次提交尽量只做一类事；调试垃圾、无关格式化不要塞进功能提交。
- PR 标题同样走 Conventional Commits（CI 会校验）。

### 2.6 PR 与合并

1. 基于最新 `main` 开 PR，目标分支为 **`main`**。
2. 使用仓库 PR 模板；勾选自查清单。
3. 范围聚焦：**一个 PR ≈ 一个可讲清的故事**。大功能拆成可独立合并的串联 PR。
4. 合并策略优先保证 `main` 历史可读：能 squash 的小 PR 可 squash；需要保留分步语义时用 merge commit。
5. 合并后清理分支；相关 issue 用 `Fixes #123` 等关联。
6. 用户可见变化考虑更新 [CHANGELOG.md](./CHANGELOG.md)（或在 PR 标明不需要）。

### 2.7 明确禁止

- 向 `main` 强推（`force-push`）——除非维护者在受控场景下处理事故，且事先知情。
- 在功能分支上 `--force` 覆盖他人已基于该分支的协作（自己的未共享分支可 rebase 后 force-with-lease）。
- 把不相关重构、依赖大升级、格式化全库与功能改动混在同一 PR。
- 为「过 CI」而跳过 lint / 用 `--no-verify` 作为常规手段。
- 提交密钥、Cookie、个人 session、大型二进制垃圾。

### 2.8 与 AI 代理协作时的额外约定

- **先读再写**：改动前用搜索/阅读定位真实调用链，不凭猜测改 IPC 通道名或 store 字段。
- **外科手术式 diff**：只改完成任务所需的行；不做顺手大重构。
- **匹配现有风格**：Composition API + `<script setup>`、现有命名与目录习惯。
- **验证**：至少对触及面跑合理检查（见下节）。能说明「如何验证」比空口「应该没问题」更重要。
- **Git 操作谨慎**：不擅自 force-push 共享分支、不改他人历史、不擅自发版/改保护分支规则。需要 push/开 PR 时按用户授权执行。
- **文档同步**：行为或架构变了，更新 `DEV.md` / `README.md` / 本文件相关段落，避免文档撒谎。

---

## 3. 本地开发速查

```bash
npm install          # Node 18+ 推荐；CI 使用 Node 24
npm run dev          # Electron 桌面开发
npm run dev:web      # 仅 Vite 网页端（能力受限，音源依赖主进程时不可用）

npm run lint         # ESLint + i18n 检查
npm run typecheck    # node + web 类型检查
npm run format       # Prettier
npm run build        # electron-vite 构建（也会生成 auto-import d.ts）

# 打包
npm run build:win
npm run build:mac
npm run build:linux
```

**说明：**

- `lint:i18n` 脚本通过 `bun` 运行；本地无 bun 时可装 bun，或与 CI 对齐。
- `src/renderer/auto-imports.d.ts`、`components.d.ts` 由 unplugin 生成，被 gitignore；完整 typecheck 前需先 `npm run build` 或启动过 dev。
- 提交时 husky 会跑 lint-staged；commit message 受 commitlint 约束。

---

## 4. 代码与架构约定

### 4.1 命名

- 目录：kebab-case
- Vue 组件文件：PascalCase
- 组合式函数：`useXxx.ts`（camelCase）
- 类型：优先 `type`，避免 enum，可用 `as const` 对象

### 4.2 Vue / 前端

- 使用 Composition API 与 `<script setup>`
- 样式优先 Tailwind；复杂组件可配合 scoped / sass
- 状态进 Pinia（`src/renderer/store/modules`），跨页面逻辑避免复制粘贴大段 store 外状态
- 播放与解析：在线 URL / 歌词走 `src/renderer/api/musicSource.ts` → 主进程 `modules/musicSource.ts`，不要在渲染进程直接 `import 'ly-music-source'` 当运行时客户端（除非现有代码已有明确例外）

### 4.3 主进程

- 新桌面能力优先落在 `src/main/modules/*`，在 `index.ts` 做初始化编排
- IPC 通道命名稳定、错误结构与现有 `MusicSourceIpcResult` 风格一致（`ok: true | false`）
- 注意单实例锁、文件锁类异常兜底、协议（如 `local://`）注册时机

### 4.4 国际化

- 用户可见文案走 i18n，五门语言尽量同步
- 增删 key 后跑 `npm run lint:i18n`
- 不要只改 `zh-CN` 就合并涉及 UI 文案的功能（至少补英文或标明后续 PR）

### 4.5 安全与合规

- 本软件仅供学习交流声明见 README；不引入盗版传播引导
- 不把用户 Cookie / session 打进日志或提交到 git
- 依赖升级走独立 `chore`/`ci` 分支，便于回滚

---

## 5. 文档地图

| 文档                                                                   | 用途                                   |
| ---------------------------------------------------------------------- | -------------------------------------- |
| [README.md](./README.md)                                               | 项目简介、快速开始、声明               |
| [DEV.md](./DEV.md)                                                     | 开发结构、启动与打包细节               |
| [AGENTS.md](./AGENTS.md)                                               | **本文件**：GitHub Flow、代理/贡献约束 |
| [CHANGELOG.md](./CHANGELOG.md)                                         | 版本用户可见变更                       |
| [docs/](./docs/)                                                       | 补充说明与截图资源                     |
| [.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md) | PR 模板                                |

---

## 6. 完成定义（Definition of Done）

一个功能/修复在合并前应满足：

- [ ] 独立分支，命名规范
- [ ] Commit / PR 标题符合 Conventional Commits
- [ ] 范围单一，diff 可审查
- [ ] lint / typecheck / i18n（触及面）通过
- [ ] 手动验证路径已说明（或已自动化）
- [ ] 必要文档与 CHANGELOG 已更新或标明无需
- [ ] 无密钥、无无关大文件、无 `--no-verify` 掩盖问题

**记住：多开分支、小步快跑、主分支常绿——这就是本仓库的优秀 GitHub Flow。**
