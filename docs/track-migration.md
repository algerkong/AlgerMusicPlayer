# Track 迁移（SongResult 半迁移收尾）

## 原则

| 原则             | 内容                                                            |
| ---------------- | --------------------------------------------------------------- |
| 元数据           | `Track`（`src/shared/domain/track.ts`）                         |
| 会话态           | `PlaybackRuntime`（URL / lyric / loading…）勿写回 Track         |
| 换曲             | 只经 `playbackCoordinator`                                      |
| id 比较          | 只经 `sameTrackId` / `trackIdKey`                               |
| 读艺人/时长/封面 | `songFields` 或 `toPlayableView`（`ar`/`al`/`dt` 已从类型删除） |

## SongResult 字段（P6）

| 规范侧     | 说明    |
| ---------- | ------- |
| `artists`  | 艺人    |
| `album`    | 专辑    |
| `duration` | 时长 ms |

落盘 v1 仍可由 `inflateSong` 读入并转成规范字段。

## 阶段

| 阶段                | 状态 | 说明                                                                                         |
| ------------------- | ---- | -------------------------------------------------------------------------------------------- |
| P0 门禁             | ✅   | `npm run lint:song-fields`                                                                   |
| P1 PlayableView     | ✅   | `toPlayableView` / `trackToPlayableView`                                                     |
| P2 Store 内部分层   | ✅   | `currentTrack` / `currentRuntime` + `setCurrentSong` / `patchCurrentSong`；壳仍为 SongResult |
| P3 列表改结构       | ✅   | `playablePlayList` 镜像 + commit/replace API；壳仍 `SongResult[]`                            |
| P4 UI 脱 SongResult | ✅   | 歌单项/播放条展示走 PlayableView；props 仍 SongResult（动作/raw）                            |
| P5 持久化 v2        | ✅   | `MinifiedSong` v2（Track 字段）+ inflate v1/v2；playlist/playerCore/history deserialize 升级 |
| P6 删 ar/al/dt      | ✅   | `SongResult` 仅 artists/album/duration；inflate 仍可吃 v1 落盘                               |

### P2 写口（playerCore / player store）

| API                               | 用途                     |
| --------------------------------- | ------------------------ |
| `setCurrentSong(song \| null)`    | 整曲替换（换曲 / 清空）  |
| `setCurrentPlayable(playable)`    | 领域 PlayableTrack 写入  |
| `patchCurrentSong(patch)`         | 歌词/色/loading/URL 补丁 |
| `currentTrack` / `currentRuntime` | 只读投影（从壳推导）     |

优先 `patchCurrentSong`，少写 `playMusic.xxx =`。

### P3 列表写口（playlist store）

| API                                   | 用途                     |
| ------------------------------------- | ------------------------ |
| `playablePlayList` / `playListTracks` | 领域镜像 / Track[] 投影  |
| `currentPlayableItem`                 | 当前索引的 PlayableTrack |
| `setPlayListFromPlayables`            | 从领域列表写入           |
| `replaceEntryAt` / `patchSongMeta`    | 单条替换与运行态补丁     |

持久化仍只存 SongResult 壳；启动 `initializePlaylist` 重建镜像。

## 命令

```bash
bun scripts/check_song_field_reads.ts   # 或 npm run lint:song-fields
npm test
```

新代码若必须暂时读镜像字段：先走 `songFields`；实在不行再进脚本 `LEGACY_ALLOW`（只减不增）。
