# LYMusic 开发文档

> 基于 AlgerMusicPlayer 的魔改版（产品名 LYMusic / LYMusicPlayer）  
> 工作流与 AI/贡献约束见 **[AGENTS.md](./AGENTS.md)**；命令速查见 **[docs/github-flow.md](./docs/github-flow.md)**。

## 技术栈

| 类别     | 选型                                               |
| -------- | -------------------------------------------------- |
| 桌面壳   | Electron、electron-vite、electron-builder          |
| 前端     | Vue 3、TypeScript、Vue Router                      |
| UI       | naive-ui、Tailwind CSS、remixicon                  |
| 状态     | Pinia（+ persistedstate）                          |
| 工具     | VueUse、axios、howler 等                           |
| 在线音源 | `ly-music-source`（主进程 client，IPC 到渲染进程） |
| 国际化   | vue-i18n（五门语言）                               |
| 质量     | ESLint、Prettier、commitlint、husky、lint-staged   |

## 项目结构

```
LYMusicPlayer/
├── build/                     # 安装包图标、entitlements、NSIS 等
├── docs/                      # 补充文档与截图
├── resources/                 # 运行时资源（图标、manifest、远程控制页等）
├── scripts/                   # i18n 检查、sandbox 修复、mac yml 合并等
├── src/
│   ├── i18n/                  # 主进程 + 渲染进程语言包
│   │   └── lang/              # en-US, ja-JP, ko-KR, zh-CN, zh-Hant
│   ├── main/                  # Electron 主进程
│   │   ├── index.ts           # 入口与生命周期
│   │   ├── lyric.ts           # 桌面歌词窗口
│   │   └── modules/           # 配置、音源、下载、托盘、快捷键、更新等
│   ├── preload/               # 预加载与类型声明
│   ├── renderer/              # Vue 渲染进程
│   │   ├── api/               # 含 musicSource IPC 封装
│   │   ├── components/        # common / player / lyric / settings …
│   │   ├── hooks/             # 播放、收藏、下载等组合式逻辑
│   │   ├── layout/            # 桌面 / 移动 / Mini 布局
│   │   ├── router/
│   │   ├── services/          # 音频、EQ、预加载、播放控制
│   │   ├── store/modules/     # Pinia 模块
│   │   ├── views/             # 页面
│   │   ├── App.vue
│   │   └── main.ts
│   └── shared/                # 主/渲染共享工具与类型
├── AGENTS.md
├── CHANGELOG.md
├── DEV.md
├── README.md
├── electron.vite.config.ts
├── package.json
└── tsconfig*.json
```

## 架构要点

### 主进程 (`src/main`)

负责窗口与系统能力，并在启动时初始化各模块（见 `index.ts`）：

| 模块                             | 职责                                    |
| -------------------------------- | --------------------------------------- |
| `modules/config`                 | electron-store 配置                     |
| `modules/musicSource`            | `ly-music-source` 创建、会话持久化、IPC |
| `modules/cache`                  | 歌词等缓存                              |
| `modules/downloadManager`        | 下载                                    |
| `modules/fileManager`            | 文件相关 IPC                            |
| `modules/window` / `window-size` | 主窗口                                  |
| `modules/tray`                   | 托盘与菜单                              |
| `modules/shortcuts`              | 全局快捷键                              |
| `modules/update`                 | electron-updater                        |
| `modules/mpris`                  | Linux MPRIS                             |
| `modules/remoteControl`          | 远程控制                                |
| `lyric.ts`                       | 桌面歌词窗口                            |

### 音源数据流

1. 渲染进程通过 `src/renderer/api/musicSource.ts` 调用 IPC。
2. 主进程 `modules/musicSource.ts` 使用 `createMusicSource`，缓存目录在 userData 下。
3. 播放解析、歌词等在 hooks / services 中消费 API（例如 `usePlayerHooks` 中的 resolve）。

**不要**在渲染进程直接把 `ly-music-source` 当作桌面运行时客户端使用；会话（Cookie 等）只在主进程侧导入/导出。

### 渲染进程 (`src/renderer`)

- **components/**：`common` 列表项与抽屉、`player` 播放条、`lyric` 全屏歌词、`settings` 设置控件等。
- **views/**：首页、搜索、歌单/列表、收藏、历史、热力图、下载、登录、用户、设置 Tabs、歌词页、移动端搜索等。
- **store/modules/**：`player`、`music`、`search`、`playlist`、`settings`、`download` 等。
- **services/**：`audioService`、`eqService`、`playbackController`、预加载与歌词翻译等。

### 预加载 (`src/preload`)

在渲染进程加载前桥接 IPC，保持上下文隔离下的安全暴露。

## 开发约定

### 命名

- 目录：kebab-case（如 `mobile-search`）
- 组件文件：PascalCase（如 `SongItem.vue`）
- 组合式函数：camelCase + `use` 前缀（如 `usePlaybackControl.ts`）

### 代码风格

- Composition API + `<script setup>`
- TypeScript：优先 `type`，避免 enum，可用 `as const`
- 样式：优先 Tailwind；复杂场景可用 scoped / sass
- 用户可见文案走 i18n，改 key 后跑 `npm run lint:i18n`

### 提交与分支

- **GitHub Flow**：见 [AGENTS.md §2](./AGENTS.md)
- Conventional Commits；type：`feat` `fix` `perf` `refactor` `docs` `style` `test` `build` `ci` `chore` `revert`
- 分支示例：`feat/...`、`fix/...`、`chore/...`、`docs/...`
- 鼓励多开短分支并行；一个分支一个目标；PR 进 `main`

## 如何启动

安装依赖（Node 18+）：

```bash
npm install
```

### 桌面端

```bash
npm run dev
```

### 网页端

```bash
npm run dev:web
```

网页端无 Electron 主进程时，依赖 IPC 的在线音源能力不可用，仅适合部分 UI 开发。

### 质量检查

```bash
npm run lint          # ESLint + i18n
npm run typecheck     # 主进程 + 渲染进程
npm run format        # Prettier
npm run build         # 构建；并生成 auto-imports / components 的 d.ts
```

说明：

- `lint:i18n` 通过 `bun scripts/check_i18n.ts` 执行，本地需安装 [bun](https://bun.sh) 或与 CI 对齐。
- `auto-imports.d.ts` / `components.d.ts` 由 unplugin 生成且通常不入库；完整 `typecheck` 前建议先 `npm run build` 或启动过 dev。

## 打包

```bash
npm run build:win       # Windows NSIS 等
npm run build:mac       # macOS x64 + arm64 并合并 latest-mac.yml
npm run build:mac:x64
npm run build:mac:arm64
npm run build:linux     # AppImage / deb / rpm
npm run build:unpack    # 未打包目录
```

- 桌面安装包输出：`dist/`
- electron-vite 构建输出：`out/`（含 `main` / `preload` / `renderer`）

## 相关文档

- [README.md](./README.md) — 简介与声明
- [AGENTS.md](./AGENTS.md) — GitHub Flow 与代理指南
- [docs/README.md](./docs/README.md) — 文档索引
- [CHANGELOG.md](./CHANGELOG.md) — 版本日志
