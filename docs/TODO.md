# 待办 / 技术债

> 审查问题与后续架构项。安全 Critical 已在 `fix/security-xss-ipc`（PR）处理；下列为**明确暂缓**项，勿与安全补丁混在同一 PR。

## 已处理（安全，供对照）

| #   | 级别     | 摘要                               | 状态                                                                  |
| --- | -------- | ---------------------------------- | --------------------------------------------------------------------- |
| 1   | Critical | 渲染进程 XSS → 任意 IPC 升级       | 已修：去歌名 v-html、release notes DOMPurify、preload 业务 API 白名单 |
| 2   | Critical | `local://` / 文件 IPC 无路径根限制 | 已修：`pathGuard` + 删除须在 `downloadedSongs`                        |
| 3   | Critical | 凭据明文 + 任意 key 读 store       | 已修：safeStorage session、settings 字段级 IPC、清 localStorage token |

## 暂缓

### 4. High：SongResult 是兼容 DTO，不是领域模型

- **位置：** `src/renderer/types/music.ts`（`SongResult`）
- **问题：** 同时混有音源 DTO、播放运行态（`playMusicUrl` / `playLoading`）、歌词、UI 颜色、缓存时间、试听/下载等；`song`/`program: any`；`ar`/`artists`、`al`/`album`、`duration`/`dt` 重复。
- **建议方向：**
  - 稳定领域类型：`Track`、`ArtistRef`、`AlbumRef`、`PlaybackSource`、`TrackMetadata`
  - 音源 DTO 仅在 adapter 层转换一次（已有 `mapMsSongToSongResult` 可演进）
  - 播放 URL、loading、背景色等运行态**不得**写回 `Track`
- **原因暂缓：** 非安全漏洞；改动面覆盖播放器 / 列表 / 下载 / 歌词，宜独立重构分支，分阶段迁移。
- **状态：** 暂缓

### 5. High：播放器多状态所有者与循环依赖

- **位置：** `player` facade、`playerCore`、`playlist`、`MusicHook`、`playbackController`、`audioService` 等
- **问题：**
  - 多处均可修改播放状态，缺少单一协调者
  - `playbackController.ts` 用动态 `import()` 规避与 store 的循环依赖
  - 生产构建易出现「动态与静态同时导入」类警告
- **建议方向：**
  - 唯一 `PlaybackCoordinator`：组件只发 command，Pinia 只持可观察状态
  - 音频事件经 coordinator 转为 state transition
  - 移除 `MusicHook` 模块级单例与 store 间反向调用
  - 理顺依赖方向后去掉为循环依赖而设的动态 import
- **原因暂缓：** 非安全漏洞；等于重写播放控制中枢，回归成本高；勿并入安全 PR。
- **状态：** 暂缓

## 后续可选（未排期）

- 问题 1 的 D：`sandbox` / `webSecurity` / 严格 CSP（需单独回归本地音频与 `local://`）
- 问题 2 的加强：opaque file token 替代路径白名单
- 安全 PR 合入 `ui/polish-draft` / `main` 的发布策略
