<h2 align="center">🎵 LYMusic</h2>

<div align="center">

  <a href="https://github.com/LuoYe17/AlgerMusicPlayer">
    <img src="https://img.shields.io/badge/GitHub-LuoYe17-blue?style=for-the-badge&logo=github" alt="GitHub">
  </a>
  <a href="https://github.com/LuoYe17/AlgerMusicPlayer/releases">
    <img src="https://img.shields.io/github/v/release/LuoYe17/AlgerMusicPlayer?style=for-the-badge&logo=github&label=Release" alt="GitHub release">
  </a>

</div>

## 项目简介

**LYMusic**（包名 `LYMusicPlayer`）是基于 [AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer) 的个人魔改版桌面音乐播放器。

|          |                                                                                  |
| -------- | -------------------------------------------------------------------------------- |
| 作者     | 落叶🍂 ([@LuoYe17](https://github.com/LuoYe17))                                  |
| 仓库     | https://github.com/LuoYe17/AlgerMusicPlayer                                      |
| 技术栈   | Electron · Vue 3 · TypeScript · Pinia · naive-ui · Tailwind                      |
| 在线音源 | [`ly-music-source`](https://www.npmjs.com/package/ly-music-source)（主进程接入） |

### 主要能力

- 在线搜索与播放（经 `ly-music-source` IPC）
- 播放列表、收藏、历史与热力图等本地体验
- 桌面歌词、系统托盘、全局快捷键
- 下载管理、均衡器 / 音效、远程控制相关能力
- 多语言：简体中文、繁体中文、English、日本語、한국어
- Windows / macOS / Linux 打包与自动更新（GitHub Releases）

## 与上游的差异（持续更新）

- 去除捐赠 / 赞赏相关入口与资源
- 品牌与打包元数据切换为 LYMusic / `com.luoye.music`
- 发布与更新源指向本仓库
- 网易云官方 API 栈已移除；在线能力迁移至 `ly-music-source`
- 本地音乐库扫描功能已移除（当前以在线音源为主）

## 快速开始

要求：**Node.js 18+**（CI 使用 Node 24）。

```bash
npm install
npm run dev          # Electron 桌面开发
# npm run dev:web    # 仅网页端（无主进程时在线音源不可用）
```

常用检查：

```bash
npm run lint
npm run typecheck
npm run build
```

打包示例：

```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

产物目录：桌面安装包在 `dist/`，渲染构建在 `out/`。

## 文档

| 文档                           | 内容                                                               |
| ------------------------------ | ------------------------------------------------------------------ |
| [DEV.md](./DEV.md)             | 目录结构、模块说明、开发约定、打包细节                             |
| [AGENTS.md](./AGENTS.md)       | 贡献与 AI 代理指南；**GitHub Flow**（多分支、小 PR、主分支可发布） |
| [docs/](./docs/)               | 文档索引与流程速查                                                 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日志                                                       |

## 协作方式（摘要）

本仓库使用 **GitHub Flow**：

1. 从最新 `main` 开短生命周期分支（可多开并行）
2. Conventional Commits 小步提交
3. 尽早提 PR，CI 必须通过
4. 合并后删除分支，保持 `main` 始终可发布

完整约定见 [AGENTS.md](./AGENTS.md) 与 [docs/github-flow.md](./docs/github-flow.md)。

## 声明

本软件仅用于学习交流，禁止用于商业用途，否则后果自负。  
请多多支持官方正版音乐服务。

上游原项目版权与贡献归 [algerkong/AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer) 及其贡献者所有。
