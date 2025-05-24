# 更新日志

## v4.7.0
> 如果更新遇到问题，请前往 <a href="http://donate.alger.fun/download" target="_blank">下载 AlgerMusicPlayer</a>

> 请我喝咖啡(支持作者) ☕️ <a href="http://donate.alger.fun/donate" target="_blank" style="color: red; font-weight: bold;">赏你</a>

> 帮我点个 star <a href="https://github.com/algerkong/AlgerMusicPlayer" target="_blank">github star</a>

> QQ频道 <a href="https://pd.qq.com/s/cs056n33q?b=5" target="_blank">加入频道</a>

### 4.7.1
- 修复下载歌曲时歌曲URL获取BUG，导致下载失败的问题

### ✨ 新功能
- 替换扁平风格图标 ([c8e6db1](https://github.com/algerkong/AlgerMusicPlayer/commit/c8e6db1))
- 添加双击歌曲播放功能 ([258828f](https://github.com/algerkong/AlgerMusicPlayer/commit/258828f))
- 添加排行榜页面 ([a8010c8](https://github.com/algerkong/AlgerMusicPlayer/commit/a8010c8))
- 添加播放速度控制功能 ([6554736](https://github.com/algerkong/AlgerMusicPlayer/commit/6554736)) (#241) [感谢Java-wyx的 PR](https://github.com/Java-wyx)
- 修改播放列表展示形式，添加清空播放列表功能 ([2e96161](https://github.com/algerkong/AlgerMusicPlayer/commit/2e96161))
- 歌单列表添加布局切换、播放全部、收藏、添加到播放列表功能 ([b32408b](https://github.com/algerkong/AlgerMusicPlayer/commit/b32408b))
- 优化播放栏，整合高级控制菜单([f5f0dbb](https://github.com/algerkong/AlgerMusicPlayer/commit/f5f0dbb))
- 添加顶部定时显示，定时器过期检查功能， ([2dd4535](https://github.com/algerkong/AlgerMusicPlayer/commit/2dd4535))，([170ac45](https://github.com/algerkong/AlgerMusicPlayer/commit/170ac45))
- 添加 mac 状态栏播放按键控制功能开关 ([2476fbd](https://github.com/algerkong/AlgerMusicPlayer/commit/2476fbd))
- 收藏列表添加升序降序排列 ([2803d40](https://github.com/algerkong/AlgerMusicPlayer/commit/2803d40))
- 为歌曲下拉菜单添加圆角样式，优化歌曲预览布局 ([5bef0e4](https://github.com/algerkong/AlgerMusicPlayer/commit/5bef0e4))
- 在用户歌单中添加"我创建的"标签，优化获取用户歌单的逻辑 ([d56a25e](https://github.com/algerkong/AlgerMusicPlayer/commit/d56a25e))
- 在歌手详情页添加歌曲操作工具栏，支持播放全部、添加到播放列表和搜索功能 ([6048e24](https://github.com/algerkong/AlgerMusicPlayer/commit/6048e24))
- 添加所有用户的关注和粉丝列表点击，优化播放排行获取和无权限展示 ([0c74291](https://github.com/algerkong/AlgerMusicPlayer/commit/0c74291))
- 添加 macOS 下点击 Dock 图标激活主窗口的功能 ([7fa0fa5](https://github.com/algerkong/AlgerMusicPlayer/commit/7fa0fa5))
- 添加鼠标滚轮调整音量功能，并显示音量百分比 ([95af222](https://github.com/algerkong/AlgerMusicPlayer/commit/95af222))
- 添加歌曲右键不喜欢功能以过滤每日推荐歌曲 ([a0935c7](https://github.com/algerkong/AlgerMusicPlayer/commit/a0935c7))
- 添加音乐平台链接，优化移动端样式 ([01a3a7a](https://github.com/algerkong/AlgerMusicPlayer/commit/01a3a7a))
- 在应用菜单中添加工具提示功能 ([5084da3](https://github.com/algerkong/AlgerMusicPlayer/commit/5084da3))

### 🐛 Bug 修复
- 修复播放音乐时 URL 未正确更新的问题 ([91b1ff7](https://github.com/algerkong/AlgerMusicPlayer/commit/91b1ff7))
- 修复播放状态判断逻辑 ([e9fe900](https://github.com/algerkong/AlgerMusicPlayer/commit/e9fe900))
- 修复收藏歌曲功能未同步问题 ([69b1e54](https://github.com/algerkong/AlgerMusicPlayer/commit/69b1e54))
- 优化下载列表显示 ([df5ecb6](https://github.com/algerkong/AlgerMusicPlayer/commit/df5ecb6))

### 🎨 优化
- 添加 husky 预提交和预推送钩子，运行类型检查以确保代码质量 ([a449b74](https://github.com/algerkong/AlgerMusicPlayer/commit/a449b74))
- 重构歌曲组件，添加基础组件和多种样式，优化播放列表抽屉功能 ([ad7b504](https://github.com/algerkong/AlgerMusicPlayer/commit/ad7b504))
- 将下载逻辑提取优化([ca51020](https://github.com/algerkong/AlgerMusicPlayer/commit/ca51020))
- 优化B站音频解析功能 ([e47c84e](https://github.com/algerkong/AlgerMusicPlayer/commit/e47c84e))
- 统一音源选项的标签格式 ([54cbb84](https://github.com/algerkong/AlgerMusicPlayer/commit/54cbb84))
- 移动端去除定时关闭功能 ([f7951ec](https://github.com/algerkong/AlgerMusicPlayer/commit/f7951ec))
- 优化网页端下载程序功能 ([56b3ecf](https://github.com/algerkong/AlgerMusicPlayer/commit/56b3ecf))
- 退出登录时刷新页面 ([54f82d3](https://github.com/algerkong/AlgerMusicPlayer/commit/54f82d3))

### 其他优化
 ([ae1a7c9](https://github.com/algerkong/AlgerMusicPlayer/commit/ae1a7c9))
 ([f68f499](https://github.com/algerkong/AlgerMusicPlayer/commit/f68f499))
 ([6d4e6ef](https://github.com/algerkong/AlgerMusicPlayer/commit/6d4e6ef))
 ([2379b2c](https://github.com/algerkong/AlgerMusicPlayer/commit/2379b2c))
 ([33a1057](https://github.com/algerkong/AlgerMusicPlayer/commit/33a1057))
 ([54d66d0](https://github.com/algerkong/AlgerMusicPlayer/commit/54d66d0))
 ([3c792ce](https://github.com/algerkong/AlgerMusicPlayer/commit/3c792ce))
 ([35b84f3](https://github.com/algerkong/AlgerMusicPlayer/commit/35b84f3))
 ([278db37](https://github.com/algerkong/AlgerMusicPlayer/commit/278db37))