# Hook / 组合式函数规范

> 本仓库的 hook 是 `src/renderer/hooks/` 下的 **Vue composable**，不是 React Hooks。

---

## 位置与命名

| 模式         | 用途              | 示例                                |
| ------------ | ----------------- | ----------------------------------- |
| `useX.ts`    | 标准 composable   | `useSongItem.ts`、`useDownload.ts`  |
| `*Hook.ts`   | 遗留 / 大体量模块 | `MusicHook.ts`、`IndexDBHook.ts`    |
| `utils/*.ts` | 无响应式工具      | `playerUtils.ts`、`appShortcuts.ts` |

新代码优先 **`use` + camelCase**。不要另起 `composables/` 运行时树（shadcn 配置里的 alias 仅工具用）。

---

## 放什么 / 不放什么

| 适合放 hooks                       | 不要塞进 hooks                    |
| ---------------------------------- | --------------------------------- |
| 多 SFC 共享的 UI 邻接响应式逻辑    | 全局状态 → `store/modules`        |
| 功能胶水（下载 + message + store） | 音频引擎 / URL 解析 → `services/` |
| 长列表渐进渲染等                   | IPC 定义 → preload `window.api`   |

---

## 标准形态

```ts
export function useSongItem(props: { item: SongResult; canRemove?: boolean }) {
  const { t } = useI18n();
  const playerStore = usePlayerStore();
  const { downloadMusic } = useDownload();

  const isPlaying = computed(() => playMusic.value.id === props.item.id);

  return { t, isPlaying, playMusicEvent, toggleFavorite };
}
```

SFC 按需解构（见 `BaseSongItem.vue`）。

---

## 清单（现状）

| 文件                                                      | 职责                                                  |
| --------------------------------------------------------- | ----------------------------------------------------- |
| `useSongItem.ts`                                          | 列表行：播放、收藏、不喜欢、菜单、时长                |
| `usePlayerHooks.ts`                                       | URL / 歌词 / 详情拉取（player 侧复用）                |
| `MusicHook.ts`                                            | 全局歌词时序与进度；须在 `App.vue` 调 `initMusicHook` |
| `useDownload.ts`                                          | 下载与歌词文件                                        |
| `useArtist.ts`                                            | 跳转歌手                                              |
| `usePlayMode` / `usePlaybackControl` / `useVolumeControl` | 播放条小组件逻辑                                      |
| `useProgressiveRender.ts`                                 | 长列表窗口化渲染                                      |
| `useLyricBackground` / `useScrollTitle` / `useZoom`       | 展示辅助                                              |
| `IndexDBHook.ts`                                          | IndexedDB，供 MusicHook 等缓存                        |

---

## MusicHook 注意点

1. stores 就绪后只初始化一次：`initMusicHook(playerStore)`（`App.vue`）
2. 不第二套音频管线；与 `audioService` 协作
3. 歌词时间轴 / 试听基线改动需测 seek 与试听

---

## 注释

中文、写约束与边界；禁止复述函数名。见 [quality-guidelines.md](./quality-guidelines.md)。

**文档语言**：中文。
