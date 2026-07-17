# LYMusic

桌面端音乐播放器。基于 [AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer) 的个人维护版，品牌与音源路径已独立。

|      |                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------- |
| 产品 | **LYMusic**（包名 `LYMusicPlayer`，appId `com.luoye.music`）                                   |
| 作者 | [落叶 @LuoYe17](https://github.com/LuoYe17)                                                    |
| 仓库 | https://github.com/LuoYe17/AlgerMusicPlayer                                                    |
| 版本 | [Releases](https://github.com/LuoYe17/AlgerMusicPlayer/releases) · [CHANGELOG](./CHANGELOG.md) |
| 许可 | MIT                                                                                            |

> **开发中。** 功能、界面和数据结构可能随时调整。重要数据请自行备份。

---

## 它是什么

Electron 壳 + Vue 3 界面。在线听歌走主进程里的 [`ly-music-source`](https://github.com/LuoYe17/ly-music-source)，当前对接 **汽水音乐**（搜歌、解析、发现流、用户歌单等）。

关于页的定位也写得很直白：简洁桌面播放器，支持汽水在线搜播；开源免费，请支持正版。

**不是**汽水官方客户端，与字节跳动 / 汽水音乐无隶属关系。登录与使用风险见应用内登录说明。

---

## 主要能力

| 方向       | 内容                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| 发现与浏览 | 竖滑推荐流（封面 / 歌词）、搜索、歌手 / 歌单列表                                                         |
| 账号       | 汽水扫码登录（可短信二次验证）；登录态本机加密，不落盘明文                                               |
| 曲库侧     | 收藏、播放历史、用户歌单增删改、下载管理                                                                 |
| 播放       | 播放列表与模式、全屏播放页、六档音质（含会员门控）、EQ / 音效预设、输出设备                              |
| 性能向     | 双槽预加载、低码率起播后升质、下一首预加载、磁盘音乐/歌词缓存                                            |
| 桌面集成   | 托盘与媒体控制、全局/应用内快捷键（内置默认，无设置页）、Linux MPRIS、Windows 任务栏按钮、打包后自动更新 |
| 形态       | 桌面主界面；另有迷你窗与偏移动端布局；可用 `dev:web` 只跑渲染进程                                        |

界面语言目前只有 **简体中文**。

### 相对上游的取舍

- 去掉捐赠 / 赞赏
- 主音源改为汽水 + `ly-music-source`，不再以网易云 API 为主路径
- 精简多语言、快捷键自定义等周边能力，优先「能听、好切、好刷」

---

## 技术栈（简）

| 层   | 选型                                                              |
| ---- | ----------------------------------------------------------------- |
| 桌面 | Electron 43 · electron-vite · electron-builder · electron-updater |
| 界面 | Vue 3 · Pinia · Vue Router · Naive UI · shadcn-vue · Tailwind     |
| 音源 | `ly-music-source`（主进程；渲染进程经 IPC）                       |
| 音频 | HTMLAudio 双槽 + Web Audio（EQ 等）                               |
| 工程 | TypeScript · Vitest · Oxlint · Prettier · Husky / commitlint      |

源码大致分层：`src/main` 主进程，`src/preload` 桥，`src/renderer` 界面，`src/shared` 共享类型与协议约定。

---

## 快速开始

需要 **Node.js LTS** 与 npm。

```bash
npm install
npm run dev
```

| 命令                  | 用途                                       |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Electron 开发                              |
| `npm run dev:web`     | 仅渲染进程（浏览器调试；无主进程音源能力） |
| `npm run build`       | 编译 main / preload / renderer             |
| `npm run build:win`   | Windows 安装包（NSIS，x64 / arm64）        |
| `npm run build:linux` | Linux 包（AppImage / deb / rpm）           |
| `npm test`            | 单元测试                                   |
| `npm run typecheck`   | 类型检查                                   |
| `npm run lint`        | Oxlint + i18n 键检查                       |

打 tag `v*` 会走 GitHub Actions 构建 Windows / Linux 产物；Release 说明从 `CHANGELOG.md` 对应 `## [vX.Y.Z]` 段抽取。

Linux 沙箱相关若启动失败，可先看 `npm run fix-sandbox`。

---

## 使用注意

1. **登录与合规**  
   扫码登录前应用内有风险说明：非官方接入、账号风险自负；登录态仅保存在本机，勿分享二维码或 Cookie。

2. **会员与音质**  
   高码率 / 无损等受汽水侧会员与曲目可用档限制；应用会做门控与回落，不会凭空「解锁」官方未授权能力。

3. **缓存与下载**  
   设置页可改下载目录与磁盘缓存目录；默认缓存策略与上限由应用内部控制（界面主要展示用量与清理入口）。

4. **Web 模式**  
   `dev:web` / 纯静态部署**没有**主进程音源 IPC，完整听歌以 Electron 包为准。

---

## 声明

- 仅供学习与个人交流，**禁止用于商业用途**。请支持官方正版（如 [汽水音乐](https://music.douyin.com/)）。
- 上游版权与贡献归 [algerkong/AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer) 及其贡献者。
- 本仓库改动由维护者负责，不保证与上游功能一一对应或持续兼容。
