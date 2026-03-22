# 更新日志

## v5.1.0

### ✨ 新功能

- 新增本地音乐扫描播放功能
- 新增播客页面与组件
- 新增专辑页面
- 桌面歌词新增 单行/双行/滚动 三种显示模式，支持翻译开关和双行分组淡出动画
- 重构自动更新系统，使用 electron-updater 替代手动下载
- 设置页新增音频设备配置
- 快捷键整体重构优化
- 重构 SearchBar，集成标题滚动显示功能
- 优化音源解析策略与播放逻辑
- 优化移动端适配与 UI 布局

### 🐛 Bug 修复

- 修复自动播放循环与暂停失效问题
- 修复桌面歌词窗口首次打开无歌词问题
- 修复播放并发控制死代码、shallowRef 响应式丢失、歌词 IPC 高频调用
- 修复 AppMenu 错误主题色
- 修复播放列表抽屉关闭动画使用 setTimeout 不可靠问题
- 修复搜索结果滚动加载触发距离过大
- 修复本地音乐元数据解析并发限流与封面体积限制
- 修复本地音乐扫描增量判断逻辑
- 修复 preload 层 ipc.on 解绑监听器失效
- 修复歌词缓存 IPC 通道未接入初始化
- 修复歌词组件卸载时 groupFadeTimer 未清理导致内存泄漏
- 补全 MV/排行榜/歌单/搜索/专辑页面缺失的国际化
- 修复 NeteaseCloudMusicApi anonymous_token 文件不存在导致启动崩溃
- 修复移动端全屏歌词前奏阶段第一句歌词不可见
- 修复移动端音乐列表页按钮尺寸过大
- 登录页扫码登录改为默认首选
- 设置桌面端最小窗口尺寸为 900×640 防止内容截断
- 移除首页顶部多余 padding
- HomeHero 快捷导航仅移动端显示

### 🔒 安全

- 本地音乐 API 仅监听回环地址，防止外部访问
- LX Music 脚本执行隔离到 Worker 沙箱

### 🎨 优化

- 全面重构 UI：播放器、播放条、通用组件、列表项、布局、标题栏、搜索页等
- 重构首页 UI
- 设置页拆分为 7 个独立 Tab 组件，优化捐赠列表性能
- 重构音乐和歌词缓存逻辑，支持可配置缓存目录
- 统一进度追踪机制，移除重复的 rAF 更新循环
- 优化播放列表持久化，精简序列化字段并添加防抖写入
- 优化骨架屏加载效果，修复用户页左侧黑色背景
- 统一 SongItem 圆角与 hover 背景色
- 重构历史记录模块
- 调整主题主色
- 扩展数据层与播放能力
- 增加 i18n 检查脚本与提交钩子
- 重构 i18n 键值检查并增加引用告警模式

## v5.0.0

### ✨ 新功能

- LX Music 音源脚本导入
- 逐字歌词，支持全屏歌词和桌面歌词同步显示
- 心动模式播放
- 移动设备整体页面风格和效果优化
- 移动端添加平板模式设置
- 歌词页面样式控制优化 支持背景、宽度、字体粗细等个性化设置
- 历史日推查看
- 播放记录热力图
- 历史记录支持本地和云端记录
- 用户页面收藏专辑展示
- 添加 GPU 硬件加速设置
- 菜单展开状态保存 - 感谢 [harenchi](https://github.com/souvenp) 的贡献
- 搜索建议 - 感谢 [harenchi](https://github.com/souvenp) 的贡献
- 歌词繁体中文翻译模块，集成 OpenCC 引擎 - 感谢 [Leko](https://github.com/lekoOwO) 的贡献
- 自定义 API源 支持 [自定义源文档](https://github.com/algerkong/AlgerMusicPlayer/blob/main/docs/custom-api-readme.md) - 感谢 [harenchi](https://github.com/souvenp) 的贡献

### 🐛 Bug 修复

- 修复随机播放顺序异常
- 修复音源解析错误处理
- 修复 Mini 播放栏主题颜色问题
- 修复桌面歌词透明模式标题栏显示
- 修复逐字歌词字间距
- 修复远程控制设置无法保存
- 修复下载无损格式返回 HiRes 音质 - 感谢 [harenchi](https://github.com/souvenp) 的贡献
- 兼容 pnpm 包管理器 - 感谢 [Leko](https://github.com/lekoOwO) 的贡献

### 🎨 优化

- 音源解析缓存
- 完善多语言国际化
- 优化播放检测和错误处理
- FLAC 元数据和封面图片处理 - 感谢 [harenchi](https://github.com/souvenp) 的贡献
- 日推不感兴趣调用官方接口 - 感谢 [harenchi](https://github.com/souvenp) 的贡献
- 代码提交流程优化，添加 lint-staged

## 赞赏支持☕️

[赞赏列表](https://donate.alger.fun/donate)

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
