# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供项目指南。

## 项目概述

Alger Music Player 是基于 **Electron + Vue 3 + TypeScript** 构建的第三方网易云音乐播放器，支持桌面端（Windows/macOS/Linux）、Web 和移动端，具备本地 API 服务、桌面歌词、无损音乐下载、音源解锁、EQ 均衡器等功能。

## 技术栈

- **桌面端**: Electron 40 + electron-vite 5
- **前端框架**: Vue 3.5 (Composition API + `<script setup>`)
- **状态管理**: Pinia 3 + pinia-plugin-persistedstate
- **UI 框架**: naive-ui（自动导入）
- **样式**: Tailwind CSS 3（仅在模板中使用 class，禁止在 `<style>` 中使用 `@apply`）
- **图标**: remixicon
- **音频**: 原生 HTMLAudioElement + Web Audio API（EQ 均衡器）
- **工具库**: VueUse, lodash
- **国际化**: vue-i18n（5 种语言：zh-CN、en-US、ja-JP、ko-KR、zh-Hant）
- **音乐 API**: netease-cloud-music-api-alger + @unblockneteasemusic/server
- **自动更新**: electron-updater（GitHub Releases）
- **构建**: Vite 6, electron-builder

## 开发命令

```bash
# 安装依赖（推荐 Node 18+）
npm install

# 桌面端开发（推荐）
npm run dev

# Web 端开发（需自建 netease-cloud-music-api 服务）
npm run dev:web

# 类型检查
npm run typecheck              # 全部检查
npm run typecheck:node         # 主进程
npm run typecheck:web          # 渲染进程

# 代码规范
npm run lint                   # ESLint + i18n 检查
npm run format                 # Prettier 格式化

# 构建
npm run build                  # 构建渲染进程和主进程
npm run build:win              # Windows 安装包
npm run build:mac              # macOS DMG
npm run build:linux            # AppImage, deb, rpm
npm run build:unpack           # 仅构建不打包
```

## 项目架构

### 目录结构

```
src/
├── main/                      # Electron 主进程
│   ├── index.ts               # 入口，窗口生命周期
│   ├── modules/               # 功能模块（15 个文件）
│   │   ├── window.ts          # 窗口管理（主窗口、迷你模式、歌词窗口）
│   │   ├── tray.ts            # 系统托盘
│   │   ├── shortcuts.ts       # 全局快捷键
│   │   ├── fileManager.ts     # 下载管理
│   │   ├── remoteControl.ts   # 远程控制 HTTP API
│   │   └── update.ts          # 自动更新（electron-updater）
│   ├── lyric.ts               # 歌词窗口
│   ├── server.ts              # 本地 API 服务
│   └── unblockMusic.ts        # 音源解锁服务
│
├── preload/index.ts           # IPC 桥接（暴露 window.api）
│
├── shared/                    # 主进程/渲染进程共享代码
│   └── appUpdate.ts           # 更新状态类型定义
│
├── i18n/                      # 国际化
│   ├── lang/                  # 语言文件（5 语言 × 15 分类 = 75 个文件）
│   ├── main.ts                # 主进程 i18n
│   ├── renderer.ts            # 渲染进程 i18n
│   └── utils.ts               # i18n 工具
│
└── renderer/                  # Vue 应用
    ├── store/modules/         # Pinia 状态（15 个模块）
    │   ├── playerCore.ts      # 🔑 播放核心状态（纯状态：播放/暂停、音量、倍速）
    │   ├── playlist.ts        # 🔑 播放列表管理（上/下一首、播放模式）
    │   ├── settings.ts        # 应用设置
    │   ├── user.ts            # 用户认证与同步
    │   ├── lyric.ts           # 歌词状态
    │   ├── music.ts           # 音乐元数据
    │   └── favorite.ts        # 收藏管理
    │
    ├── services/              # 服务层
    │   ├── audioService.ts    # 🔑 原生 HTMLAudioElement + Web Audio API（EQ、MediaSession）
    │   ├── playbackController.ts # 🔑 播放控制流（playTrack 入口、generation 取消、初始化恢复）
    │   ├── playbackRequestManager.ts # 请求 ID 追踪（供 usePlayerHooks 内部取消检查）
    │   ├── preloadService.ts  # 下一首 URL 预验证
    │   ├── SongSourceConfigManager.ts  # 单曲音源配置
    │   └── translation-engines/       # 翻译引擎策略
    │
    ├── hooks/                 # 组合式函数（9 个文件）
    │   ├── MusicHook.ts       # 🔑 音乐主逻辑（歌词、进度、快捷键）
    │   ├── usePlayerHooks.ts  # 播放器 hooks
    │   ├── useDownload.ts     # 下载功能
    │   └── IndexDBHook.ts     # IndexedDB 封装
    │
    ├── api/                   # API 层（16 个文件）
    │   ├── musicParser.ts     # 🔑 多音源 URL 解析（策略模式）
    │   ├── music.ts           # 网易云音乐 API
    │   ├── bilibili.ts        # B站音源
    │   ├── gdmusic.ts         # GD Music 平台
    │   ├── lxMusicStrategy.ts # LX Music 音源策略
    │   ├── donation.ts        # 捐赠 API
    │   └── parseFromCustomApi.ts  # 自定义 API 解析
    │
    ├── components/            # 组件（59+ 个文件）
    │   ├── common/            # 通用组件（24 个）
    │   ├── player/            # 播放器组件（10 个）
    │   ├── settings/          # 设置弹窗组件（7 个）
    │   └── ...
    │
    ├── views/                 # 页面（53 个文件）
    │   ├── set/               # 设置页（已拆分为 Tab 组件）
    │   │   ├── index.vue      # 设置页壳组件（导航 + provide/inject）
    │   │   ├── keys.ts        # InjectionKey 定义
    │   │   ├── SBtn.vue       # 自定义按钮组件
    │   │   ├── SInput.vue     # 自定义输入组件
    │   │   ├── SSelect.vue    # 自定义选择器组件
    │   │   ├── SettingItem.vue
    │   │   ├── SettingSection.vue
    │   │   └── tabs/          # 7 个 Tab 组件
    │   │       ├── BasicTab.vue
    │   │       ├── PlaybackTab.vue
    │   │       ├── ApplicationTab.vue
    │   │       ├── NetworkTab.vue
    │   │       ├── SystemTab.vue
    │   │       ├── AboutTab.vue
    │   │       └── DonationTab.vue
    │   └── ...
    │
    ├── router/                # Vue Router（3 个文件）
    ├── types/                 # TypeScript 类型（20 个文件）
    ├── utils/                 # 工具函数（17 个文件）
    ├── directive/             # 自定义指令
    ├── const/                 # 常量定义
    └── assets/                # 静态资源
```

### 核心模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| 播放控制 | `services/playbackController.ts` | 🔑 播放入口（playTrack）、generation 取消、初始化恢复、URL 过期处理 |
| 音频服务 | `services/audioService.ts` | 原生 HTMLAudioElement + Web Audio API、EQ 滤波、MediaSession |
| 播放状态 | `store/playerCore.ts` | 纯状态：播放/暂停、音量、倍速、当前歌曲、音频设备 |
| 播放列表 | `store/playlist.ts` | 列表管理、播放模式、上/下一首 |
| 音源解析 | `api/musicParser.ts` | 多音源 URL 解析与缓存 |
| 音乐钩子 | `hooks/MusicHook.ts` | 歌词解析、进度跟踪、键盘快捷键 |

### 播放系统架构

```
用户操作 / 自动播放
    ↓
playbackController.playTrack(song)     ← 唯一入口，generation++ 取消旧操作
    ├─ 加载歌词 + 背景色
    ├─ 获取播放 URL（getSongDetail）
    └─ audioService.play(url, track)
         ├─ audio.src = url            ← 单一 HTMLAudioElement，换歌改 src
         ├─ Web Audio API EQ 链        ← createMediaElementSource 只调一次
         └─ 原生 DOM 事件 → emit
              ↓
         MusicHook 监听（进度、歌词同步、播放状态）
```

**关键设计**：
- **Generation-based 取消**：每次 `playTrack()` 递增 generation，await 后检查是否过期，过期则静默退出
- **单一 HTMLAudioElement**：启动时创建，永不销毁。换歌改 `audio.src`，EQ 链不重建
- **Seek**：直接 `audio.currentTime = time`，无 Howler.js 的 pause→play 问题

### 音源解析策略

`musicParser.ts` 使用 **策略模式** 从多个来源解析音乐 URL：

**优先级顺序**（可通过 `SongSourceConfigManager` 按曲配置）：
1. `custom` - 自定义 API
2. `bilibili` - B站音频
3. `gdmusic` - GD Music 平台
4. `lxmusic` - LX Music HTTP 源
5. `unblock` - UnblockNeteaseMusic 服务

**缓存策略**：
- 成功的 URL 在 IndexedDB 缓存 30 分钟（`music_url_cache`）
- 失败的尝试在内存中缓存 1 分钟（应用重启自动清除）
- 音源配置变更时缓存失效

### 设置页架构

设置页（`views/set/`）采用 **provide/inject** 模式拆分为 7 个 Tab 组件：

- `index.vue` 作为壳组件：管理 Tab 导航、`setData` 双向绑定与防抖保存
- `keys.ts` 定义类型化的 InjectionKey：`SETTINGS_DATA_KEY`、`SETTINGS_MESSAGE_KEY`、`SETTINGS_DIALOG_KEY`
- 自定义 UI 组件（`SBtn`、`SInput`、`SSelect`）替代部分 naive-ui 组件
- 字体选择器保留 naive-ui `n-select`（需要 filterable + multiple + render-label）

## 代码规范

### 命名

- **目录**: kebab-case（`components/music-player`）
- **组件**: PascalCase（`MusicPlayer.vue`）
- **组合式函数**: camelCase + `use` 前缀（`usePlayer.ts`）
- **Store**: camelCase（`playerCore.ts`）
- **常量**: UPPER_SNAKE_CASE（`MAX_RETRY_COUNT`）

### TypeScript

- **优先使用 `type` 而非 `interface`**
- **禁止使用 `enum`，使用 `const` 对象 + `as const`**
- 所有导出函数必须有类型标注

```typescript
// ✅ 正确
type SongResult = { id: number; name: string };
const PlayMode = { ORDER: 'order', LOOP: 'loop' } as const;

// ❌ 避免
interface ISongResult { ... }
enum PlayMode { ... }
```

### Vue 组件结构

```vue
<script setup lang="ts">
// 1. 导入（按类型分组）
import { ref, computed, onMounted } from 'vue';
import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';

// 2. Props & Emits
const props = defineProps<{ id: number }>();
const emit = defineEmits<{ play: [id: number] }>();

// 3. Store
const playerStore = usePlayerStore();

// 4. 响应式状态（使用描述性命名：isLoading, hasError）
const isLoading = ref(false);

// 5. 计算属性
const displayName = computed(() => /* ... */);

// 6. 方法（动词开头命名）
const handlePlay = () => { /* ... */ };

// 7. 生命周期钩子
onMounted(() => { /* ... */ });
</script>

<template>
  <!-- naive-ui 组件 + Tailwind CSS -->
</template>
```

### 样式规范

- **禁止在 `<style>` 中使用 `@apply`**，所有 Tailwind 类直接写在模板中
- 如发现代码中有 `@apply` 用法，应优化为内联 Tailwind class
- `<style scoped>` 仅用于无法用 Tailwind 实现的 CSS（如 keyframes 动画、`:deep()` 穿透）

### 导入约定

- **naive-ui 组件**：自动导入，无需手动 import
- **Vue 组合式 API**：`useDialog`、`useMessage`、`useNotification`、`useLoadingBar` 自动导入
- **路径别名**：`@` → `src/renderer`，`@i18n` → `src/i18n`

## 关键实现模式

### 状态持久化

Store 使用 `pinia-plugin-persistedstate` 自动持久化：

```typescript
export const useXxxStore = defineStore('xxx', () => {
  // store 逻辑
}, {
  persist: {
    key: 'xxx-store',
    storage: localStorage,
    pick: ['fieldsToPersist']  // 仅持久化指定字段
  }
});
```

### IPC 通信

```typescript
// 主进程 (src/main/modules/*)
ipcMain.handle('channel-name', async (_, args) => {
  return result;
});

// Preload (src/preload/index.ts)
const api = {
  methodName: (args) => ipcRenderer.invoke('channel-name', args)
};
contextBridge.exposeInMainWorld('api', api);

// 渲染进程 (src/renderer/*)
const result = await window.api.methodName(args);
```

### IndexedDB 使用

使用 `IndexDBHook` 组合式函数：

```typescript
const db = await useIndexedDB('dbName', [
  { name: 'storeName', keyPath: 'id' }
], version);

const { saveData, getData, deleteData } = db;
await saveData('storeName', { id: 1, data: 'value' });
const data = await getData('storeName', 1);
```

### 新增页面

1. 创建 `src/renderer/views/xxx/index.vue`
2. 在 `src/renderer/router/other.ts` 中添加路由
3. 在 `src/i18n/lang/*/` 下所有 5 种语言中添加 i18n 键值

### 新增 Store

```typescript
// src/renderer/store/modules/xxx.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useXxxStore = defineStore('xxx', () => {
  const state = ref(initialValue);
  const action = () => { /* ... */ };
  return { state, action };
});

// 在 src/renderer/store/index.ts 中导出
export * from './modules/xxx';
```

### 新增音源策略

编辑 `src/renderer/api/musicParser.ts`：

```typescript
class NewStrategy implements MusicSourceStrategy {
  name = 'new';
  priority = 5;
  canHandle(sources: string[]) { return sources.includes('new'); }
  async parse(id: number, data: any): Promise<ParsedMusicResult> {
    // 实现解析逻辑
  }
}

// 在 ParserManager 构造函数中注册
this.strategies.push(new NewStrategy());
```

## 平台相关说明

### Web 端开发

运行 `npm run dev:web` 需要：
1. 自建 `netease-cloud-music-api` 服务
2. 在项目根目录创建 `.env.development.local`：
   ```env
   VITE_API=https://your-api-server.com
   VITE_API_MUSIC=https://your-unblock-server.com
   ```

### Electron 功能

- **窗口管理**: `src/main/modules/window.ts`（主窗口、迷你模式、歌词窗口）
- **系统托盘**: `src/main/modules/tray.ts`
- **全局快捷键**: `src/main/modules/shortcuts.ts`
- **自动更新**: `src/main/modules/update.ts`（electron-updater + GitHub Releases）
- **远程控制**: `src/main/modules/remoteControl.ts`（HTTP API 远程播放控制）
- **磁盘缓存**: 音乐和歌词文件缓存，支持可配置目录、容量上限、LRU/FIFO 清理策略

## API 请求注意事项

- **axios 响应结构**：`request.get('/xxx')` 返回 axios response，实际数据在 `res.data` 中。若 API 本身也有 `data` 字段（如 `/personal_fm` 返回 `{data: [...], code: 200}`），则需要 `res.data.data` 才能拿到真正的数组，**不要** 直接用 `res.data` 当结果。
- **避免并发请求风暴**：首页不要一次性并发请求大量接口（如 15 个歌单详情），会导致本地 API 服务与 `music.163.com` 的 TLS 连接被 reset（502）。应使用懒加载（hover 时加载）或严格限制并发数。
- **timestamp 参数**：对 `/personal_fm` 等需要实时数据的接口，传 `timestamp: Date.now()` 避免服务端缓存和 stale 连接。`request.ts` 拦截器已自动添加 timestamp，API 层无需重复添加。

### 本地 API 服务调试

- **地址**：`http://127.0.0.1:{port}`，默认端口 `30488`，可在设置中修改
- **API 文档**：基于 [NeteaseCloudMusicApi](https://www.npmjs.com/package/NeteaseCloudMusicApi)（v4.29），接口文档参见  node_modules/NeteaseCloudMusicApi/public/docs/home.md
- **调试方式**：可直接用 `curl` 测试接口，例如：
  ```bash
  # 测试私人FM（需登录 cookie）
  curl "http://127.0.0.1:30488/personal_fm?timestamp=$(date +%s000)"
  # 测试歌单详情
  curl "http://127.0.0.1:30488/playlist/detail?id=12449928929"
  # 测试FM不喜欢
  curl -X POST "http://127.0.0.1:30488/fm_trash?id=歌曲ID&timestamp=$(date +%s000)"
  ```
- **502 排查**：通常是并发请求过多导致 TLS 连接 reset，用 curl 单独调用可验证接口本身是否正常
- **Cookie 传递**：渲染进程通过 `request.ts` 拦截器自动附加 `localStorage` 中的 token

## 重要注意事项

- **主分支**: `dev_electron`（PR 目标分支，非 `main`）
- **自动导入**: naive-ui 组件、Vue 组合式 API（`ref`、`computed` 等）均已自动导入
- **代码风格**: 使用 ESLint + Prettier，通过 husky + lint-staged 在 commit 时自动执行
- **国际化**: 所有面向用户的文字必须翻译为 5 种语言
- **提交规范**: commit message 中禁止包含 `Co-Authored-By` 信息
- **IndexedDB 存储**:
  - `music`: 歌曲元数据缓存
  - `music_lyric`: 歌词缓存
  - `api_cache`: 通用 API 响应缓存
  - `music_url_cache`: 音乐 URL 缓存（30 分钟 TTL）
