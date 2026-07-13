# 待办 / 技术债

> 审查中**明确暂缓**的架构 / 工程项。勿与安全补丁混在同一 PR 硬做满。

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

### 7. High：核心代码几乎无自动化测试

- **现状：** 大量 Vue/TS 源码，测试文件为 0；CI（`.github/workflows/pr-check.yml`）仅 lint / build / typecheck。
- **风险：** 播放竞态、缓存迁移、Range、路径校验、下载恢复、恶意 IPC 等只能靠人工回归。
- **建议方向（分阶段）：**
  1. 接入 vitest（或 node:test），CI 增加 `npm test`
  2. 先补领域单测：`pathGuard`、`urlGuard`、音源错误转换、恶意 IPC payload
  3. 再补主进程集成：播放快速切歌、持久化迁移、下载暂停恢复
- **原因暂缓：** 从 0 搭体系工作量大，不宜与安全补丁同 PR 一次做满；优先安全合入后再开测试工程。
- **状态：** 暂缓

### 8. High：持久化无统一所有权、schema version 与事务语义

- **现状：** 状态散落于 Pinia persisted state、手写 localStorage、多个 electron-store、IndexedDB；存在一次性删旧 key、minify、手工 serializer、设置双写等。
- **建议方向：**
  - `PersistenceService` + 版本化 schema
  - 每个 store 声明 owner、版本、迁移函数
  - 认证 / 配置 / 播放恢复 / 历史分库存储
  - 禁止业务组件直接写 localStorage
- **原因暂缓：** 架构债，非当前安全主链；全量统一成本高，宜独立工程。
- **状态：** 暂缓

## 后续可选（未排期）

- 问题 1 的 D：`sandbox` / `webSecurity` / 严格 CSP（需单独回归本地音频与 `local://`）
- 问题 2 的加强：opaque file token 替代路径白名单
- 问题 7 小步：仅 `pathGuard` / `urlGuard` 单测 + CI
- 安全 PR 合入 `ui/polish-draft` / `main` 的发布策略
