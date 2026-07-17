# Track 迁移（SongResult 半迁移收尾）

## 原则

| 原则             | 内容                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| 元数据           | `Track`（`src/shared/domain/track.ts`）                              |
| 会话态           | `PlaybackRuntime`（URL / lyric / loading…）勿写回 Track              |
| 换曲             | 只经 `playbackCoordinator`                                           |
| id 比较          | 只经 `sameTrackId` / `trackIdKey`                                    |
| 读艺人/时长/封面 | `songFields` 或 `toPlayableView`，**禁止**裸读 `song.ar` / `song.dt` |

## SongResult 双字段（过渡）

| 规范侧     | 镜像（@deprecated） |
| ---------- | ------------------- |
| `artists`  | `ar`                |
| `album`    | `al`                |
| `duration` | `dt`                |

入口写完后调用 `normalizeSongResult`（`trackBridge`），保证镜像一致。

## 阶段

| 阶段                | 状态 | 说明                                                                                         |
| ------------------- | ---- | -------------------------------------------------------------------------------------------- |
| P0 门禁             | ✅   | `npm run lint:song-fields`                                                                   |
| P1 PlayableView     | ✅   | `toPlayableView` / `trackToPlayableView`                                                     |
| P2 Store 内部分层   | ✅   | `currentTrack` / `currentRuntime` + `setCurrentSong` / `patchCurrentSong`；壳仍为 SongResult |
| P3 列表改结构       | 待做 | `PlayableTrack[]` 或 id 字典                                                                 |
| P4 UI 脱 SongResult | 待做 | 组件 props 改 Track/View                                                                     |
| P5 持久化 v2        | 待做 | MinifiedTrack                                                                                |
| P6 删 ar/al/dt      | 待做 | 类型与 normalize 镜像逻辑                                                                    |

### P2 写口（playerCore / player store）

| API                               | 用途                     |
| --------------------------------- | ------------------------ |
| `setCurrentSong(song \| null)`    | 整曲替换（换曲 / 清空）  |
| `setCurrentPlayable(playable)`    | 领域 PlayableTrack 写入  |
| `patchCurrentSong(patch)`         | 歌词/色/loading/URL 补丁 |
| `currentTrack` / `currentRuntime` | 只读投影（从壳推导）     |

优先 `patchCurrentSong`，少写 `playMusic.xxx =`。下一阶段 P3 把 `playList` 也改成可拆层结构。

## 命令

```bash
bun scripts/check_song_field_reads.ts   # 或 npm run lint:song-fields
npm test
```

新代码若必须暂时读镜像字段：先走 `songFields`；实在不行再进脚本 `LEGACY_ALLOW`（只减不增）。
