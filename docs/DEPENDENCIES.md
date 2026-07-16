# LYMusicPlayer 项目依赖清单

> 最近更新：2026-07-16 · 项目 5.1.0  
> **每完成一批依赖升级必须同步更新本文件。**

## 说明

- 直接依赖清单；排除自研 `ly-music-source`。
- 目标平台：Linux / Windows（x64、arm64）。不支持 macOS、Win ia32。
- Linter：**Oxlint**（`.oxlintrc.json`）；格式化：Prettier。

## 升级记录

| 日期       | 分支/范围                                    | 变更摘要                                                |
| ---------- | -------------------------------------------- | ------------------------------------------------------- |
| 2026-07-16 | `chore/upgrade-electron` → `ui/polish-draft` | `electron` **40.10.6 → 43.1.1**；去掉 macOS 与 Win ia32 |
| 2026-07-16 | `chore/upgrade-deps` → `ui/polish-draft`     | 其余依赖批量升级 + ESLint→Oxlint                        |
| 2026-07-16 | 文档                                         | 核对 npm latest：仅 4 包未对齐（见下「未对齐 latest」） |

## 未对齐 latest（2026-07-16 对照 npm）

对照 `package.json` 声明与 npm **latest**。其余直接依赖已对齐最新；自研 `ly-music-source` 不参与。

| 包            | 当前声明  | 当前锁定（约） | npm latest | 类别           | 原因 / 何时可升                                                              |
| ------------- | --------- | -------------- | ---------- | -------------- | ---------------------------------------------------------------------------- |
| `typescript`  | `^5.9.3`  | 5.9.3          | **7.0.2**  | **硬天花板**   | `vue-tsc` 尚不兼容 TS 7；等 vue-tsc 支持后再动                               |
| `vite`        | `^7.3.6`  | 7.3.6          | **8.1.5**  | **硬天花板**   | `electron-vite@5` 上限 Vite 7；等 electron-vite 支持 Vite 8                  |
| `tailwindcss` | `^3.4.19` | 3.4.19         | **4.3.3**  | **需专项迁移** | v4 配置/插件/语法不兼容；独立分支迁移，勿顺手升                              |
| `@types/node` | `^24.0.0` | 24.13.3        | **26.1.1** | **可升**       | 类型包，无运行时影响；可升 26.x 或至少钉 24 最新；与本机 Node 大版本对齐更稳 |

### 建议升级顺序

1. **低风险**：`@types/node` → 26（或 `^24` 锁到 24 最新）
2. **大工程**：Tailwind 4（单独分支 + 全站样式回归）
3. **等上游**：`electron-vite` 支持 Vite 8、`vue-tsc` 支持 TS 7 后再动 Vite / TypeScript

### 勿在常规依赖升级里顺手升

- 不要把 `typescript` 调到 6/7、`vite` 调到 8、`tailwindcss` 调到 4，除非对应专项任务已验收。

## 统计

| 类型                 | 数量   |
| -------------------- | ------ |
| dependencies         | 25     |
| devDependencies      | 44     |
| optionalDependencies | 2      |
| **合计**             | **71** |

## 生产依赖

| 包名                          | 声明版本   | 锁定版本  | 用途                             |
| ----------------------------- | ---------- | --------- | -------------------------------- |
| `@electron-toolkit/preload`   | `^3.0.2`   | `3.0.2`   | Electron preload 工具集          |
| `@electron-toolkit/utils`     | `^4.0.0`   | `4.0.0`   | Electron 主进程工具函数          |
| `@httptoolkit/dbus-native`    | `^0.1.5`   | `0.1.5`   | D-Bus 原生绑定（Linux MPRIS 等） |
| `@lucide/vue`                 | `^1.24.0`  | `1.24.0`  | Lucide 图标库 Vue 封装           |
| `class-variance-authority`    | `^0.7.1`   | `0.7.1`   | 组件 variant 类名工具（CVA）     |
| `clsx`                        | `^2.1.1`   | `2.1.1`   | 条件 className 拼接              |
| `dompurify`                   | `^3.4.12`  | `3.4.12`  | HTML XSS 净化                    |
| `electron-store`              | `^11.0.2`  | `11.0.2`  | Electron 持久化配置存储          |
| `electron-updater`            | `^6.8.9`   | `6.8.9`   | 应用自动更新                     |
| `electron-window-state`       | `^5.0.3`   | `5.0.3`   | 窗口尺寸/位置记忆                |
| `file-type`                   | `^22.0.1`  | `22.0.1`  | 文件 MIME/类型检测               |
| `flac-tagger`                 | `^2.0.0`   | `2.0.0`   | FLAC 音频标签读写                |
| `font-list`                   | `^2.1.0`   | `2.1.0`   | 系统字体列表                     |
| `form-data`                   | `^4.0.6`   | `4.0.6`   | multipart/form-data 构造         |
| `husky`                       | `^9.1.7`   | `9.1.7`   | Git hooks 管理                   |
| `mpris-service`               | `^2.1.2`   | `2.1.2`   | Linux MPRIS 媒体控制服务         |
| `music-metadata`              | `^11.14.0` | `11.14.0` | 音频元数据解析                   |
| `node-id3`                    | `^0.2.9`   | `0.2.9`   | MP3 ID3 标签读写                 |
| `node-machine-id`             | `^1.1.12`  | `1.1.12`  | 设备唯一机器码                   |
| `pinia-plugin-persistedstate` | `^4.7.1`   | `4.7.1`   | Pinia 状态持久化插件             |
| `reka-ui`                     | `^2.10.1`  | `2.10.1`  | 无样式 UI 组件原语               |
| `shadcn-vue`                  | `^2.8.0`   | `2.8.0`   | shadcn 风格 Vue 组件脚手架       |
| `tailwind-merge`              | `^3.6.0`   | `3.6.0`   | 合并 Tailwind class 冲突         |
| `tw-animate-css`              | `^1.4.0`   | `1.4.0`   | Tailwind 动画 CSS                |
| `vue-i18n`                    | `^11.4.6`  | `11.4.6`  | Vue 国际化                       |

## 开发依赖

| 包名                              | 声明版本   | 锁定版本  | 用途                           |
| --------------------------------- | ---------- | --------- | ------------------------------ |
| `@commitlint/cli`                 | `^21.2.1`  | `21.2.1`  | Commit message lint CLI        |
| `@commitlint/config-conventional` | `^21.2.0`  | `21.2.0`  | Conventional Commits 规则      |
| `@electron-toolkit/tsconfig`      | `^2.0.0`   | `2.0.0`   | Electron Toolkit TSConfig 预设 |
| `@types/howler`                   | `^2.2.13`  | `2.2.13`  | howler TypeScript 类型         |
| `@types/node`                     | `^24.0.0`  | `24.13.3` | Node.js TypeScript 类型        |
| `@types/tinycolor2`               | `^1.4.6`   | `1.4.6`   | tinycolor2 TypeScript 类型     |
| `@vitejs/plugin-vue`              | `^6.0.8`   | `6.0.8`   | Vite Vue SFC 插件              |
| `@vue/compiler-sfc`               | `^3.5.40`  | `3.5.40`  | Vue SFC 编译器                 |
| `@vue/runtime-core`               | `^3.5.40`  | `3.5.40`  | Vue 运行时核心                 |
| `@vueuse/core`                    | `^14.3.0`  | `14.3.0`  | Vue 组合式工具函数集           |
| `@vueuse/electron`                | `^14.3.0`  | `14.3.0`  | VueUse Electron 集成           |
| `animate.css`                     | `^4.1.1`   | `4.1.1`   | CSS 动画库                     |
| `autoprefixer`                    | `^10.5.4`  | `10.5.4`  | CSS 浏览器前缀                 |
| `axios`                           | `^1.18.1`  | `1.18.1`  | HTTP 请求库                    |
| `cross-env`                       | `^10.1.0`  | `10.1.0`  | 跨平台环境变量                 |
| `electron`                        | `^43.1.1`  | `43.1.1`  | Electron 桌面运行时            |
| `electron-builder`                | `^26.15.3` | `26.15.3` | Electron 打包                  |
| `electron-vite`                   | `^5.0.0`   | `5.0.0`   | Electron + Vite 构建           |
| `happy-dom`                       | `^20.10.6` | `20.10.6` | 测试用 DOM                     |
| `howler`                          | `^2.2.4`   | `2.2.4`   | Web Audio 播放                 |
| `lint-staged`                     | `^17.0.8`  | `17.0.8`  | 暂存文件 lint                  |
| `lodash`                          | `^4.18.1`  | `4.18.1`  | 工具函数库                     |
| `marked`                          | `^18.0.6`  | `18.0.6`  | Markdown 解析                  |
| `naive-ui`                        | `^2.44.1`  | `2.44.1`  | Vue 3 UI 库                    |
| `oxlint`                          | `^1.74.0`  | `1.74.0`  | Oxlint（ESLint 替代）          |
| `pinia`                           | `^4.0.2`   | `4.0.2`   | Vue 状态管理                   |
| `pinyin-match`                    | `^1.2.10`  | `1.2.10`  | 拼音匹配                       |
| `postcss`                         | `^8.5.19`  | `8.5.19`  | CSS 后处理                     |
| `prettier`                        | `^3.9.5`   | `3.9.5`   | 代码格式化                     |
| `remixicon`                       | `^4.9.1`   | `4.9.1`   | 图标字体                       |
| `sass`                            | `^1.101.0` | `1.101.0` | Sass 预处理器                  |
| `tailwindcss`                     | `^3.4.19`  | `3.4.19`  | 原子化 CSS                     |
| `tinycolor2`                      | `^1.6.0`   | `1.6.0`   | 颜色处理                       |
| `tunajs`                          | `^1.1.3`   | `1.1.3`   | Web Audio 音效                 |
| `typescript`                      | `^5.9.3`   | `5.9.3`   | TypeScript 编译器              |
| `unplugin-auto-import`            | `^21.0.0`  | `21.0.0`  | 自动导入                       |
| `unplugin-vue-components`         | `^32.1.0`  | `32.1.0`  | 自动组件                       |
| `vite`                            | `^7.3.6`   | `7.3.6`   | 前端构建                       |
| `vite-plugin-compression`         | `^0.5.1`   | `0.5.1`   | 构建压缩                       |
| `vite-plugin-vue-devtools`        | `8.1.5`    | `8.1.5`   | Vue DevTools 插件              |
| `vitest`                          | `^4.1.10`  | `4.1.10`  | 单元测试                       |
| `vue`                             | `^3.5.40`  | `3.5.40`  | Vue 3                          |
| `vue-router`                      | `^5.2.0`   | `5.2.0`   | Vue 路由                       |
| `vue-tsc`                         | `^3.3.7`   | `3.3.7`   | Vue TS 检查                    |

## 可选依赖

| 包名   | 声明版本 | 锁定版本 | 用途             |
| ------ | -------- | -------- | ---------------- |
| `jsbi` | `^4.3.2` | `4.3.2`  | 大整数（可选）   |
| `x11`  | `^2.3.0` | `2.3.0`  | X11 绑定（可选） |

## 自研排除

| 包                | 说明                      |
| ----------------- | ------------------------- |
| `ly-music-source` | `file:../ly-music-source` |
