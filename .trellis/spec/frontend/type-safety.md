# 类型安全

> 渲染 / web 工程开启 TypeScript `strict`。模块边界写清类型。

---

## 工具

| 配置                 | 范围                                                        |
| -------------------- | ----------------------------------------------------------- |
| `tsconfig.web.json`  | 渲染 + shared + 部分 main 类型；`vue-tsc`                   |
| `tsconfig.node.json` | 主进程 / 构建脚本；`tsc`                                    |
| 路径                 | `@/*` → renderer，`@main/*`，`@i18n/*`                      |
| Vue                  | naive volar（遗留）、`auto-imports.d.ts`、`components.d.ts` |

```bash
npm run typecheck:web
npm run typecheck:node
npm run typecheck
```

---

## 类型放哪

| 种类                   | 位置                     | 示例                                        |
| ---------------------- | ------------------------ | ------------------------------------------- |
| 渲染 DTO / API 形      | `src/renderer/types/`    | `SongResult`、`playlist`、`user`            |
| 跨进程领域模型         | `src/shared/domain/`     | `Track`、`PlaybackRuntime`、`PlayableTrack` |
| Preload / `window.api` | `src/preload/index.d.ts` | `API`、`Window.api`                         |
| 仅主进程               | `src/main/types/`        | MPRIS 等                                    |
| 局部辅助               | 与 util/store 同文件     | `persistedSong` 内 `MinifiedSong`           |

导入常用 `@/types/music` 深路径。

---

## 领域模型方向（已确认）

**新代码用 `Track` + `PlaybackRuntime`（及 `PlayableTrack`）。`SongResult` 仅兼容旧代码。**

| 概念              | 装什么                                | 类比                 |
| ----------------- | ------------------------------------- | -------------------- |
| `Track`           | 曲目是什么（标题、歌手、封面、时长…） | 碟片标签             |
| `PlaybackRuntime` | 这次怎么播（URL、试听、歌词、取色…）  | 放入播放器后的会话态 |
| `SongResult`      | 旧 DTO，元数据与运行态混装            | 历史包袱             |

桥接：`utils/trackBridge.ts`、`shared/domain/trackAdapter.ts`。

### 规则

1. 新功能 / 新边界不要再给 `SongResult` 堆领域字段
2. URL、歌词、颜色等运行态放 `PlaybackRuntime`，不要写回 `Track`
3. 旧 UI 仍要 `SongResult` 时经 bridge 转换
4. 持久化仍 minify，勿把运行态当元数据存

---

## `window.api`

- 类型以 `preload/index.d.ts` 为准
- 渲染进程只调已声明方法
- 新增能力：主进程 handler → preload 白名单 → 更新 `index.d.ts`

---

## 实践

- 公共函数参数 / 返回值写类型；避免无约束 `any`
- 组件 props 用泛型 `defineProps<{…}>()`
- 外部 JSON 在边界校验或收窄，勿直接当领域对象

**文档语言**：中文。
