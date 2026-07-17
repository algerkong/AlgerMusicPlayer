# 更新日志

记录 **LYMusic** 对外可见的变更。  
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

发版流水线会按 `## [vX.Y.Z]` 从本文件抽取对应段落作为 Release 说明。

## [未发布]

（发版前在此累积，归入版本号时再拆「新增 / 修复 / 变更 / 移除」。）

## [v5.1.0]

LYMusic 独立维护基线（由 AlgerMusicPlayer 魔改而来）。

### 产品定位

- 品牌与打包：`LYMusic` / `LYMusicPlayer` / `com.luoye.music`
- 发布与自动更新源指向本仓库（GitHub Releases + electron-updater）
- 在线音源切换为 TypeScript 库 [`ly-music-source`](https://github.com/LuoYe17/ly-music-source)，当前对接 **汽水音乐**
- 界面语言仅保留简体中文

### 能力摘要

- 汽水扫码登录（含短信二次验证）；登录态本机加密存储（Electron `safeStorage`）
- 发现页竖滑推荐流（封面 / 歌词 / 音质与音效入口）
- 搜索、收藏、播放历史、用户歌单（含增删改）
- 播放链路：双槽预加载、低码率起播后无感升质、下一首预加载、磁盘音乐/歌词缓存
- 汽水六档音质与会员门控；播放条音质与输出设备
- 全屏播放页、EQ / 音效预设、下载管理
- 系统能力：托盘与媒体键、Linux MPRIS、Windows 任务栏缩略图按钮、应用内检查更新
- 构建目标：Windows（NSIS）与 Linux（AppImage / deb / rpm），x64 / arm64

### 相对上游的主要取舍

- 去掉捐赠 / 赞赏入口
- 不再以网易云 API 为主路径
- 精简多语言、快捷键自定义页等周边能力，优先核心播放体验

> 更早的上游变更历史见 [algerkong/AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer)。
