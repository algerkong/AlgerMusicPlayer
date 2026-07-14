# 目录结构

> LYMusicPlayer 真实布局（Electron + Vue 3 + TypeScript）。  
> 描述**当前仓库**，不是理想 React monorepo。

---

## 渲染进程技术选型

| 层       | 实际选择                                                                       |
| -------- | ------------------------------------------------------------------------------ |
| 框架     | Vue 3（`<script setup lang="ts">`）                                            |
| 构建     | electron-vite + Vite                                                           |
| UI       | **shadcn-vue / reka-ui**（新 UI，`components/ui/`）；**naive-ui** 旧页逐步替换 |
| 样式     | Tailwind + 必要 scoped SCSS；滚动条用 shadcn `ScrollArea`                      |
| 状态     | Pinia + `pinia-plugin-persistedstate`                                          |
| 路由     | vue-router（`createWebHashHistory`）                                           |
| i18n     | vue-i18n（`App.vue` 固定 zh-CN）                                               |
| 路径别名 | `@/*` → `src/renderer/*`                                                       |

---

## 顶层 `src/`

```
src/
├── i18n/                 # 主进程 + 渲染进程 i18n 与语言包
├── main/                 # Electron 主进程
│   ├── index.ts
│   ├── modules/          # window、config、download、musicSource、tray…
│   └── types/
├── preload/              # contextBridge → window.api
│   ├── index.ts
│   └── index.d.ts
├── renderer/             # Vue 应用
└── shared/               # 跨进程纯 TS（domain、shortcuts、update…）
    └── domain/           # Track / PlaybackRuntime
```

---

## 渲染进程（`src/renderer/`）

```
src/renderer/
├── main.ts               # createApp + pinia + router + i18n
├── App.vue               # n-config-provider、启动 store/hooks、封面 naive 主题
├── index.css             # Tailwind 入口、--chrome-* / 大屏抽屉动画
├── api/                  # 薄封装（如 musicSource.ts）
├── assets/
├── components/
│   ├── common/           # 列表项、抽屉、弹层
│   │   └── songItemCom/  # SongItem 变体 + BaseSongItem
│   ├── cover/
│   ├── lyric/            # MusicFull / MusicFullMobile 等
│   ├── player/           # PlayBar、列表抽屉、移动端播放条
│   ├── settings/
│   └── ui/               # shadcn-vue（含 scroll-area）
├── const/
├── directive/
├── hooks/
├── layout/               # AppLayout、TitleBar、SearchBar、菜单
├── lib/utils.ts          # cn()
├── router/
├── services/             # audio、playback、preload、persistence（非 UI）
├── store/
│   ├── index.ts
│   └── modules/
├── types/
├── utils/                # 纯函数与桥：auth、linearColor、coverChrome、trackBridge…
└── views/
```

### 取色与壳层相关工具

| 文件                   | 职责                                                      |
| ---------------------- | --------------------------------------------------------- |
| `utils/linearColor.ts` | 封面采样、铺色渐变、文字明暗                              |
| `utils/coverChrome.ts` | 壳层 CSS 变量、naive primary 覆盖、写入 `documentElement` |
| `layout/AppLayout.vue` | 布局背景 + `applyCoverChromeToRoot`                       |

---

## 命名

| 种类       | 约定                              | 示例                             |
| ---------- | --------------------------------- | -------------------------------- |
| 目录       | 多词 kebab-case                   | `mobile-search-result/`          |
| Vue SFC    | PascalCase                        | `SongItem.vue`、`PlayBar.vue`    |
| 组合式函数 | `use` + camelCase，或遗留 `*Hook` | `useSongItem.ts`、`MusicHook.ts` |
| Store 模块 | 领域 camelCase                    | `playerCore.ts`                  |
| 页面       | 常为 `views/<feature>/index.vue`  | `views/history/index.vue`        |

---

## 新代码放哪

| 任务                   | 位置                                                |
| ---------------------- | --------------------------------------------------- |
| 新页面 / 路由          | `views/<feature>/` + `router/home.ts` 或 `other.ts` |
| 可复用列表行 / 弹层    | `components/common/`                                |
| 仅播放器壳             | `components/player/` 或 `components/lyric/`         |
| 新 UI 控件             | `components/ui/<name>/`（shadcn）；勿扩 naive       |
| 多 SFC 共享逻辑        | `hooks/useX.ts`                                     |
| 播放 / 音频 / 预加载   | `services/`（勿塞进 SFC）                           |
| 全局客户端状态         | `store/modules/<domain>.ts`                         |
| 主进程与渲染共用纯类型 | 优先 `src/shared/`                                  |
| 仅渲染进程 DTO         | `src/renderer/types/`                               |
| 仅 Electron 能力       | `src/main/modules/` + preload 暴露                  |

---

## 避免

- 不要按 React + Drizzle 模板搭主进程 / 数据库层
- 不要把音频图长逻辑写在 SFC；用 `audioService` 与 playback 服务
- 不要从渲染进程调任意 IPC；只用 `window.api.*`
- 列表行优先复用 `SongItem` 变体，勿另起一套

---

## 入口速查

| 关注点      | 文件                             |
| ----------- | -------------------------------- |
| 渲染启动    | `main.ts`、`App.vue`             |
| 壳层布局    | `layout/AppLayout.vue`           |
| Preload API | `preload/index.ts`、`index.d.ts` |
| Track 模型  | `shared/domain/track.ts`         |
| 人读总览    | `DEV.md`                         |

**文档语言**：中文。
