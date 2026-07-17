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

| 阶段                | 状态   | 说明                                     |
| ------------------- | ------ | ---------------------------------------- |
| P0 门禁             | 进行中 | `bun scripts/check_song_field_reads.ts`  |
| P1 PlayableView     | 进行中 | `toPlayableView` / `trackToPlayableView` |
| P2 Store 内部分层   | 待做   | 兼容 getter 仍吐 SongResult              |
| P3 列表改结构       | 待做   | `PlayableTrack[]` 或 id 字典             |
| P4 UI 脱 SongResult | 待做   | 组件 props 改 Track/View                 |
| P5 持久化 v2        | 待做   | MinifiedTrack                            |
| P6 删 ar/al/dt      | 待做   | 类型与 normalize 镜像逻辑                |

## 命令

```bash
bun scripts/check_song_field_reads.ts   # 或 npm run lint:song-fields
npm test
```

新代码若必须暂时读镜像字段：先走 `songFields`；实在不行再进脚本 `LEGACY_ALLOW`（只减不增）。
