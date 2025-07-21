# Alger Music Player 开发文档

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
- **HTTP 客户端**：axios
- **本地存储**：electron-store localstorage
- **网易云音乐 API**：netease-cloud-music-api
- **音乐解锁**：@unblockneteasemusic/server

### 项目结构

```
AlgerMusicPlayer/
├── build/                  # 构建相关文件
├── docs/                   # 项目文档
├── node_modules/           # 依赖包
├── out/                    # 构建输出目录
├── resources/              # 资源文件
├── src/                    # 源代码
│   ├── i18n/               # 国际化配置
│   │   ├── lang/           # 语言包
│   │   ├── main.ts         # 主进程国际化入口
│   │   └── renderer.ts     # 渲染进程国际化入口
│   ├── main/               # Electron 主进程
│   │   ├── modules/        # 主进程模块
│   │   ├── index.ts        # 主进程入口
│   │   ├── lyric.ts        # 歌词处理
│   │   ├── server.ts       # 服务器
│   │   ├── set.json        # 设置
│   │   └── unblockMusic.ts # 音乐解锁
│   ├── preload/            # 预加载脚本
│   │   ├── index.ts        # 预加载脚本入口
│   │   └── index.d.ts      # 预加载脚本类型声明
│   └── renderer/           # Vue 渲染进程
│       ├── api/            # API 请求
│       ├── assets/         # 静态资源
│       ├── components/     # 组件
│       │   ├── common/     # 通用组件
│       │   ├── home/       # 首页组件
│       │   ├── lyric/      # 歌词组件
│       │   ├── settings/   # 设置组件
│       │   └── ...         # 其他组件
│       ├── const/          # 常量定义
│       ├── directive/      # 自定义指令
│       ├── hooks/          # 自定义 Hooks
│       ├── layout/         # 布局组件
│       ├── router/         # 路由配置
│       ├── services/       # 服务
│       ├── store/          # Pinia 状态管理
│       │   ├── modules/    # Pinia 模块
│       │   └── index.ts    # Pinia 入口
│       ├── type/           # 类型定义
│       ├── types/          # 更多类型定义
│       ├── utils/          # 工具函数
│       ├── views/          # 页面视图
│       ├── App.vue         # 根组件
│       ├── index.css       # 全局样式
│       ├── index.html      # HTML 模板
│       ├── main.ts         # 渲染进程入口
│       └── ...             # 其他文件
├── .env.development        # 开发环境变量
├── .env.development.local  # 本地开发环境变量
├── .env.production.local   # 本地生产环境变量
├── .eslintrc.cjs           # ESLint 配置
├── .gitignore              # Git 忽略文件
├── .prettierrc.yaml        # Prettier 配置
├── electron-builder.yml    # electron-builder 配置
├── electron.vite.config.ts # electron-vite 配置
├── package.json            # 项目配置
├── postcss.config.js       # PostCSS 配置
├── tailwind.config.js      # Tailwind 配置
├── tsconfig.json           # TypeScript 配置
├── tsconfig.node.json      # 节点 TypeScript 配置
└── tsconfig.web.json       # Web TypeScript 配置
```

### 主要组件说明

#### 主进程 (src/main)

主进程负责创建窗口、处理系统层面的交互以及与渲染进程的通信。

- **index.ts**: 应用主入口，负责创建窗口和应用生命周期管理
- **lyric.ts**: 歌词解析和处理
- **unblockMusic.ts**: 网易云音乐解锁功能
- **server.ts**: 本地服务器

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

如果只启动网页端开发，需要自己部署服务 netease-cloud-music-api

需要复制一份 `.env.development.local` 到 `src/renderer` 下

```
# .env.development.local

# 你的接口地址 (必填)
VITE_API = ***
# 音乐破解接口地址
VITE_API_MUSIC = ***
```

启动web端开发：

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
