# 更新日志

## v4.6.0
> 如果更新遇到问题，请前往 <a href="http://donate.alger.fun/download" target="_blank">下载 AlgerMusicPlayer</a>

> 请我喝咖啡(支持作者) ☕️ <a href="http://donate.alger.fun/donate" target="_blank" style="color: red; font-weight: bold;">赏你</a>

> 帮我点个 star <a href="https://github.com/algerkong/AlgerMusicPlayer" target="_blank">github star</a>

> QQ群 976962720

### ✨ 新功能
- 增加音源重新解析功能 ([82a69d0](https://github.com/algerkong/AlgerMusicPlayer/commit/82a69d0))
- 搜索列表添加下一首播放功能，修改播放逻辑搜索的歌曲点击播放不重新覆盖播放列表，添加全部播放功能 ([31640bb](https://github.com/algerkong/AlgerMusicPlayer/commit/31640bb)) (#216)
- 增加windows和linux对arm64架构的支持([9f125f8](https://github.com/algerkong/AlgerMusicPlayer/commit/9f125f8))
- 添加"收藏"功能至托盘菜单 ([3c1a144](https://github.com/algerkong/AlgerMusicPlayer/commit/3c1a144))
- 修改将歌单列表改为页面 ([e2527c3](https://github.com/algerkong/AlgerMusicPlayer/commit/e2527c3))

### 🐛 Bug 修复
- 修复歌曲加入歌单失败问题 ([8045034](https://github.com/algerkong/AlgerMusicPlayer/commit/8045034))

### 🎨 优化
- 优化播放器逻辑，改进播放失败处理，支持保持当前索引并增加重试机制，优化操作锁逻辑，添加超时检查机制，确保操作锁在超时后自动释放，增加超时处理([8ed13d4](https://github.com/algerkong/AlgerMusicPlayer/commit/8ed13d4))、([cb58abb](https://github.com/algerkong/AlgerMusicPlayer/commit/cb58abb)) ([9cc064c](https://github.com/algerkong/AlgerMusicPlayer/commit/9cc064c))
- 更新 Electron 版本至 36.2.0，优化歌词视图的悬停效果 ([44f9709](https://github.com/algerkong/AlgerMusicPlayer/commit/44f9709))
- 更新音乐源设置([618c345](https://github.com/algerkong/AlgerMusicPlayer/commit/618c345))
- 修改 MiniPlayBar 组件，调整音量滑块的样式和交互方式，优化悬停效果 ([31ea3b7](https://github.com/algerkong/AlgerMusicPlayer/commit/31ea3b7))
- 优化 MvPlayer 组件的关闭逻辑，简化音频暂停处理 ([b3de2ae](https://github.com/algerkong/AlgerMusicPlayer/commit/b3de2ae))、([15f4ea4](https://github.com/algerkong/AlgerMusicPlayer/commit/15f4ea4))