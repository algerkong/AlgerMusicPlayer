# LYMusic 开发文档

> 基于 AlgerMusicPlayer 的魔改版（产品名 LYMusic / LYMusicPlayer）

## 项目结构

### 技术栈

- **前端框架**：Vue 3 + TypeScript
- **UI 组件库**：**shadcn-vue**（reka-ui，目录 `src/renderer/components/ui/`）为主；**naive-ui** 仍大量存在于旧页面，**正在逐步替换，禁止新增**
- **样式框架**：Tailwind CSS（+ `cn()` / `src/renderer/lib/utils.ts`）
- **图标库**：新 UI 优先 Lucide（shadcn-vue）；旧界面仍常见 Remix Icon
- **状态管理**：Pinia（`pinia-plugin-persistedstate`）
- **工具库**：VueUse
- **构建工具**：Vite, electron-vite
- **打包工具**：electron-builder
- **国际化**：vue-i18n（当前固定 zh-CN）
- **HTTP 客户端**：axios（下载封面等）
- **本地存储**：electron-store、localStorage、IndexedDB
- **音乐**：当前仅本地音乐播放；在线音源将接入独立库 ly-music-source

### 项目结构

```
LYMusicPlayer/
├── build/                  # 构建相关文件
├── docs/                   # 项目文档
├── node_modules/           # 依赖包
├── out/                    # 构建输出目录
├── resources/              # 资源文件
├── src/                    # 源代码
│   ├── i18n/               # 国际化配置
│   │   ├── lang/           # 语言包
│   │   ├── main.ts         # 主进程国际化入口
│   │   └── renderer.ts     # 渲染进程国际化入口
│   ├── main/               # Electron 主进程
│   │   ├── modules/        # 主进程模块
│   │   ├── index.ts        # 主进程入口
│   │   ├── lyric.ts        # 歌词处理
│   │   └── set.json        # 设置
│   ├── preload/            # 预加载脚本
│   │   ├── index.ts        # 预加载脚本入口
│   │   └── index.d.ts      # 预加载脚本类型声明
│   └── renderer/           # Vue 渲染进程
│       ├── assets/         # 静态资源
│       ├── components/     # 组件
│       ├── hooks/          # 自定义 Hooks
│       ├── layout/         # 布局组件
│       ├── router/         # 路由配置
│       ├── services/       # 服务
│       ├── store/          # Pinia 状态管理
│       ├── types/          # 类型定义
│       ├── utils/          # 工具函数
│       ├── views/          # 页面视图
│       ├── App.vue         # 根组件
│       └── main.ts         # 渲染进程入口
├── package.json
├── electron.vite.config.ts
└── tsconfig*.json
```

### 主要组件说明

#### 主进程 (src/main)

主进程负责创建窗口、处理系统层面的交互以及与渲染进程的通信。

- **index.ts**: 应用主入口，负责创建窗口和应用生命周期管理
- **lyric.ts**: 歌词窗口处理
- **modules/**: 配置、下载、本地扫描、托盘、快捷键等

#### 预加载脚本 (src/preload)

预加载脚本在渲染进程加载前执行，提供了渲染进程和主进程之间的桥接功能。

#### 渲染进程 (src/renderer)

渲染进程是基于 Vue 3 的前端应用，负责 UI 渲染和用户交互。

- **components/**: 包含各种 UI 组件
    - **ui/**: shadcn-vue 设计系统（新 UI 优先放这里）
    - **common/**: 通用业务组件（列表项、抽屉等）
    - **lyric/**: 歌词显示组件
    - **player/**: 播放栏 / 播放器相关
    - **settings/**: 设置界面组件
    - **EQControl.vue**: 均衡器控制
    - **...**: 其他组件

- **store/**: Pinia 状态管理
    - **modules/**: 各功能模块的状态管理
    - **index.ts**: 状态管理入口

- **views/**: 页面视图组件

- **router/**: 路由配置

- **api/**: API 请求封装

- **utils/**: 工具函数

### 开发指南

#### 命名约定

- 目录使用 kebab-case (如: components/auth-wizard)
- 组件文件名使用 PascalCase (如: AuthWizard.vue)
- 可组合式函数使用 camelCase (如: useAuthState.ts)

#### 代码风格

- 使用 Composition API 和 `<script setup>` 语法
- 使用 TypeScript 类型系统
- 优先使用类型而非接口
- 避免使用枚举，使用 const 对象代替
- 使用 Tailwind 实现响应式设计
- **新界面 / 新控件用 shadcn-vue**，不要再引入新的 naive-ui（`n-*`）；改旧页时可顺手迁移
- AI 编码约定见 `.trellis/spec/frontend/`（与本文不一致时以仓库代码 + Trellis spec 为准）

#### 曲目数据模型（必读）

「一首歌」拆成两层，**新代码优先走新模型**：

| 类型                  | 装什么                                                     | 路径                          |
| --------------------- | ---------------------------------------------------------- | ----------------------------- |
| **`Track`**           | 元数据：标题、歌手、封面、时长等（「是什么歌」）           | `src/shared/domain/track.ts`  |
| **`PlaybackRuntime`** | 会话态：播放 URL、试听标记、歌词、颜色等（「这次怎么播」） | 同上                          |
| **`PlayableTrack`**   | `Track` + 可选 `runtime`                                   | 同上                          |
| **`SongResult`**      | 历史播放器 DTO，元数据与运行态混在一起                     | `src/renderer/types/music.ts` |

- 新功能 / 新边界：用 `Track` / `PlayableTrack`，不要把 URL、歌词等写回 `Track`
- 旧 UI / 旧 store 仍要 `SongResult` 时：经 `trackBridge` / `trackAdapter` 转换，不要在 `SongResult` 上继续堆新领域字段
- 持久化列表/历史仍按现有 minify 策略（见 `persistedSong`），勿把大体积运行态当元数据存

#### Git / 分支习惯（GitHub Flow + 小改长期线）

整体跟 **GitHub Flow**：`main` 可合可发；功能用短命分支 + PR 合入。

**小改 / 界面打磨** 有一条长期线：

```
main
  └── ui/polish-draft                 ← 长期 PR / 长期分支（小改汇合处）
        ├── feat/xxx                  ← 一个小功能一条分支
        │     ├── feat/xxx-part-a     ← 小分支里还可再开子分支
        │     └── feat/xxx-part-b
        ├── fix/yyy
        └── feat/zzz
```

规则：

1. **一个功能 = 一条小分支**（通常从 `ui/polish-draft` 拉出；做完 PR 合回目标父分支）
2. **小分支里面可以继续开分支**（子能力 / 子问题拆开做，再合回上一级小分支）
3. **若一次改动扯到另一块独立能力** → **再开一条分支**，不要塞进同一条
4. 满意再 commit；你点头再 push / 开 PR
5. 大功能、不适合「小改」的，仍从 `main` 拉独立分支，走正常 GitHub Flow

### 如何启动？

安装依赖（最好使用node18+）：

```
npm install
```

#### 桌面端开发

启动桌面端开发：

```
npm run dev
```

#### 网页端开发

当前版本以本地音乐为主，在线音源将接入独立库。

```
npm run dev:web
```

### 打包

打包桌面端：

```
npm run build:win
```

打包后的文件在 /dist 下

打包网页端：

```
npm run build
```

打包后的文件在 /out/renderer 下
