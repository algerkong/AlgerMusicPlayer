# 更新日志

## v4.8.1
> 如果更新遇到问题，请前往 <a href="http://donate.alger.fun/download" target="_blank">下载 AlgerMusicPlayer</a>

> 请我喝咖啡(支持作者) ☕️ <a href="http://donate.alger.fun/donate" target="_blank" style="color: red; font-weight: bold;">赏你</a>

> 帮我点个 star <a href="https://github.com/algerkong/AlgerMusicPlayer" target="_blank">github star</a>

> 微信公众号 微信搜索 <span style="font-weight: bold;">AlgerMusic</span>

> QQ频道 AlgerMusic <a href="https://pd.qq.com/s/cs056n33q?b=5" target="_blank">加入频道</a>

### 🐛 Bug 修复
- 修复无法快捷键调整问题

### 🎨 优化
- 优化音乐资源解析
- 去除无用代码，优化加载速度



## v4.8.0

### ✨ 新功能
- 增强移动端播放页面效果，添加播放模式选择，添加横屏模式，添加播放列表功能 ([81b61e4](https://github.com/algerkong/AlgerMusicPlayer/commit/81b61e4))，([0d89e15](https://github.com/algerkong/AlgerMusicPlayer/commit/0d89e15))，([9345805](https://github.com/algerkong/AlgerMusicPlayer/commit/9345805))
- 优化移动端界面动画效果，播放栏，返回效果等一系列功能
- 添加下载管理页面, 引入文件类型检测库以支持多种音频格式,支持自定义文件名格式和下载路径配置 ([3ac3159](https://github.com/algerkong/AlgerMusicPlayer/commit/3ac3159)),([b203077](https://github.com/algerkong/AlgerMusicPlayer/commit/b203077))
- 新增歌单导入功能 ([edd393c](https://github.com/algerkong/AlgerMusicPlayer/commit/edd393c))
- 列表添加多选下载功能，支持批量选择和下载音乐 ([1221101](https://github.com/algerkong/AlgerMusicPlayer/commit/1221101)),([8988cdb](https://github.com/algerkong/AlgerMusicPlayer/commit/8988cdb))，([21b2fc0](https://github.com/algerkong/AlgerMusicPlayer/commit/21b2fc0))
- Windows添加任务栏缩略图播放控制按钮 ([9bec67e](https://github.com/algerkong/AlgerMusicPlayer/commit/9bec67e))，([58ab990](https://github.com/algerkong/AlgerMusicPlayer/commit/58ab990)) 感谢[HE Cai](https://github.com/hecai84)的pr
- 添加主窗口自适应大小功能，页面缩放功能，支持缩放因子的调整和重置 ([6170047](https://github.com/algerkong/AlgerMusicPlayer/commit/6170047)), ([e46df8a](https://github.com/algerkong/AlgerMusicPlayer/commit/e46df8a))
- 添加歌词时间矫正功能，支持增加和减少矫正时间 ([c975344](https://github.com/algerkong/AlgerMusicPlayer/commit/c975344))

### 🐛 Bug 修复
- 修复音频初始化音量问题，完善翻译  ([#320](https://github.com/algerkong/AlgerMusicPlayer/pull/320))   感谢[Qumo](https://github.com/Hellodwadawd12312312)的pr
- 重构每日推荐数据加载逻辑，提取为独立函数并优化用户状态判断 ([5e704a1](https://github.com/algerkong/AlgerMusicPlayer/commit/5e704a1))
- 修复刷新后第一次播放出现的无法播放问题 ([6f1909a](https://github.com/algerkong/AlgerMusicPlayer/commit/6f1909a))
- 修复更多设置弹窗被歌词窗口遮挡问题，并优化为互斥弹窗，优化样式 ([62e5166](https://github.com/algerkong/AlgerMusicPlayer/commit/62e5166))
- 修复设置页面动画速度滑块样式和文本错误 ([e5adb8a](https://github.com/algerkong/AlgerMusicPlayer/commit/e5adb8a))
- 修复音频服务相关问题 ([090103b](https://github.com/algerkong/AlgerMusicPlayer/commit/090103b)),([5ee60d7](https://github.com/algerkong/AlgerMusicPlayer/commit/5ee60d7))
- 修复播放栏无法控制隐藏问题 ([d227ac8](https://github.com/algerkong/AlgerMusicPlayer/commit/d227ac8))


### 🎨 优化
- 优化歌曲列表组件布局([fabcf28](https://github.com/algerkong/AlgerMusicPlayer/commit/fabcf28))
- 重构播放控制逻辑，添加播放进度恢复功能并清理无用代码 ([b9c38d2](https://github.com/algerkong/AlgerMusicPlayer/commit/b9c38d2))
- 优化提示组件，支持位置和图标显示选项 ([155bdf2](https://github.com/algerkong/AlgerMusicPlayer/commit/155bdf2))
- 添加mini播放栏鼠标滚轮调整音量，并优化音量滑块数字不展示问题 ([5c72785](https://github.com/algerkong/AlgerMusicPlayer/commit/5c72785))
- 优化收藏和历史列表组件，添加加载状态管理和动画效果 ([5070a08](https://github.com/algerkong/AlgerMusicPlayer/commit/5070a08))
- 翻译优化
- 代码优化

## 赞赏支持☕️
[赞赏列表](http://donate.alger.fun/)
<table>
  <tr>
    <th style="text-align:center">微信赞赏</th>
    <th style="width:100px"></th>
    <th style="text-align:center">支付宝赞赏</th>
  </tr>
  <tr>
    <td align="center">
      <img src="https://github.com/algerkong/algerkong/blob/main/wechat.jpg?raw=true" alt="WeChat QRcode" width="200"><br>
      <h6>☕️喝点咖啡继续干</h6>
    </td>
    <td></td>
    <td align="center">
      <img src="https://github.com/algerkong/algerkong/blob/main/alipay.jpg?raw=true" alt="Alipay QRcode" width="200"><br>
      <h6>🍔来个汉堡</h6>
    </td>
  </tr>
</table>
