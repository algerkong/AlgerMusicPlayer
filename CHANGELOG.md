# 更新日志

## v4.2.0

### ✨ 新功能
- 添加迷你播放器模式 （[0f55795](https://github.com/algerkong/AlgerMusicPlayer/commit/0f55795))
- 更新网易云音乐API版本，添加B站视频搜索功能和播放器组件 ([280fec1](https://github.com/algerkong/AlgerMusicPlayer/commit/280fec1))
- mac端添加状态栏 显示当前播放歌曲和操作按钮 ([374a7a8](https://github.com/algerkong/AlgerMusicPlayer/commit/374a7a8))
- 添加音频URL过期事件监听，自动重新获取B站和网易云音乐音频URL并恢复播放 ([ee6e9d4](https://github.com/algerkong/AlgerMusicPlayer/commit/ee6e9d4))
- 优化搜索功能，改进搜索历史管理和路由处理逻辑 ([477f8bb](https://github.com/algerkong/AlgerMusicPlayer/commit/477f8bb))
- 在播放列表中添加歌曲删除功能，优化播放列表管理逻辑 ([a5f694e](https://github.com/algerkong/AlgerMusicPlayer/commit/a5f694e)) (#94)
- 优化歌词窗口字体控制按钮样式 ([c5e50c9](https://github.com/algerkong/AlgerMusicPlayer/commit/c5e50c9))
- 优化首页banner加载逻辑 ([01ccad4](https://github.com/algerkong/AlgerMusicPlayer/commit/01ccad4))
- 优化歌手详情页面 由抽屉改为页面 ([dfb8f55](https://github.com/algerkong/AlgerMusicPlayer/commit/dfb8f55))
- 增加用户关注列表和关注用户详情页 可查看听歌排行和用户歌单 ([2924ad6](https://github.com/algerkong/AlgerMusicPlayer/commit/2924ad6))
- 优化进度条 鼠标悬停直接显示进度信息 ([9ce872e](https://github.com/algerkong/AlgerMusicPlayer/commit/9ce872e))
- 优化应用更新下载功能 可后台下载 弹出下载完成提示 不再自动关闭应用 ([23b2340](https://github.com/algerkong/AlgerMusicPlayer/commit/23b2340))

### 🐛 Bug 修复
- 修复进度条多次拖动和多次暂停播放引发的歌曲重复播放bug ([cfe197c](https://github.com/algerkong/AlgerMusicPlayer/commit/cfe197c)) (#104)
- 修复关闭按钮最小化 还在任务栏显示的bug ([e0d1305](https://github.com/algerkong/AlgerMusicPlayer/commit/e0d1305))
- 修复播放列表中歌曲删除时类型不匹配的问题 ([8d6d052](https://github.com/algerkong/AlgerMusicPlayer/commit/8d6d052))