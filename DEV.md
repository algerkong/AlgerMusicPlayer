# LYMusic 开发文档

> 基于 AlgerMusicPlayer 的魔改版（产品名 LYMusic / LYMusicPlayer）

## 项目结构

### 技术栈

- **前端框架**：Vue 3 + TypeScript
- **UI 组件库**：naive-ui
- **样式框架**：Tailwind CSS
- **图标库**：remixicon
- **状态管理**：Pinia
- **工具库**：VueUse
- **构建工具**：Vite, electron-vite
- **打包工具**：electron-builder
- **国际化**：vue-i18n
- **HTTP 客户端**：axios（下载封面等）
- **本地存储**：electron-store localstorage
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
    - **common/**: 通用组件
    - **home/**: 首页相关组件
    - **lyric/**: 歌词显示组件
    - **settings/**: 设置界面组件
    - **MusicList.vue**: 音乐列表组件
    - **MvPlayer.vue**: MV 播放器
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
- 使用 tailwind 实现响应式设计

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
