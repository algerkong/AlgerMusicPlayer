# 状态管理

> Pinia 是唯一的客户端状态层。引擎类逻辑放 services；组件保持薄。

---

## 栈

| 部件                                            | 作用                                    |
| ----------------------------------------------- | --------------------------------------- |
| `createPinia()` + `pinia-plugin-persistedstate` | 工厂 + 选择性持久化（`store/index.ts`） |
| `store.router = markRaw(router)`                | 各 store 可访问路由                     |
| `store/modules/*`                               | 一域一文件                              |
| barrel                                          | `store/index.ts` 导出 `useXStore`       |

---

## Store 一览

| Store                               | 文件                  | 职责                                              |
| ----------------------------------- | --------------------- | ------------------------------------------------- |
| `usePlayerStore`                    | `player.ts`           | **门面**：组合 core + playlist + favorite 给 UI   |
| `usePlayerCoreStore`                | `playerCore.ts`       | 当前曲、播放暂停、音量、速率、musicFull、输出设备 |
| `usePlaylistStore`                  | `playlist.ts`         | 队列、索引、playMode、乱序、上下首                |
| `useFavoriteStore`                  | `favorite.ts`         | 喜欢 / 不喜欢列表                                 |
| `useMusicStore`                     | `music.ts`            | 当前浏览列表上下文                                |
| `useSettingsStore`                  | `settings.ts`         | 主题（固定深色）、移动/迷你、setData、抽屉        |
| `useUserStore`                      | `user.ts`             | 登录展示缓存                                      |
| `useSearchStore`                    | `search.ts`           | 搜索关键词与结果                                  |
| `useDownloadStore`                  | `download.ts`         | 下载队列 + IPC 监听                               |
| `usePlayHistoryStore`               | `playHistory.ts`      | 本地播放历史                                      |
| `useLyricStore`                     | `lyric.ts`            | 歌词 UI 状态                                      |
| `useMenuStore` / `useNavTitleStore` | 对应模块              | 导航与顶栏标题                                    |
| `useRecommendStore`                 | `recommend.ts`        | 首页推荐                                          |
| playMode 工具                       | `playlistPlayMode.ts` | `PlayMode`、`normalizePlayMode`                   |

```ts
import { usePlayerStore } from '@/store';
// 或
import { usePlayerStore } from '@/store/modules/player';
```

---

## 写法

**Options store**（简单域仍用）：`state` + `actions`（如 `music.ts`）。

**Setup store**（复杂域推荐）：`ref` + 函数返回（如 `playerCore.ts`）。

---

## Services 边界

| 放 services                   | 放 store                           |
| ----------------------------- | ---------------------------------- |
| Howl / Web Audio 图、设备切换 | 可序列化 UI 状态                   |
| 播放编排、URL 解析、预加载    | 队列、当前曲、音量意图             |
| 落盘策略实现细节              | 「是否静音」「musicFull 是否打开」 |

入口：`audioService`、`playbackController`、`preloadService`、`persistenceService`、`eqService`。

---

## 持久化

- `pinia-plugin-persistedstate` + 部分自定义（历史、设置）
- 曲目列表 **minify**（`persistedSong`）：去掉大 lyric、base64 封面等
- 勿把运行态（URL、完整歌词）当元数据长期存

---

## 播放相关注意点

- `userPlayIntent`：用户是否想听；与实际 `isPlay` 区分（加载失败等）
- `musicFull`：大屏开关；底栏与 MusicFull 联动
- 封面色：`playMusic.backgroundColor` / `primaryColor` → 壳层 chrome

---

## 反模式

- 在 SFC 里直接 new 音频引擎
- store 里堆 DOM / Howl 实例
- 持久化未 minify 的整首 `SongResult`

**文档语言**：中文。
